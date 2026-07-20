'use strict';

const socketIo = require('socket.io');
const { get, all } = require('../db/db');
const { isValidAdminToken } = require('../middleware/auth');
const gameEngine = require('./gameEngine');

// Global timer/tick interval references
let questionTickInterval = null;
let gapTickInterval = null;
let gapTimeout = null;

// Helper to convert candidate to Admin schema (contains token)
function toAdminCandidate(c) {
  return {
    id: c.id,
    name: c.name,
    logoUrl: c.logoUrl,
    score: c.score,
    isActive: Boolean(c.isActive),
    joinToken: c.joinToken
  };
}

// Helper to convert candidate to Public schema (no token)
function toPublicCandidate(c) {
  return {
    id: c.id,
    name: c.name,
    logoUrl: c.logoUrl,
    score: c.score,
    isActive: Boolean(c.isActive)
  };
}

/**
 * Returns the unredacted game state (including correctOptionKey, elapsedMs, and tokens).
 */
function getUnredactedGameState(state, question, round) {
  if (!state) return null;
  const fullQuestion = question ? { ...question } : null;
  if (fullQuestion) {
    fullQuestion.options = JSON.parse(fullQuestion.options || '[]');
  }
  const match = state.matchId ? get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]) : null;
  const matchCandidateIds = match ? JSON.parse(match.candidateIds || '[]') : [];
  return {
    ...state,
    question: fullQuestion,
    roundName: round?.name || null,
    matchCandidateIds
  };
}

/**
 * Returns the redacted, public-safe game state.
 * - Hides correctOptionKey unless revealed.
 * - Hides locks' optionKey and elapsedMs unless revealed.
 * - Includes status in locks (correct/incorrect/no_answer/not_judged) only when revealed.
 * - When candidateId is provided, only that candidate's lock details are included
 *   in the revealed state (prevents leaking other candidates' answers to tablets).
 */
function redactGameState(state, question, round, candidateId) {
  if (!state) return null;

  const redactedQuestion = question ? { ...question } : null;
  if (redactedQuestion) {
    redactedQuestion.options = JSON.parse(redactedQuestion.options || '[]');
    if (!state.resultsRevealed) {
      delete redactedQuestion.correctOptionKey;
    }
  }

  const redactedLocks = {};
  for (const cid in state.locks) {
    const lock = state.locks[cid];
    if (state.resultsRevealed) {
      if (candidateId && cid !== candidateId) {
        // Candidate tablets only see their own revealed lock data;
        // other candidates' answers/times/status must not leak.
        redactedLocks[cid] = { answered: lock.answered };
      } else {
        const status = gameEngine.getResultStatus(
          lock, round?.answerMode, question?.correctOptionKey, state.judgements, cid
        );
        redactedLocks[cid] = {
          optionKey: lock.optionKey,
          elapsedMs: lock.elapsedMs,
          answered: lock.answered,
          status
        };
      }
    } else {
      redactedLocks[cid] = {
        answered: lock.answered
      };
    }
  }

  const match = state.matchId ? get('SELECT candidateIds FROM matches WHERE id = ?', [state.matchId]) : null;
  const matchCandidateIds = match ? JSON.parse(match.candidateIds || '[]') : [];

  return {
    phase: state.phase,
    currentRoundId: state.currentRoundId,
    currentQuestionId: state.currentQuestionId,
    timerStartedAt: state.timerStartedAt,
    timeLimitSeconds: state.timeLimitSeconds,
    gapEnabled: state.gapEnabled,
    gapSeconds: state.gapSeconds,
    locks: redactedLocks,
    judgements: state.phase === 'JUDGING' || state.resultsRevealed ? state.judgements : {},
    winnerCandidateId: state.resultsRevealed ? state.winnerCandidateId : null,
    resultsRevealed: Boolean(state.resultsRevealed),
    question: redactedQuestion,
    answerMode: round?.answerMode || null,
    matchId: state.matchId,
    matchCandidateIds
  };
}

/**
 * Removes display-only video URLs from candidate payloads.
 * Images remain available on candidate tablets so they mirror the main display.
 */
function redactMediaForCandidates(gameState) {
  if (gameState?.question?.mediaType !== 'video') return gameState;

  const candidateQuestion = { ...gameState.question };
  delete candidateQuestion.mediaUrl;

  return {
    ...gameState,
    question: candidateQuestion
  };
}

