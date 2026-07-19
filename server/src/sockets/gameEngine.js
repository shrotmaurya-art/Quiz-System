const crypto = require('crypto');
const { get, run, all, getGlobalSettings } = require('../db/db');

const ALL_GAME_PHASES = ['IDLE', 'QUESTION_SHOWN', 'TIME_UP', 'JUDGING', 'GAP', 'RESULTS', 'QUIZ_ENDED'];

/**
 * Raised when a state-machine action is requested from an invalid phase.
 */
class PhaseError extends Error {
  constructor(currentPhase, allowedPhases) {
    super(`Action is not allowed during ${currentPhase}. Allowed phases: ${allowedPhases.join(', ')}.`);
    this.name = 'PhaseError';
    this.code = 'INVALID_PHASE';
    this.currentPhase = currentPhase;
    this.allowedPhases = allowedPhases;
  }
}

/**
 * Ensures an action is legal in the current game phase.
 * @param {string} currentPhase
 * @param {string[]} allowedPhases
 * @throws {PhaseError}
 */
function assertPhase(currentPhase, allowedPhases) {
  if (!allowedPhases.includes(currentPhase)) {
    throw new PhaseError(currentPhase, allowedPhases);
  }
}

/**
 * Normalises an SQLite boolean (integer 1/0 or null) to a JavaScript boolean or null.
 * @param {any} val
 * @returns {boolean|null}
 */
function dbBool(val) {
  if (val === null || val === undefined) return null;
  return Boolean(val);
}

/**
 * Retrieves the current game state from the database, parsing JSON fields.
 * @returns {Object|null}
 */
function getGameState() {
  const state = get('SELECT * FROM game_state WHERE id = 1');
  if (!state) return null;
  return {
    ...state,
    locks: JSON.parse(state.locks || '{}'),
    judgements: JSON.parse(state.judgements || '{}'),
    resultsRevealed: Boolean(state.resultsRevealed),
    gapEnabled: state.gapEnabled === null ? null : Boolean(state.gapEnabled)
  };
}

/**
 * Persists the game state back to the database, stringifying JSON fields.
 * @param {Object} state
 */
function saveGameState(state) {
  run(
    `UPDATE game_state SET
      phase = ?,
      currentRoundId = ?,
      currentQuestionId = ?,
      timerStartedAt = ?,
      timeLimitSeconds = ?,
      gapEnabled = ?,
      gapSeconds = ?,
      locks = ?,
      judgements = ?,
      winnerCandidateId = ?,
      resultsRevealed = ?
    WHERE id = 1`,
    [
      state.phase,
      state.currentRoundId,
      state.currentQuestionId,
      state.timerStartedAt,
      state.timeLimitSeconds,
      state.gapEnabled === null ? null : Number(state.gapEnabled),
      state.gapSeconds,
      JSON.stringify(state.locks),
      JSON.stringify(state.judgements),
      state.winnerCandidateId,
      Number(state.resultsRevealed)
    ]
  );
}

/**
 * Resolves the timing values for a given question and round, falling back to global settings.
 * @param {Object} question
 * @param {Object} round
 * @param {Object} globalSettings
 * @returns {{ timeLimitSeconds: number, gapEnabled: boolean, gapSeconds: number }}
 */
function resolveTiming(question, round, globalSettings) {
  const timeLimitSeconds = question.timeLimitOverrideSeconds !== null
    ? question.timeLimitOverrideSeconds
    : (round.timeLimitSeconds !== null ? round.timeLimitSeconds : globalSettings.defaultTimeLimitSeconds);

  const gapEnabledRaw = question.gapEnabledOverride !== null
    ? question.gapEnabledOverride
    : (round.gapEnabled !== null ? round.gapEnabled : globalSettings.defaultGapEnabled);
  const gapEnabled = Boolean(gapEnabledRaw);

  const gapSeconds = question.gapSecondsOverride !== null
    ? question.gapSecondsOverride
    : (round.gapSeconds !== null ? round.gapSeconds : globalSettings.defaultGapSeconds);

  return { timeLimitSeconds, gapEnabled, gapSeconds };
}

