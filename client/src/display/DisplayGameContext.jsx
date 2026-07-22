import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createSocket } from '../shared/socket';

const DisplayGameContext = createContext(null);

const initialDisplayState = {
  phase: 'IDLE',
  gameState: null,
  timer: null,
  candidateLocked: null,
  timeUp: null,
  gap: null,
  results: null,
  scoreboard: [],
  candidates: [],
};

export function DisplayGameProvider({ children }) {
  const [displayState, setDisplayState] = useState(initialDisplayState);
  const stateRequestedRef = useRef(false);

  useEffect(() => {
    const socket = createSocket({ query: { role: 'display' } });

    const handlePublicState = (gameState) => {
      setDisplayState((previous) => ({
        ...previous,
        gameState,
        phase: gameState?.phase ?? previous.phase,
      }));
    };
    const handleTimerTick = (timer) => {
      console.log('[DisplayContext] timer:tick received', timer);
      setDisplayState((previous) => ({ ...previous, timer }));
    };
    const handleCandidateLocked = (candidateLocked) => setDisplayState((previous) => ({ ...previous, candidateLocked }));
    const handleTimeUp = (timeUp) => setDisplayState((previous) => ({ ...previous, timeUp }));
    const handleGapStarted = (gap) => setDisplayState((previous) => ({ ...previous, gap }));
    const handleGapTick = (gapTick) => setDisplayState((previous) => ({
      ...previous,
      gap: { ...previous.gap, ...gapTick },
    }));
    const handleResultsRevealed = (results) => setDisplayState((previous) => ({ ...previous, results }));
    const handleScoreboardUpdate = (scoreboard) => setDisplayState((previous) => ({ ...previous, scoreboard }));
    const handlePublicCandidates = (candidates) => setDisplayState((previous) => ({ ...previous, candidates }));

    // H6: On every connect (including reconnects), clear stale transient
    // timer/gap/timeUp/results state and re-request a fresh game state
    // snapshot from the server. The server's connection handler resends
    // game:state:public for every new display connection, so the display
    // will receive the authoritative state shortly after reconnecting.
    function requestState() {
      if (stateRequestedRef.current) return;
      stateRequestedRef.current = true;
      socket.emit('admin:requestState');
    }

    const handleConnect = () => {
      stateRequestedRef.current = false;
      setDisplayState((previous) => ({
        ...previous,
        timer: null,
        timeUp: null,
        gap: null,
        results: null,
        candidateLocked: null,
      }));
      requestState();
    };

    socket.on('connect', handleConnect);
    socket.on('game:state:public', handlePublicState);
    socket.on('timer:tick', handleTimerTick);
    socket.on('candidate:locked', handleCandidateLocked);
    socket.on('time:up', handleTimeUp);
    socket.on('gap:started', handleGapStarted);
    socket.on('gap:tick', handleGapTick);
    socket.on('results:revealed', handleResultsRevealed);
    socket.on('scoreboard:update', handleScoreboardUpdate);
    socket.on('candidates:public-updated', handlePublicCandidates);

    // Mount-time check: if already connected, the connect event fired before
    // this effect registered its listeners, so we missed it.
    if (socket.connected) {
      requestState();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('game:state:public', handlePublicState);
      socket.off('timer:tick', handleTimerTick);
      socket.off('candidate:locked', handleCandidateLocked);
      socket.off('time:up', handleTimeUp);
      socket.off('gap:started', handleGapStarted);
      socket.off('gap:tick', handleGapTick);
      socket.off('results:revealed', handleResultsRevealed);
      socket.off('scoreboard:update', handleScoreboardUpdate);
      socket.off('candidates:public-updated', handlePublicCandidates);
      socket.disconnect();
    };
  }, []);

  return <DisplayGameContext.Provider value={displayState}>{children}</DisplayGameContext.Provider>;
}

export function useDisplayGame() {
  const displayState = useContext(DisplayGameContext);
  if (!displayState) {
    throw new Error('useDisplayGame must be used within DisplayGameProvider.');
  }
  return displayState;
}