/**
 * Broadcasts the unredacted state to admin and redacted state to display/candidates.
 * Candidate video media is additionally removed because video is display-only.
 */
function broadcastGameState(io) {
  const state = gameEngine.getGameState();
  if (!state) return;

  const question = get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId]);
  const round = get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId]);

  const unredacted = getUnredactedGameState(state, question, round);

  io.to('admin').emit('game:state', unredacted);
  io.to('display').emit('game:state:public', redactGameState(state, question, round));
  for (const cid in state.locks) {
    const candidateState = redactGameState(state, question, round, cid);
    io.to(`candidate:${cid}`).emit('game:state:public', redactMediaForCandidates(candidateState));
  }
}

/**
 * Broadcasts unredacted and redacted candidates list to their respective rooms.
 */
function broadcastCandidates(io) {
  const allCandidates = all('SELECT * FROM candidates ORDER BY name ASC');
  const activeCandidates = all('SELECT * FROM candidates WHERE isActive = 1 ORDER BY name ASC');
  
  io.to('admin').emit('candidates:updated', allCandidates.map(toAdminCandidate));
  io.to('display').emit('candidates:public-updated', activeCandidates.map(toPublicCandidate));
}

function getScoreboard(matchId) {
  if (!matchId) return [];
  try {
    return all(
      `SELECT ms.candidateId AS id, c.name, c.logoUrl, ms.score, c.isActive
       FROM match_scores ms
       JOIN candidates c ON c.id = ms.candidateId
       WHERE ms.matchId = ? AND c.isActive = 1
       ORDER BY ms.score DESC, c.rowid ASC`,
      [matchId]
    ).map(toPublicCandidate);
  } catch (err) {
    console.error('Error in getScoreboard:', err);
    return [];
  }
}

function broadcastScoreboard(io) {
  try {
    const state = gameEngine.getGameState();
    const scoreboard = getScoreboard(state?.matchId);
    io.to('admin').to('display').emit('scoreboard:update', scoreboard);
  } catch (err) {
    console.error('Error in broadcastScoreboard:', err);
  }
}

/**
 * Broadcasts results:revealed event to all screens with correct rankings and correctness.
 */
function broadcastResultsRevealed(io, state) {
  const round = get('SELECT answerMode FROM rounds WHERE id = ?', [state.currentRoundId]);
  const question = get('SELECT correctOptionKey FROM questions WHERE id = ?', [state.currentQuestionId]);

  const STATUS_ORDER = { correct: 0, incorrect: 1, not_judged: 2, no_answer: 3 };

  const rankings = [];
  for (const cid in state.locks) {
    const lock = state.locks[cid];
    const status = gameEngine.getResultStatus(
      lock, round?.answerMode, question?.correctOptionKey, state.judgements, cid
    );
    rankings.push({
      candidateId: cid,
      elapsedMs: lock.elapsedMs,
      status
    });
  }

  // Deterministic sort: correct first, then incorrect, not_judged, no_answer;
  // within same status, fastest first; ties broken by insertion order (candidate creation order).
  rankings.sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 4;
    const sb = STATUS_ORDER[b.status] ?? 4;
    if (sa !== sb) return sa - sb;
    return (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity);
  });

  const payload = {
    correctOptionKey: (round && round.answerMode === 'MCQ' && question) ? question.correctOptionKey : null,
    rankings,
    winnerCandidateId: state.winnerCandidateId
  };

  io.to('admin').to('display').emit('results:revealed', payload);
  for (const cid in state.locks) {
    io.to(`candidate:${cid}`).emit('results:revealed', payload);
  }
}

// ---------------------------------------------------------------------------
// Socket Layer Countdown Intervals
// ---------------------------------------------------------------------------

function clearQuestionTick() {
  if (questionTickInterval) {
    clearInterval(questionTickInterval);
    questionTickInterval = null;
  }
}

