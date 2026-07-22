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
      gapStartedAt = ?,
      timeLimitSeconds = ?,
      gapEnabled = ?,
      gapSeconds = ?,
      locks = ?,
      judgements = ?,
      winnerCandidateId = ?,
      resultsRevealed = ?,
      matchId = ?
    WHERE id = 1`,
    [
      state.phase,
      state.currentRoundId,
      state.currentQuestionId,
      state.timerStartedAt,
      state.gapStartedAt !== undefined ? state.gapStartedAt : null,
      state.timeLimitSeconds,
      state.gapEnabled === null ? null : Number(state.gapEnabled),
      state.gapSeconds,
      JSON.stringify(state.locks),
      JSON.stringify(state.judgements),
      state.winnerCandidateId,
      Number(state.resultsRevealed),
      state.matchId || null
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
 * Sets the phase to QUESTION_SHOWN on the first round and question of the match.
 * Valid from IDLE or QUIZ_ENDED.
 * @param {string} matchId
 * @returns {Object} { success: true, state } or { error }
 */
function startMatch(matchId) {
  const state = getGameState();
  assertPhase(state.phase, ['IDLE', 'QUIZ_ENDED']);

  const match = get('SELECT * FROM matches WHERE id = ?', [matchId]);
  if (!match) {
    return { error: `Match with ID "${matchId}" not found.` };
  }

  const inProgressMatch = get("SELECT id, name FROM matches WHERE status = 'in_progress'");
  if (inProgressMatch && inProgressMatch.id !== matchId) {
    return { error: `Cannot start match: "${inProgressMatch.name}" is currently in progress. End it first.` };
  }

  const candidateIds = JSON.parse(match.candidateIds || '[]');
  if (candidateIds.length === 0) {
    return { error: `Cannot start match "${match.name}": no candidates assigned.` };
  }

  const round = get('SELECT * FROM rounds WHERE matchId = ? ORDER BY "order" ASC LIMIT 1', [matchId]);
  if (!round) {
    return { error: `Cannot start match "${match.name}": no rounds configured for this match.` };
  }

  const question = get('SELECT * FROM questions WHERE roundId = ? ORDER BY "order" ASC LIMIT 1', [round.id]);
  if (!question) {
    return { error: `Cannot start match: round "${round.name}" has no questions.` };
  }

  const globalSettings = getGlobalSettings();
  const timing = resolveTiming(question, round, globalSettings);

  const locks = {};
  for (const cid of candidateIds) {
    locks[cid] = { optionKey: null, elapsedMs: null, answered: false };
  }

  // Update match status to in_progress
  run("UPDATE matches SET status = 'in_progress' WHERE id = ?", [matchId]);

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = round.id;
  state.currentQuestionId = question.id;
  state.timerStartedAt = Date.now();
  state.gapStartedAt = null;
  state.timeLimitSeconds = timing.timeLimitSeconds;
  state.gapEnabled = timing.gapEnabled;
  state.gapSeconds = timing.gapSeconds;
  state.locks = locks;
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;
  state.matchId = matchId;

  saveGameState(state);
  scheduleQuestionTimeout(timing.timeLimitSeconds);
  return { success: true, state };
}

/**
 * Sets status to 'completed', computes winnerCandidateId, and resets game state.
 * @param {string} matchId
 * @returns {Object} { success: true, winnerCandidateId, hasTie, state } or { error }
 */
function endMatch(matchId) {
  const state = getGameState();
  const match = get('SELECT * FROM matches WHERE id = ?', [matchId]);
  if (!match) {
    return { error: `Match with ID "${matchId}" not found.` };
  }

  // H3: Reject if the given matchId doesn't match the currently active match
  if (state.matchId !== matchId) {
    return { error: `Match "${matchId}" is not the currently active match (active: ${state.matchId || 'none'}).` };
  }

  clearQuestionTimeout();

  const scores = all('SELECT candidateId, score FROM match_scores WHERE matchId = ? ORDER BY score DESC, candidateId ASC', [matchId]);
  let winnerCandidateId = null;
  let hasTie = false;

  if (scores.length > 0) {
    const highestScore = scores[0].score;
    const topScorers = scores.filter(s => s.score === highestScore);
    if (topScorers.length > 1) {
      hasTie = true;
    } else {
      winnerCandidateId = topScorers[0].candidateId;
    }
  }

  run("UPDATE matches SET status = 'completed', winnerCandidateId = ? WHERE id = ?", [winnerCandidateId, matchId]);

  state.phase = 'IDLE';
  state.currentRoundId = null;
  state.currentQuestionId = null;
  state.timerStartedAt = null;
  state.timeLimitSeconds = 30;
  state.gapEnabled = 1;
  state.gapSeconds = 10;
  state.locks = {};
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;
  state.matchId = null;

  saveGameState(state);

  return { success: true, winnerCandidateId, hasTie, state };
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
    // Find next round belonging to the active match
    nextR = get(
      'SELECT * FROM rounds WHERE matchId = ? AND "order" > ? ORDER BY "order" ASC LIMIT 1',
      [state.matchId, currentRound.order]
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

  reverseScoringForQuestion(nextQ.id, state.matchId);

  const match = get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]);
  const candidateIds = match ? JSON.parse(match.candidateIds || '[]') : [];
  const locks = {};
  for (const cid of candidateIds) {
    locks[cid] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = resolvedRound.id;
  state.currentQuestionId = nextQ.id;
  state.timerStartedAt = Date.now();
  state.gapStartedAt = null;
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
    // Find previous round belonging to the active match
    prevR = get(
      'SELECT * FROM rounds WHERE matchId = ? AND "order" < ? ORDER BY "order" DESC LIMIT 1',
      [state.matchId, currentRound.order]
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

  reverseScoringForQuestion(prevQ.id, state.matchId);

  const match = get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]);
  const candidateIds = match ? JSON.parse(match.candidateIds || '[]') : [];
  const locks = {};
  for (const cid of candidateIds) {
    locks[cid] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = resolvedRound.id;
  state.currentQuestionId = prevQ.id;
  state.timerStartedAt = Date.now();
  state.gapStartedAt = null;
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
    state.gapStartedAt = Date.now();
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

      // 1. Update candidate match score
      run('UPDATE match_scores SET score = score + ? WHERE matchId = ? AND candidateId = ?', [points, state.matchId, winnerCandidateId]);

      // 2. Insert into score_log
      const logId = crypto.randomUUID();
      run(
        'INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp, matchId) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          logId,
          state.currentQuestionId,
          winnerCandidateId,
          points,
          'timed_ranking_win',
          Date.now(),
          state.matchId
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

  if (!state.matchId) {
    return { error: 'Cannot manually adjust score: no active match.' };
  }

  const match = get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]);
  if (!match) {
    return { error: `Active match not found.` };
  }
  const candidateIds = JSON.parse(match.candidateIds || '[]');
  if (!candidateIds.includes(candidateId)) {
    return { error: `Candidate "${candidateId}" is not assigned to the active match.` };
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

  // 1. Update candidate match score
  run('UPDATE match_scores SET score = score + ? WHERE matchId = ? AND candidateId = ?', [delta, state.matchId, candidateId]);

  // 2. Insert into score_log
  const logId = crypto.randomUUID();
  run(
    'INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp, matchId) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      logId,
      questionId,
      candidateId,
      delta,
      'manual_adjustment',
      Date.now(),
      state.matchId
    ]
  );

  return { success: true };
}

function nextRound() {
  const state = getGameState();
  assertPhase(state.phase, ['QUESTION_SHOWN', 'TIME_UP', 'JUDGING', 'GAP', 'RESULTS', 'QUIZ_ENDED']);

  const currentRound = get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId]);
  if (!currentRound) {
    return { error: 'Current round not found in database.' };
  }

  clearQuestionTimeout();

  // Find next round belonging to the active match
  const nextR = get(
    'SELECT * FROM rounds WHERE matchId = ? AND "order" > ? ORDER BY "order" ASC LIMIT 1',
    [state.matchId, currentRound.order]
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

  const match = get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]);
  const candidateIds = match ? JSON.parse(match.candidateIds || '[]') : [];
  const locks = {};
  for (const cid of candidateIds) {
    locks[cid] = { optionKey: null, elapsedMs: null, answered: false };
  }

  state.phase = 'QUESTION_SHOWN';
  state.currentRoundId = nextR.id;
  state.currentQuestionId = nextQ.id;
  state.timerStartedAt = Date.now();
  state.gapStartedAt = null;
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

function resetQuiz() {
  const state = getGameState();
  assertPhase(state.phase, ['QUIZ_ENDED']);

  clearQuestionTimeout();

  state.phase = 'IDLE';
  state.currentRoundId = null;
  state.currentQuestionId = null;
  state.timerStartedAt = null;
  state.timeLimitSeconds = 30;
  state.gapEnabled = 1;
  state.gapSeconds = 10;
  state.locks = {};
  state.judgements = {};
  state.winnerCandidateId = null;
  state.resultsRevealed = false;
  state.matchId = null;
  saveGameState(state);
  return { success: true, state };
}

/**
 * Checks if a scored question was already scored for the current match,
 * and if so, reverses the points by inserting a 'question_replay_reversal' row
 * and updating the candidate's match_scores.
 * @param {string} questionId 
 * @param {string} matchId 
 */
function reverseScoringForQuestion(questionId, matchId) {
  if (!matchId || !questionId) return;

  const netWins = all(
    `SELECT candidateId, SUM(pointsChange) AS netChange 
     FROM score_log 
     WHERE questionId = ? AND matchId = ? AND reason IN ('timed_ranking_win', 'question_replay_reversal')
     GROUP BY candidateId
     HAVING netChange > 0`,
    [questionId, matchId]
  );

  for (const win of netWins) {
    const { candidateId, netChange } = win;
    const pointsToReverse = -netChange;

    const logId = crypto.randomUUID();
    run(
      `INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp, matchId)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        questionId,
        candidateId,
        pointsToReverse,
        'question_replay_reversal',
        Date.now(),
        matchId
      ]
    );

    run(
      `UPDATE match_scores 
       SET score = score + ? 
       WHERE matchId = ? AND candidateId = ?`,
      [pointsToReverse, matchId, candidateId]
    );
  }
}

/**
 * Computes the result status for a candidate's lock.
 * Status can be 'correct', 'incorrect', 'not_judged', or 'no_answer'.
 * @param {Object} lock
 * @param {string} answerMode
 * @param {string} correctOptionKey
 * @param {Object} judgements
 * @param {string} candidateId
 * @returns {string} status
 */
function getResultStatus(lock, answerMode, correctOptionKey, judgements, candidateId) {
  if (!lock || !lock.answered) {
    return 'no_answer';
  }
  if (answerMode === 'MCQ') {
    return lock.optionKey === correctOptionKey ? 'correct' : 'incorrect';
  } else {
    // OPEN round
    const judgement = judgements ? judgements[candidateId] : null;
    if (judgement === true) return 'correct';
    if (judgement === false) return 'incorrect';
    return 'not_judged';
  }
}

module.exports = {
  PhaseError,
  assertPhase,
  getGameState,
  startMatch,
  endMatch,
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
  endQuiz,
  resetQuiz,
  reverseScoringForQuestion,
  scheduleQuestionTimeout,
  getResultStatus
};