// ---------------------------------------------------------------------------
// Real Timer Management for Answering Window
// ---------------------------------------------------------------------------
let activeQuestionTimeout = null;
let onTimeUpCallback = null;

/**
 * Clears the active question timer if it is running.
 */
function clearQuestionTimeout() {
  if (activeQuestionTimeout) {
    clearTimeout(activeQuestionTimeout);
    activeQuestionTimeout = null;
  }
}

/**
 * Schedules the handleTimeUp transition automatically after the configured seconds.
 * @param {number} timeLimitSeconds
 */
function scheduleQuestionTimeout(timeLimitSeconds) {
  clearQuestionTimeout();
  if (typeof timeLimitSeconds === 'number' && timeLimitSeconds > 0) {
    activeQuestionTimeout = setTimeout(() => {
      let res;
      try {
        res = handleTimeUp();
      } catch (error) {
        // A timer can become stale after navigation or test cleanup. Its phase
        // violation is expected and must not crash the server process.
        if (error instanceof PhaseError) return;
        throw error;
      }
      if (res.success && onTimeUpCallback) {
        onTimeUpCallback(res.state);
      }
    }, timeLimitSeconds * 1000);
  }
}

/**
 * Registers a callback to be notified when the auto-timer triggers handleTimeUp.
 * Used by the Socket.IO layer to broadcast state updates.
 * @param {Function} callback
 */
function registerOnTimeUp(callback) {
  onTimeUpCallback = callback;
}

// ---------------------------------------------------------------------------
// Game Engine Exported Functions
// ---------------------------------------------------------------------------

/**
 * Sets the phase to QUESTION_SHOWN on Round 1, Question 1.
 * Valid from IDLE or QUIZ_ENDED.
 * @returns {Object} { success: true, state } or { error }
 */
function startQuiz() {
  const state = getGameState();
  assertPhase(state.phase, ['IDLE', 'QUIZ_ENDED']);

  const activeCandidates = all('SELECT id FROM candidates WHERE isActive = 1');
  if (activeCandidates.length === 0) {
    return { error: 'Cannot start quiz: no active candidates configured.' };
  }

  const round = get('SELECT * FROM rounds ORDER BY "order" ASC LIMIT 1');
  if (!round) {
    return { error: 'Cannot start quiz: no rounds configured.' };
  }

  const question = get('SELECT * FROM questions WHERE roundId = ? ORDER BY "order" ASC LIMIT 1', [round.id]);
  if (!question) {
    return { error: `Cannot start quiz: round "${round.name}" has no questions.` };
  }

  const globalSettings = getGlobalSettings();
  const timing = resolveTiming(question, round, globalSettings);

  const locks = {};
  for (const c of activeCandidates) {
    locks[c.id] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = round.id;
  state.currentQuestionId = question.id;
  state.timerStartedAt = Date.now();
  state.timeLimitSeconds = timing.timeLimitSeconds;
  state.gapEnabled = timing.gapEnabled;
  state.gapSeconds = timing.gapSeconds;
  state.locks = locks;
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;

  saveGameState(state);
  scheduleQuestionTimeout(timing.timeLimitSeconds);
  return { success: true, state };
}

/**
 * Advances currentRoundId/currentQuestionId to the next question.
 * Valid from RESULTS or IDLE.
 * @returns {Object} { success: true, state, ended: boolean } or { error }
 */
function nextQuestion() {
  const state = getGameState();
  assertPhase(state.phase, ['RESULTS', 'IDLE']);

  const currentRound = get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId]);
  const currentQuestion = get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId]);

  if (!currentRound || !currentQuestion) {
    return { error: 'Current round or question not found in database.' };
  }

  // Find next question in the same round
  let nextQ = get(
    'SELECT * FROM questions WHERE roundId = ? AND "order" > ? ORDER BY "order" ASC LIMIT 1',
    [state.currentRoundId, currentQuestion.order]
  );
  let nextR = null;

  if (!nextQ) {
    // Find next round
    nextR = get(
      'SELECT * FROM rounds WHERE "order" > ? ORDER BY "order" ASC LIMIT 1',
      [currentRound.order]
    );
    if (nextR) {
      nextQ = get(
        'SELECT * FROM questions WHERE roundId = ? ORDER BY "order" ASC LIMIT 1',
        [nextR.id]
      );
    }
  }

  if (!nextQ) {
    // No more questions or rounds: transition to QUIZ_ENDED
    state.phase = 'QUIZ_ENDED';
    state.locks = {};
    state.judgements = {};
    state.winnerCandidateId = null;
    state.resultsRevealed = false;
    saveGameState(state);
    clearQuestionTimeout();
    return { success: true, ended: true, state };
  }

  // Next question found: initialise state
  const resolvedRound = nextR || currentRound;
  const globalSettings = getGlobalSettings();
  const timing = resolveTiming(nextQ, resolvedRound, globalSettings);

  const activeCandidates = all('SELECT id FROM candidates WHERE isActive = 1');
  const locks = {};
  for (const c of activeCandidates) {
    locks[c.id] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = resolvedRound.id;
  state.currentQuestionId = nextQ.id;
  state.timerStartedAt = Date.now();
  state.timeLimitSeconds = timing.timeLimitSeconds;
  state.gapEnabled = timing.gapEnabled;
  state.gapSeconds = timing.gapSeconds;
  state.locks = locks;
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;

  saveGameState(state);
  scheduleQuestionTimeout(timing.timeLimitSeconds);
  return { success: true, state };
}

