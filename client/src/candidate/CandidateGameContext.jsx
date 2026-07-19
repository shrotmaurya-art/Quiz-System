import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

/**
 * CandidateGameContext — socket wiring for the candidate tablet.
 *
 * SECURITY CONTRACT (Section 12 / AGENTS.md §4):
 *   This file subscribes ONLY to:
 *     - game:state:public   (redacted, public-safe game state)
 *     - timer:tick           (question countdown)
 *     - time:up              (timer expired)
 *     - gap:started          (suspense gap begins)
 *     - gap:tick             (gap countdown)
 *     - results:revealed     (answer + rankings after reveal)
 *
 *   It NEVER subscribes to:
 *     - game:state           (admin-only, unredacted — contains correctOptionKey / elapsedMs)
 *     - candidates:updated   (admin-only, contains joinToken)
 *
 * RECONNECT SAFETY (NFR5 / Section 15):
 *   Socket.IO fires 'connect' again after every network blip. On the server side,
 *   the connection handler (sockets/index.js L382-399) re-sends game:state:public
 *   for every new candidate connection — including reconnects. Our 'connect' listener
 *   resets timer/gap transient state so a tablet that drops Wi-Fi mid-question and
 *   reconnects 5 seconds later correctly shows:
 *     • the current question
 *     • whether THIS candidate already locked in (from the server's locks map)
 *     • the correct remaining time (from the next timer:tick the server sends)
 *
 *   We do NOT trust any locally cached state across reconnects — the server's
 *   game:state:public snapshot IS the truth.
 */

const CandidateGameContext = createContext(null);

const initialState = {
  /** @type {'IDLE'|'QUESTION_SHOWN'|'TIME_UP'|'JUDGING'|'GAP'|'RESULTS'|'QUIZ_ENDED'} */
  phase: 'IDLE',
  /** Full redacted game state from server (game:state:public payload) */
  gameState: null,
  /** { remainingSeconds } from timer:tick */
  timer: null,
  /** { noAnswerCandidateIds } from time:up */
  timeUp: null,
  /** { gapSeconds } from gap:started, merged with gap:tick */
  gap: null,
  /** { correctOptionKey, rankings, winnerCandidateId } from results:revealed */
  results: null,
};

export function CandidateGameProvider({ socket, candidateId, children }) {
  const [state, setState] = useState(initialState);

  // Keep candidateId accessible to handlers without re-registering listeners
  const candidateIdRef = useRef(candidateId);
  candidateIdRef.current = candidateId;

  useEffect(() => {
    if (!socket) return;

    // ----- game:state:public --------------------------------------------------
    // Arrives on EVERY connect (including reconnects) from the server's
    // connection handler, plus on any admin action that changes the game state.
    // This is the single source of truth — replaces ALL local state.
    const handlePublicState = (gameState) => {
      setState((prev) => ({
        ...prev,
        gameState,
        phase: gameState?.phase ?? prev.phase,
        // If phase moved to RESULTS and resultsRevealed is true in the snapshot,
        // we'll get a separate results:revealed event with the full rankings.
        // If phase is IDLE or QUIZ_ENDED, clear transient data.
        ...(gameState?.phase === 'IDLE' || gameState?.phase === 'QUIZ_ENDED'
          ? { timer: null, timeUp: null, gap: null, results: null }
          : {}),
      }));
    };

    // ----- timer:tick ---------------------------------------------------------
    const handleTimerTick = (timer) => {
      setState((prev) => ({ ...prev, timer }));
    };

    // ----- time:up ------------------------------------------------------------
    const handleTimeUp = (timeUp) => {
      setState((prev) => ({ ...prev, timeUp, timer: null }));
    };

    // ----- gap:started --------------------------------------------------------
    const handleGapStarted = (gap) => {
      setState((prev) => ({ ...prev, gap }));
    };

    // ----- gap:tick -----------------------------------------------------------
    const handleGapTick = (gapTick) => {
      setState((prev) => ({
        ...prev,
        gap: { ...prev.gap, ...gapTick },
      }));
    };

    // ----- results:revealed ---------------------------------------------------
    const handleResultsRevealed = (results) => {
      setState((prev) => ({ ...prev, results, gap: null }));
    };

    // ----- connect (including reconnects) ------------------------------------
    // Socket.IO fires 'connect' on the initial connection AND on every
    // reconnect after a network blip. We clear any stale transient values
    // and immediately request a fresh state snapshot from the server rather
    // than trusting any locally cached state.
    const handleConnect = () => {
      setState((prev) => ({
        ...prev,
        timer: null,
        timeUp: null,
        gap: null,
      }));
      socket.emit('candidate:requestState', { candidateId: candidateIdRef.current });
    };

    // Register listeners
    socket.on('connect', handleConnect);
    socket.on('game:state:public', handlePublicState);
    socket.on('timer:tick', handleTimerTick);
    socket.on('time:up', handleTimeUp);
    socket.on('gap:started', handleGapStarted);
    socket.on('gap:tick', handleGapTick);
    socket.on('results:revealed', handleResultsRevealed);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('game:state:public', handlePublicState);
      socket.off('timer:tick', handleTimerTick);
      socket.off('time:up', handleTimeUp);
      socket.off('gap:started', handleGapStarted);
      socket.off('gap:tick', handleGapTick);
      socket.off('results:revealed', handleResultsRevealed);
    };
  }, [socket]);

  // Convenience: derive whether THIS candidate is locked in from the server state
  const myLock = state.gameState?.locks?.[candidateId] ?? null;
  const isLockedIn = myLock?.answered === true;

  // Send lock-answer intent to the server
  const lockAnswer = useCallback(
    (optionKey) => {
      if (!socket) return;
      socket.emit('candidate:lockAnswer', {
        candidateId: candidateIdRef.current,
        ...(optionKey !== undefined ? { optionKey } : {}),
      });
    },
    [socket],
  );

  const value = {
    ...state,
    candidateId,
    myLock,
    isLockedIn,
    lockAnswer,
    socket,
  };

  return (
    <CandidateGameContext.Provider value={value}>
      {children}
    </CandidateGameContext.Provider>
  );
}

/**
 * Hook for child components to access candidate game state.
 * Must be used within a <CandidateGameProvider>.
 */
export function useCandidateGame() {
  const ctx = useContext(CandidateGameContext);
  if (!ctx) {
    throw new Error('useCandidateGame must be used within CandidateGameProvider.');
  }
  return ctx;
}