function startQuestionTick(io, timeLimitSeconds) {
  clearQuestionTick();
  let remaining = timeLimitSeconds;

  io.to('admin').emit('timer:tick', { remainingSeconds: remaining });
  io.to('display').emit('timer:tick', { remainingSeconds: remaining });
  const state = gameEngine.getGameState();
  for (const cid in state.locks) {
    io.to(`candidate:${cid}`).emit('timer:tick', { remainingSeconds: remaining });
  }

  questionTickInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearQuestionTick();
    } else {
      io.to('admin').emit('timer:tick', { remainingSeconds: remaining });
      io.to('display').emit('timer:tick', { remainingSeconds: remaining });
      const currentLocks = gameEngine.getGameState().locks;
      for (const cid in currentLocks) {
        io.to(`candidate:${cid}`).emit('timer:tick', { remainingSeconds: remaining });
      }
    }
  }, 1000);
}

function clearGapTimerCountdown() {
  if (gapTickInterval) {
    clearInterval(gapTickInterval);
    gapTickInterval = null;
  }
  if (gapTimeout) {
    clearTimeout(gapTimeout);
    gapTimeout = null;
  }
}

function startGapTimerCountdown(io, gapSeconds) {
  clearGapTimerCountdown();
  let remaining = gapSeconds;

  io.to('admin').emit('gap:tick', { remainingSeconds: remaining });
  io.to('display').emit('gap:tick', { remainingSeconds: remaining });
  const state = gameEngine.getGameState();
  for (const cid in state.locks) {
    io.to(`candidate:${cid}`).emit('gap:tick', { remainingSeconds: remaining });
  }

  gapTickInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearGapTimerCountdown();
    } else {
      io.to('admin').emit('gap:tick', { remainingSeconds: remaining });
      io.to('display').emit('gap:tick', { remainingSeconds: remaining });
      const currentLocks = gameEngine.getGameState().locks;
      for (const cid in currentLocks) {
        io.to(`candidate:${cid}`).emit('gap:tick', { remainingSeconds: remaining });
      }
    }
  }, 1000);

  // Automatically transition to results when gap timer ends
  gapTimeout = setTimeout(() => {
    clearGapTimerCountdown();
    const res = gameEngine.revealResults();
    if (res.success) {
      broadcastGameState(io);
      broadcastResultsRevealed(io, res.state);
      broadcastScoreboard(io);
    }
  }, gapSeconds * 1000);
}

// ---------------------------------------------------------------------------
// Socket.IO Server Setup
// ---------------------------------------------------------------------------