/**
 * Rewinds currentRoundId/currentQuestionId to the previous question.
 * Valid from any phase EXCEPT IDLE.
 * @returns {Object} { success: true, state } or { error }
 */
function previousQuestion() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN', 'TIME_UP', 'JUDGING', 'GAP', 'RESULTS', 'QUIZ_ENDED']);

  const currentRound = get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId]);
  const currentQuestion = get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId]);

  if (!currentRound || !currentQuestion) {
    return { error: 'Current round or question not found in database.' };
  }

  // Find previous question in the same round
  let prevQ = get(
    'SELECT * FROM questions WHERE roundId = ? AND "order" < ? ORDER BY "order" DESC LIMIT 1',
    [state.currentRoundId, currentQuestion.order]
  );
  let prevR = null;

  if (!prevQ) {
    // Find previous round
    prevR = get(
      'SELECT * FROM rounds WHERE "order" < ? ORDER BY "order" DESC LIMIT 1',
      [currentRound.order]
    );
    if (prevR) {
      prevQ = get(
        'SELECT * FROM questions WHERE roundId = ? ORDER BY "order" DESC LIMIT 1',
        [prevR.id]
      );
    }
  }

  if (!prevQ) {
    return { error: 'No previous question found.' };
  }

  // Previous question found: reset state
  const resolvedRound = prevR || currentRound;
  const globalSettings = getGlobalSettings();
  const timing = resolveTiming(prevQ, resolvedRound, globalSettings);

  const activeCandidates = all('SELECT id FROM candidates WHERE isActive = 1');
  const locks = {};
  for (const c of activeCandidates) {
    locks[c.id] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = resolvedRound.id;
  state.currentQuestionId = prevQ.id;
  state.timerStartedAt = Date.now();
  state.timeLimitSeconds = timing.timeLimitSeconds;
  state.gapEnabled = timing.gapEnabled;
  state.gapSeconds = timing.gapSeconds;
  state.locks = locks;
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;

  saveGameState(state);
  scheduleQuestionTimeout(timing.timeLimitSeconds);
  return { success: true, state };
}

