import { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    const socket = createSocket({ query: { role: 'display' } });

    const handlePublicState = (gameState) => {
      setDisplayState((previous) => ({
        ...previous,
        gameState,
        phase: gameState?.phase ?? previous.phase,
      }));
    };
    const handleTimerTick = (timer) => setDisplayState((previous) => ({ ...previous, timer }));
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

    socket.on('game:state:public', handlePublicState);
    socket.on('timer:tick', handleTimerTick);
    socket.on('candidate:locked', handleCandidateLocked);
    socket.on('time:up', handleTimeUp);
    socket.on('gap:started', handleGapStarted);
    socket.on('gap:tick', handleGapTick);
    socket.on('results:revealed', handleResultsRevealed);
    socket.on('scoreboard:update', handleScoreboardUpdate);
    socket.on('candidates:public-updated', handlePublicCandidates);

    return () => {
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