function initSockets(server) {
  const io = new socketIo.Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO Auth Middleware
  io.use((socket, next) => {
    const { role, candidateId, joinToken } = socket.handshake.query || {};
    const auth = socket.handshake.auth || {};
    const adminToken = auth.token || socket.handshake.query.adminToken;

    // 1. Admin Authentication Check
    if (role === 'admin' || adminToken) {
      if (isValidAdminToken(adminToken)) {
        socket.decodedAuth = { role: 'admin' };
        return next();
      }
      return next(new Error('Authentication failed: Invalid admin session token.'));
    }

    // 2. Candidate Authentication Check
    if (candidateId && joinToken) {
      const candidate = get(
        'SELECT id FROM candidates WHERE id = ? AND joinToken = ? AND isActive = 1',
        [candidateId, joinToken]
      );
      if (candidate) {
        socket.decodedAuth = { role: 'candidate', candidateId };
        return next();
      }
      return next(new Error('Authentication failed: Invalid candidate credentials.'));
    }

    // 3. Display connection check (Unauthenticated Display is allowed)
    if (role === 'display') {
      socket.decodedAuth = { role: 'display' };
      return next();
    }

    return next(new Error('Authentication failed: Missing role or credentials.'));
  });

  // Register Timer Callback from gameEngine layer
  gameEngine.registerOnTimeUp((state) => {
    clearQuestionTick();

    // Broadcast time:up event
    const unanswered = [];
    for (const cid in state.locks) {
      if (!state.locks[cid].answered) {
        unanswered.push(cid);
      }
    }

    io.to('admin').to('display').emit('time:up', { noAnswerCandidateIds: unanswered });
    for (const cid in state.locks) {
      io.to(`candidate:${cid}`).emit('time:up', { noAnswerCandidateIds: unanswered });
    }

    broadcastGameState(io);

    if (state.phase === 'JUDGING') {
      const sortedKeys = Object.keys(state.locks)
        .filter(cid => state.locks[cid].answered)
        .sort((a, b) => state.locks[a].elapsedMs - state.locks[b].elapsedMs);
      io.to('admin').emit('judging:started', {
        rankedCandidateIds: sortedKeys,
        rankedCandidates: sortedKeys.map(cid => ({
          candidateId: cid,
          elapsedMs: state.locks[cid].elapsedMs
        }))
      });
    } else if (state.phase === 'GAP') {
      io.to('admin').to('display').emit('gap:started', { gapSeconds: state.gapSeconds });
      for (const cid in state.locks) {
        io.to(`candidate:${cid}`).emit('gap:started', { gapSeconds: state.gapSeconds });
      }
      startGapTimerCountdown(io, state.gapSeconds);
    } else if (state.phase === 'RESULTS') {
      broadcastResultsRevealed(io, state);
      broadcastScoreboard(io);
    }
  });

  io.on('connection', (socket) => {
    const auth = socket.decodedAuth;

    // Join room based on verified credentials
    if (auth.role === 'admin') {
      socket.join('admin');
      
      const state = gameEngine.getGameState();
      const question = state && state.currentQuestionId
        ? get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId])
        : null;
      const round = state && state.currentRoundId
        ? get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId])
        : null;
      socket.emit('game:state', getUnredactedGameState(state, question, round));

      const candidates = all('SELECT * FROM candidates ORDER BY name ASC');
      socket.emit('candidates:updated', candidates.map(toAdminCandidate));

      // Send initial scoreboard so the bottom-bar widget isn't empty
      socket.emit('scoreboard:update', getScoreboard(state?.matchId));
    } 
    else if (auth.role === 'candidate') {
      socket.join(`candidate:${auth.candidateId}`);

      const state = gameEngine.getGameState();
      const question = state && state.currentRoundId
        ? get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId])
        : null;
      const round = state && state.currentRoundId
        ? get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId])
        : null;
      const candidateState = redactGameState(state, question, round, auth.candidateId);
      socket.emit('game:state:public', redactMediaForCandidates(candidateState));

      const candidates = all('SELECT * FROM candidates WHERE isActive = 1 ORDER BY name ASC');
      socket.emit('candidates:public-updated', candidates.map(toPublicCandidate));

      // Send initial scoreboard
      socket.emit('scoreboard:update', getScoreboard(state?.matchId));
    } 
    else if (auth.role === 'display') {
      socket.join('display');

      const state = gameEngine.getGameState();
      const question = state && state.currentQuestionId
        ? get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId])
        : null;
      const round = state && state.currentRoundId
        ? get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId])
        : null;
      socket.emit('game:state:public', redactGameState(state, question, round));

      const candidates = all('SELECT * FROM candidates WHERE isActive = 1 ORDER BY name ASC');
      socket.emit('candidates:public-updated', candidates.map(toPublicCandidate));

      // Send initial scoreboard
      socket.emit('scoreboard:update', getScoreboard(state?.matchId));
    }

    // Role-verification helpers for event execution
    function verifyIsAdmin(ack) {
      if (auth.role !== 'admin') {
        const err = 'Permission denied: Admin role required.';
        if (typeof ack === 'function') ack({ error: err });
        else socket.emit('error', err);
        return false;
      }
      return true;
    }

    function verifyIsCandidate(candidateId, ack) {
      if (auth.role !== 'candidate' || auth.candidateId !== candidateId) {
        const err = 'Permission denied: Candidate mismatch or invalid credentials.';
        if (typeof ack === 'function') ack({ error: err });
        else socket.emit('error', err);
        return false;
      }
      return true;
    }

    // Navigation events change question state immediately. Guard duplicate
    // clicks from the same authenticated admin socket before a client can
    // disable its controls, without blocking a different navigation action.
    const adminNavigationActionAt = new Map();
    const ADMIN_NAVIGATION_DEBOUNCE_MS = 300;

    function isDuplicateAdminNavigation(action, ack) {
      const now = Date.now();
      const previous = adminNavigationActionAt.get(action);
      if (previous !== undefined && now - previous < ADMIN_NAVIGATION_DEBOUNCE_MS) {
        if (typeof ack === 'function') ack({ success: true, ignored: true });
        return true;
      }
      adminNavigationActionAt.set(action, now);
      return false;
    }

    function clearAdminNavigationDebounce(action) {
      adminNavigationActionAt.delete(action);
    }

    /**
     * Turns an engine phase violation into a sender-only Socket.IO rejection.
     */
    function runGameAction(action, ack) {
      try {
        return action();
      } catch (error) {
        if (error instanceof gameEngine.PhaseError) {
          const rejection = {
            code: error.code,
            currentPhase: error.currentPhase,
            allowedPhases: error.allowedPhases,
            message: error.message
          };
          socket.emit('phase:rejected', rejection);
          if (typeof ack === 'function') ack({ error: error.message, ...rejection });
          return null;
        }
        throw error;
      }
    }

    socket.on('admin:requestState', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const state = gameEngine.getGameState();
      const question = state && state.currentQuestionId
        ? get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId])
        : null;
      const round = state && state.currentRoundId
        ? get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId])
        : null;
      socket.emit('game:state', getUnredactedGameState(state, question, round));

      // Also push candidates and scoreboard for a complete state refresh
      const candidates = all('SELECT * FROM candidates ORDER BY name ASC');
      socket.emit('candidates:updated', candidates.map(toAdminCandidate));
      socket.emit('scoreboard:update', getScoreboard(state?.matchId));

      if (typeof ack === 'function') ack({ success: true });
    });

    // Client-to-server handlers

    socket.on('admin:startMatch', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const { matchId } = data || {};

      const res = runGameAction(() => gameEngine.startMatch(matchId), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastCandidates(io);
        broadcastScoreboard(io);
        if (res.state.phase === 'QUESTION_SHOWN') {
          startQuestionTick(io, res.state.timeLimitSeconds);
        }
      }
    });

    socket.on('admin:endMatch', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const { matchId } = data || {};

      const res = runGameAction(() => gameEngine.endMatch(matchId), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true, winnerCandidateId: res.winnerCandidateId, hasTie: res.hasTie });
        broadcastGameState(io);
        broadcastCandidates(io);
        broadcastScoreboard(io);
      }
    });

    socket.on('admin:nextQuestion', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      if (isDuplicateAdminNavigation('nextQuestion', ack)) return;
      
      const res = runGameAction(() => gameEngine.nextQuestion(), ack);
      if (!res) {
        clearAdminNavigationDebounce('nextQuestion');
        return;
      }
      if (res.error) {
        clearAdminNavigationDebounce('nextQuestion');
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastScoreboard(io);
        if (res.state.phase === 'QUESTION_SHOWN') {
          startQuestionTick(io, res.state.timeLimitSeconds);
        }
      }
    });

    socket.on('admin:prevQuestion', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      if (isDuplicateAdminNavigation('prevQuestion', ack)) return;

      const res = runGameAction(() => gameEngine.previousQuestion(), ack);
      if (!res) {
        clearAdminNavigationDebounce('prevQuestion');
        return;
      }
      if (res.error) {
        clearAdminNavigationDebounce('prevQuestion');
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastScoreboard(io);
        if (res.state.phase === 'QUESTION_SHOWN') {
          startQuestionTick(io, res.state.timeLimitSeconds);
        }
      }
    });

    socket.on('admin:endTimerNow', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;

      const res = runGameAction(() => gameEngine.endTimerNow(), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        if (typeof ack === 'function') ack({ success: true });

        const unanswered = [];
        for (const cid in res.state.locks) {
          if (!res.state.locks[cid].answered) {
            unanswered.push(cid);
          }
        }
        io.to('admin').to('display').emit('time:up', { noAnswerCandidateIds: unanswered });
        for (const cid in res.state.locks) {
          io.to(`candidate:${cid}`).emit('time:up', { noAnswerCandidateIds: unanswered });
        }

        broadcastGameState(io);

        if (res.state.phase === 'JUDGING') {
          const sortedKeys = Object.keys(res.state.locks)
            .filter(cid => res.state.locks[cid].answered)
            .sort((a, b) => res.state.locks[a].elapsedMs - res.state.locks[b].elapsedMs);
          io.to('admin').emit('judging:started', {
            rankedCandidateIds: sortedKeys,
            rankedCandidates: sortedKeys.map(cid => ({
              candidateId: cid,
              elapsedMs: res.state.locks[cid].elapsedMs
            }))
          });
        } else if (res.state.phase === 'GAP') {
          io.to('admin').to('display').emit('gap:started', { gapSeconds: res.state.gapSeconds });
          for (const cid in res.state.locks) {
            io.to(`candidate:${cid}`).emit('gap:started', { gapSeconds: res.state.gapSeconds });
          }
          startGapTimerCountdown(io, res.state.gapSeconds);
        } else if (res.state.phase === 'RESULTS') {
          broadcastResultsRevealed(io, res.state);
          broadcastScoreboard(io);
        }
      }
    });

    socket.on('admin:submitJudgement', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const { candidateId, isCorrect } = data || {};
      const res = runGameAction(() => gameEngine.submitJudgement(candidateId, isCorrect), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
      }
    });

    socket.on('admin:advanceFromGap', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      if (isDuplicateAdminNavigation('advanceFromGap', ack)) return;
      const res = runGameAction(() => gameEngine.revealResults(), ack); // Exit gap manually goes directly to results
      if (!res) {
        clearAdminNavigationDebounce('advanceFromGap');
        return;
      }
      if (res.error) {
        clearAdminNavigationDebounce('advanceFromGap');
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastResultsRevealed(io, res.state);
        broadcastScoreboard(io);
      }
    });

    socket.on('admin:adjustScore', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const { candidateId, delta, reason } = data || {};
      const res = runGameAction(() => gameEngine.adjustScoreManually(candidateId, delta, reason), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        if (typeof ack === 'function') ack({ success: true });
        broadcastCandidates(io);
        broadcastScoreboard(io);
      }
    });

    socket.on('admin:endRound', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const res = runGameAction(() => gameEngine.nextRound(), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        if (res.ended) {
          broadcastScoreboard(io);
        } else {
          startQuestionTick(io, res.state.timeLimitSeconds);
        }
      }
    });

    socket.on('admin:endQuiz', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const res = runGameAction(() => gameEngine.endQuiz(), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastScoreboard(io);
      }
    });

    socket.on('admin:resetQuiz', (data, ack) => {
      if (!verifyIsAdmin(ack)) return;
      const res = runGameAction(() => gameEngine.resetQuiz(), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        clearQuestionTick();
        clearGapTimerCountdown();
        if (typeof ack === 'function') ack({ success: true });
        broadcastGameState(io);
        broadcastScoreboard(io);
      }
    });

    socket.on('candidate:lockAnswer', (data, ack) => {
      const { candidateId, optionKey } = data || {};
      if (!verifyIsCandidate(candidateId, ack)) return;
      
      const res = runGameAction(() => gameEngine.lockAnswer(candidateId, optionKey), ack);
      if (!res) return;
      if (res.error) {
        if (typeof ack === 'function') ack({ error: res.error });
        else socket.emit('error', res.error);
      } else {
        if (typeof ack === 'function') ack({ success: true });
        io.to('admin').to('display').emit('candidate:locked', { candidateId });
        broadcastGameState(io);
      }
    });

    socket.on('candidate:requestState', (data, ack) => {
      const { candidateId } = data || {};
      if (!verifyIsCandidate(candidateId, ack)) return;

      const state = gameEngine.getGameState();
      const question = state && state.currentQuestionId
        ? get('SELECT * FROM questions WHERE id = ?', [state.currentQuestionId])
        : null;
      const round = state && state.currentRoundId
        ? get('SELECT * FROM rounds WHERE id = ?', [state.currentRoundId])
        : null;
      const candidateState = redactGameState(state, question, round, candidateId);
      socket.emit('game:state:public', redactMediaForCandidates(candidateState));

      if (typeof ack === 'function') ack({ success: true });
    });

    socket.on('disconnect', () => {
      // Sockets clean up on disconnect silently
    });
  });

  return io;
}