/**
 * Locks in an answer for a specific candidate.
 * Valid only during QUESTION_SHOWN.
 * @param {string} candidateId
 * @param {string|null} optionKey
 * @returns {Object} { success: true, state } or { error }
 */
function lockAnswer(candidateId, optionKey) {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN']);

  const lock = state.locks[candidateId];
  if (!lock) {
    return { error: `Candidate "${candidateId}" is not active in this round.` };
  }

  if (lock.answered) {
    return { error: `Candidate "${candidateId}" has already locked in an answer.` };
  }

  const elapsedMs = Date.now() - state.timerStartedAt;
  state.locks[candidateId] = {
    optionKey: optionKey === undefined ? null : optionKey,
    elapsedMs,
    answered: true
  };

  saveGameState(state);
  return { success: true, state };
}

/**
 * Handles timer reaching zero: sets unanswered to false, moves to JUDGING (OPEN) or GAP/RESULTS (MCQ).
 * Valid only during QUESTION_SHOWN.
 * @returns {Object} { success: true, state } or { error }
 */
function handleTimeUp() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN']);
  clearQuestionTimeout();

  // Mark all unanswered candidates as answered: false
  for (const cid in state.locks) {
    if (!state.locks[cid].answered) {
      state.locks[cid] = {
        optionKey: null,
        elapsedMs: null,
        answered: false
      };
    }
  }

  state.phase = 'TIME_UP';

  const round = get('SELECT answerMode FROM rounds WHERE id = ?', [state.currentRoundId]);
  if (!round) {
    return { error: 'Current round not found in database.' };
  }

  if (round.answerMode === 'OPEN') {
    state.phase = 'JUDGING';
    // Initialize empty judgements for all candidates who locked in (answered: true)
    const judgements = {};
    for (const cid in state.locks) {
      if (state.locks[cid].answered) {
        judgements[cid] = null;
      }
    }
    state.judgements = judgements;
    saveGameState(state);
    return { success: true, state };
  } else {
    // MCQ round: auto-resolves correctness. Move to GAP or RESULTS
    saveGameState(state);
    return enterGap();
  }
}

/**
 * Behaves exactly like the timer reaching zero (manual admin override).
 * Valid only during QUESTION_SHOWN.
 * @returns {Object} { success: true, state } or { error }
 */
function endTimerNow() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN']);
  return handleTimeUp();
}

/**
 * Submits a verbal correct/incorrect judgement for a candidate.
 * Valid only during JUDGING on an OPEN round.
 * @param {string} candidateId
 * @param {boolean} isCorrect
 * @returns {Object} { success: true, state } or { error }
 */
function submitJudgement(candidateId, isCorrect) {
  const state = getGameState();
  assertPhase(state.phase, ['JUDGING']);

  const round = get('SELECT answerMode FROM rounds WHERE id = ?', [state.currentRoundId]);
  if (!round || round.answerMode !== 'OPEN') {
    return { error: 'Judgements are only valid for OPEN rounds.' };
  }

  if (state.judgements[candidateId] === undefined) {
    return { error: `Candidate "${candidateId}" did not lock in an answer and cannot be judged.` };
  }

  state.judgements[candidateId] = Boolean(isCorrect);

  saveGameState(state);
  return { success: true, state };
}

/**
 * Standalone helper checking if all answered candidates in an OPEN round have been judged.
 * @returns {boolean}
 */
function allJudged() {
  const state = getGameState();
  const round = get('SELECT answerMode FROM rounds WHERE id = ?', [state.currentRoundId]);
  if (!round || round.answerMode !== 'OPEN') {
    return true;
  }
  for (const cid in state.judgements) {
    if (state.judgements[cid] === null) {
      return false;
    }
  }
  return true;
}

/**
 * Determines the winner according to the timed-ranking rule (lowest elapsedMs among correct candidates).
 * @returns {string|null} Winner candidateId or null
 */
function computeWinner() {
  const state = getGameState();
  const round = get('SELECT answerMode FROM rounds WHERE id = ?', [state.currentRoundId]);
  const question = get('SELECT correctOptionKey FROM questions WHERE id = ?', [state.currentQuestionId]);

  if (!round || !question) return null;

  let winnerId = null;
  let minElapsedMs = Infinity;

  for (const cid in state.locks) {
    const lock = state.locks[cid];
    if (lock && lock.answered) {
      let isCorrect = false;
      if (round.answerMode === 'MCQ') {
        isCorrect = lock.optionKey === question.correctOptionKey;
      } else {
        isCorrect = state.judgements[cid] === true;
      }

      if (isCorrect && lock.elapsedMs !== null && lock.elapsedMs < minElapsedMs) {
        minElapsedMs = lock.elapsedMs;
        winnerId = cid;
      }
    }
  }

  return winnerId;
}

/**
 * Transitions phase to GAP if gapEnabled is true, otherwise skips to RESULTS.
 * Valid from TIME_UP or JUDGING.
 * @returns {Object} { success: true, state } or { error }
 */
function enterGap() {
  const state = getGameState();
  assertPhase(state.phase, ['TIME_UP', 'JUDGING']);

  if (state.gapEnabled) {
    state.phase = 'GAP';
    saveGameState(state);
    return { success: true, state };
  } else {
    // Gap disabled: skip to results
    return revealResults();
  }
}

/**
 * Transitions from GAP to RESULTS.
 * Valid only during GAP.
 * @returns {Object} { success: true, state } or { error }
 */
function exitGap() {
  const state = getGameState();
  assertPhase(state.phase, ['GAP']);

  return revealResults();
}

/**
 * Reveals correct answer, computes winner candidate.
 * Valid from TIME_UP, JUDGING, or GAP.
 * @returns {Object} { success: true, state } or { error }
 */
function revealResults() {
  const state = getGameState();
  assertPhase(state.phase, ['TIME_UP', 'JUDGING', 'GAP']);

  state.phase = 'RESULTS';
  state.resultsRevealed = true;
  saveGameState(state); // Save before computeWinner to get the correct RESULTS state in computeWinner
  
  const winnerCandidateId = computeWinner();
  state.winnerCandidateId = winnerCandidateId;

  if (winnerCandidateId !== null) {
    // Determine the resolved points for this question:
    // question's pointsOverride if set, else the round's pointsPerQuestion
    const question = get('SELECT pointsOverride, roundId FROM questions WHERE id = ?', [state.currentQuestionId]);
    const round = get('SELECT pointsPerQuestion FROM rounds WHERE id = ?', [state.currentRoundId]);
    
    if (question && round) {
      const points = question.pointsOverride !== null 
        ? question.pointsOverride 
        : round.pointsPerQuestion;

      // 1. Update candidate score
      run('UPDATE candidates SET score = score + ? WHERE id = ?', [points, winnerCandidateId]);

      // 2. Insert into score_log
      const logId = crypto.randomUUID();
      run(
        'INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          logId,
          state.currentQuestionId,
          winnerCandidateId,
          points,
          'timed_ranking_win',
          Date.now()
        ]
      );
    }
  }

  saveGameState(state); // Save with the computed winner ID and resultsRevealed set
  return { success: true, state };
}

/**
 * Manually adjusts a candidate's score and logs the change (admin override).
 * Valid at any time regardless of game phase.
 * @param {string} candidateId
 * @param {number} delta
 * @param {string} reason
 * @returns {Object} { success: true } or { error }
 */