/**
 * Resumes a gap countdown from a fractional remaining duration (in ms).
 * Works like startGapTimerCountdown but starts at an arbitrary remaining value.
 * @param {Object} io - Socket.IO server
 * @param {number} remainingMs - Milliseconds remaining on the gap timer
 */
function resumeGapTimerCountdown(io, remainingMs) {
  clearGapTimerCountdown();
  let remaining = Math.ceil(remainingMs / 1000); // convert to whole seconds

  // Emit initial tick
  io.to('admin').emit('gap:tick', { remainingSeconds: remaining });
  io.to('display').emit('gap:tick', { remainingSeconds: remaining });
  const state = gameEngine.getGameState();
  for (const cid in state.locks) {
    io.to(`candidate:${cid}`).emit('gap:tick', { remainingSeconds: remaining });
  }

  gapTickInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearGapTimerCountdown();
    } else {
      io.to('admin').emit('gap:tick', { remainingSeconds: remaining });
      io.to('display').emit('gap:tick', { remainingSeconds: remaining });
      const currentLocks = gameEngine.getGameState().locks;
      for (const cid in currentLocks) {
        io.to(`candidate:${cid}`).emit('gap:tick', { remainingSeconds: remaining });
      }
    }
  }, 1000);

  // Automatically transition to results when gap timer ends
  gapTimeout = setTimeout(() => {
    clearGapTimerCountdown();
    const res = gameEngine.revealResults();
    if (res.success) {
      broadcastGameState(io);
      broadcastResultsRevealed(io, res.state);
      broadcastScoreboard(io);
    }
  }, remainingMs);
}