function adjustScoreManually(candidateId, delta, reason) {
  const state = getGameState();
  assertPhase(state.phase, ALL_GAME_PHASES);

  const candidate = get('SELECT id, score FROM candidates WHERE id = ?', [candidateId]);
  if (!candidate) {
    return { error: `Candidate "${candidateId}" not found.` };
  }

  let questionId = state.currentQuestionId;
  if (!questionId) {
    const fallbackQ = get('SELECT id FROM questions LIMIT 1');
    if (fallbackQ) {
      questionId = fallbackQ.id;
    } else {
      return { error: 'Cannot manually adjust score: no questions exist in the database to reference for the audit trail.' };
    }
  }

  // 1. Update candidate score
  run('UPDATE candidates SET score = score + ? WHERE id = ?', [delta, candidateId]);

  // 2. Insert into score_log
  const logId = crypto.randomUUID();
  run(
    'INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [
      logId,
      questionId,
      candidateId,
      delta,
      'manual_adjustment',
      Date.now()
    ]
  );

  return { success: true };
}

/**
 * Skips remaining questions in the current round and advances to the first
 * question of the next round. If this is the last round, ends the quiz.
 * Valid from any active phase.
 * @returns {Object} { success: true, state, ended: boolean } or { error }
 */
function nextRound() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN', 'TIME_UP', 'JUDGING', 'GAP', 'RESULTS', 'QUIZ_ENDED']);

  const currentRound = get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId]);
  if (!currentRound) {
    return { error: 'Current round not found in database.' };
  }

  clearQuestionTimeout();

  // Find next round
  const nextR = get(
    'SELECT * FROM rounds WHERE "order" > ? ORDER BY "order" ASC LIMIT 1',
    [currentRound.order]
  );

  if (!nextR) {
    // Last round: end the quiz
    state.phase = 'QUIZ_ENDED';
    state.locks = {};
    state.judgements = {};
    state.winnerCandidateId = null;
    state.resultsRevealed = false;
    saveGameState(state);
    return { success: true, ended: true, state };
  }

  // Find first question of the next round
  const nextQ = get(
    'SELECT * FROM questions WHERE roundId = ? ORDER BY "order" ASC LIMIT 1',
    [nextR.id]
  );

  if (!nextQ) {
    // Next round has no questions: end the quiz
    state.phase = 'QUIZ_ENDED';
    state.locks = {};
    state.judgements = {};
    state.winnerCandidateId = null;
    state.resultsRevealed = false;
    saveGameState(state);
    return { success: true, ended: true, state };
  }

  // Initialise state for the next round's first question
  const globalSettings = getGlobalSettings();
  const timing = resolveTiming(nextQ, nextR, globalSettings);

  const activeCandidates = all('SELECT id FROM candidates WHERE isActive = 1');
  const locks = {};
  for (const c of activeCandidates) {
    locks[c.id] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = nextR.id;
  state.currentQuestionId = nextQ.id;
  state.timerStartedAt = Date.now();
  state.timeLimitSeconds = timing.timeLimitSeconds;
  state.gapEnabled = timing.gapEnabled;
  state.gapSeconds = timing.gapSeconds;
  state.locks = locks;
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;

  saveGameState(state);
  scheduleQuestionTimeout(timing.timeLimitSeconds);
  return { success: true, state };
}

/**
 * Immediately ends the quiz from any active phase.
 * @returns {Object} { success: true, state } or { error }
 */
function endQuiz() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN', 'TIME_UP', 'JUDGING', 'GAP', 'RESULTS', 'QUIZ_ENDED']);

  clearQuestionTimeout();

  state.phase = 'QUIZ_ENDED';
  state.locks = {};
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;
  saveGameState(state);
  return { success: true, state };
}

module.exports = {
  PhaseError,
  assertPhase,
  getGameState,
  startQuiz,
  nextQuestion,
  previousQuestion,
  lockAnswer,
  handleTimeUp,
  endTimerNow,
  submitJudgement,
  allJudged,
  computeWinner,
  enterGap,
  exitGap,
  revealResults,
  registerOnTimeUp,
  adjustScoreManually,
  nextRound,
  endQuiz
};