/**
 * Called once on server boot (after initSockets) to resume any in-progress
 * QUESTION_SHOWN or GAP timer that was lost during a server crash/restart.
 *
 * If the phase is RESULTS or any non-timed phase, we only broadcast state—
 * no scoring logic is re-run, preventing double-scoring.
 *
 * @param {Object} io - Socket.IO server instance
 */
function resumeGameStateOnBoot(io) {
  const state = gameEngine.getGameState();
  if (!state || state.phase === 'IDLE') return;

  const now = Date.now();

  if (state.phase === 'QUESTION_SHOWN') {
    // Resume or fire the question timer
    const elapsed = now - (state.timerStartedAt || now);
    const limitMs = (state.timeLimitSeconds || 30) * 1000;

    if (elapsed >= limitMs) {
      // Timer expired while server was down — fire handleTimeUp immediately
      const res = gameEngine.handleTimeUp();
      if (res.success && res.state) {
        broadcastGameState(io);
        // Mirror the same post-time-up logic as the onTimeUp callback
        if (res.state.phase === 'JUDGING') {
          const sortedKeys = Object.keys(res.state.locks)
            .filter(cid => res.state.locks[cid].answered)
            .sort((a, b) => res.state.locks[a].elapsedMs - res.state.locks[b].elapsedMs);
          io.to('admin').emit('judging:started', {
            rankedCandidateIds: sortedKeys,
            rankedCandidates: sortedKeys.map(cid => ({
              candidateId: cid,
              elapsedMs: res.state.locks[cid].elapsedMs
            }))
          });
        } else if (res.state.phase === 'GAP') {
          io.to('admin').to('display').emit('gap:started', { gapSeconds: res.state.gapSeconds });
          for (const cid in res.state.locks) {
            io.to(`candidate:${cid}`).emit('gap:started', { gapSeconds: res.state.gapSeconds });
          }
          startGapTimerCountdown(io, res.state.gapSeconds);
        } else if (res.state.phase === 'RESULTS') {
          broadcastResultsRevealed(io, res.state);
          broadcastScoreboard(io);
        }
      }
    } else {
      // Timer still running — resume with the remaining time
      const remainingMs = limitMs - elapsed;
      const remainingSec = Math.ceil(remainingMs / 1000);

      // Schedule the engine-level timeout for the remaining time
      gameEngine.scheduleQuestionTimeout(remainingSec);

      // Start socket-layer tick broadcasts for the remaining time
      startQuestionTick(io, remainingSec);

      broadcastGameState(io);
    }
  } else if (state.phase === 'GAP') {
    // Resume or fire the gap timer
    const elapsed = now - (state.gapStartedAt || now);
    const gapLimitMs = (state.gapSeconds || 10) * 1000;

    if (elapsed >= gapLimitMs) {
      // Gap expired while server was down — reveal results immediately
      const res = gameEngine.revealResults();
      if (res.success) {
        broadcastGameState(io);
        broadcastResultsRevealed(io, res.state);
        broadcastScoreboard(io);
      }
    } else {
      // Gap still running — resume with remaining time
      const remainingMs = gapLimitMs - elapsed;
      resumeGapTimerCountdown(io, remainingMs);
      broadcastGameState(io);
    }
  } else {
    // Any other phase (RESULTS, TIME_UP, JUDGING, QUIZ_ENDED, etc.)
    // Just broadcast current state — no scoring or timer logic.
    broadcastGameState(io);
    if (state.phase === 'RESULTS' && state.resultsRevealed) {
      broadcastResultsRevealed(io, state);
      broadcastScoreboard(io);
    }
  }
}

module.exports = { initSockets, resumeGameStateOnBoot };
