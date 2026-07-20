import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from './AdminAuth';
import { apiFetch } from '../shared/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveControl() {
  const { socket } = useAdminAuth();

  // Core data states
  const [gameState, setGameState] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [rounds, setRounds] = useState([]);
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState([]);
  const [scoreboard, setScoreboard] = useState([]);

  // Live countdown states
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [gapRemaining, setGapRemaining] = useState(null);

  // Results & Judging payload state
  const [resultsRevealedData, setResultsRevealedData] = useState(null);
  const [judgingOrder, setJudgingOrder] = useState([]);

  // UI overlays & modals
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [adjustScoreModal, setAdjustScoreModal] = useState(null); // { candidateId, candidateName, currentScore }
  const [scoreDelta, setScoreDelta] = useState('10');
  const [scoreReason, setScoreReason] = useState('');

  // Load initial static lists
  const fetchRounds = useCallback(async () => {
    const res = await apiFetch('/api/rounds');
    if (res.ok) setRounds(await res.json());
  }, []);

  const fetchCandidates = useCallback(async () => {
    const res = await apiFetch('/api/candidates');
    if (res.ok) {
      const data = await res.json();
      setCandidates(data);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    const res = await apiFetch('/api/matches');
    if (res.ok) setMatches(await res.json());
  }, []);

  const fetchMatchScoreboard = useCallback(async (matchId) => {
    if (!matchId) {
      setScoreboard([]);
      return;
    }
    const res = await apiFetch(`/api/matches/${matchId}/scoreboard`);
    if (res.ok) setScoreboard(await res.json());
  }, []);

  useEffect(() => {
    fetchRounds();
    fetchCandidates();
    fetchMatches();
  }, [fetchRounds, fetchCandidates, fetchMatches]);

  useEffect(() => {
    fetchMatchScoreboard(gameState?.matchId);
  }, [gameState?.matchId, fetchMatchScoreboard]);

  // Fetch questions of the current round when currentRoundId changes
  useEffect(() => {
    if (gameState?.currentRoundId) {
      apiFetch(`/api/rounds/${gameState.currentRoundId}/questions`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setCurrentRoundQuestions(data))
        .catch(() => {});
    } else {
      setCurrentRoundQuestions([]);
    }
  }, [gameState?.currentRoundId]);

  // Setup Socket.IO subscriptions
  useEffect(() => {
    if (!socket) return;

    // 1. Initial State Request
    socket.emit('admin:requestState');

    // 2. Event Handlers
    function onGameState(state) {
      setGameState(state);
      if (state && !state.resultsRevealed) {
        setResultsRevealedData(null);
      }
    }

    function onCandidatesUpdated(list) {
      setCandidates(list);
    }

    function onScoreboardUpdate(list) {
      setScoreboard(list);
    }

    function onTimerTick({ remainingSeconds }) {
      setTimeRemaining(remainingSeconds);
    }

    function onTimeUp() {
      setTimeRemaining(0);
    }

    function onJudgingStarted({ rankedCandidates, rankedCandidateIds }) {
      setJudgingOrder(rankedCandidates || (rankedCandidateIds || []).map((candidateId) => ({ candidateId, elapsedMs: null })));
    }

    function onGapStarted({ gapSeconds }) {
      setGapRemaining(gapSeconds);
    }

    function onGapTick({ remainingSeconds }) {
      setGapRemaining(remainingSeconds);
    }

    function onResultsRevealed(payload) {
      setResultsRevealedData(payload);
    }

    // Register all event listeners
    socket.on('game:state', onGameState);
    socket.on('candidates:updated', onCandidatesUpdated);
    socket.on('scoreboard:update', onScoreboardUpdate);
    socket.on('timer:tick', onTimerTick);
    socket.on('time:up', onTimeUp);
    socket.on('judging:started', onJudgingStarted);
    socket.on('gap:started', onGapStarted);
    socket.on('gap:tick', onGapTick);
    socket.on('results:revealed', onResultsRevealed);

    // Request fresh state from server — the server's initial game:state emission
    // on connection may have fired before these listeners were registered.
    socket.emit('admin:requestState');

    return () => {
      socket.off('game:state', onGameState);
      socket.off('candidates:updated', onCandidatesUpdated);
      socket.off('scoreboard:update', onScoreboardUpdate);
      socket.off('timer:tick', onTimerTick);
      socket.off('time:up', onTimeUp);
      socket.off('judging:started', onJudgingStarted);
      socket.off('gap:started', onGapStarted);
      socket.off('gap:tick', onGapTick);
      socket.off('results:revealed', onResultsRevealed);
    };
  }, [socket]);

  // Derived properties
  const currentRound = rounds.find((r) => r.id === gameState?.currentRoundId);
  const currentQuestion = gameState?.question;
  const currentQIndex = currentRoundQuestions.findIndex((q) => q.id === gameState?.currentQuestionId);

  // Live count locks (X/N locked in)
  const activeMatch = matches.find((match) => match.status === 'in_progress')
    || matches.find((match) => match.id === gameState?.matchId);
  const activeCandidateIds = activeMatch?.candidateIds || [];
  const matchCandidates = activeMatch
    ? candidates.filter((candidate) => activeCandidateIds.includes(candidate.id))
    : [];
  const totalActiveCount = matchCandidates.length;
  const locksCount = gameState?.locks
    ? Object.values(gameState.locks).filter((l) => l.answered).length
    : 0;

  // Actions with confirmations
  const handleStartMatch = () => {
    if (!selectedMatchId) return;
    socket.emit('admin:startMatch', { matchId: selectedMatchId }, (ack) => {
      if (ack?.error) {
        alert(ack.error);
      } else {
        fetchMatches();
      }
    });
  };

  const handleEndMatch = () => {
    if (!activeMatch) return;
    setConfirmModal({
      title: 'End Match?',
      message: `End "${activeMatch.name}" and record its final standings?`,
      onConfirm: () => {
        socket.emit('admin:endMatch', { matchId: activeMatch.id }, (ack) => {
          if (ack?.error) {
            alert(ack.error);
          } else {
            fetchMatches();
          }
        });
        setConfirmModal(null);
      },
    });
  };

  const triggerNextQuestion = () => {
    socket.emit('admin:nextQuestion', {}, (ack) => {
      if (ack?.error) alert(ack.error);
    });
  };

  const triggerPrevQuestion = () => {
    socket.emit('admin:prevQuestion', {}, (ack) => {
      if (ack?.error) alert(ack.error);
    });
  };

  const handleNext = () => {
    // Show confirmation if a question is active/shown to prevent accidental skips
    if (gameState?.phase === 'QUESTION_SHOWN') {
      setConfirmModal({
        title: 'Skip Current Question?',
        message: 'A question timer is currently running. Skipping now will disrupt active responses. Proceed anyway?',
        onConfirm: () => {
          triggerNextQuestion();
          setConfirmModal(null);
        },
      });
    } else {
      triggerNextQuestion();
    }
  };

  const handlePrev = () => {
    if (gameState?.phase === 'QUESTION_SHOWN') {
      setConfirmModal({
        title: 'Go to Previous Question?',
        message: 'A question timer is currently active. Going back will cancel the current question. Proceed?',
        onConfirm: () => {
          triggerPrevQuestion();
          setConfirmModal(null);
        },
      });
    } else {
      triggerPrevQuestion();
    }
  };

  const handleEndTimerNow = () => {
    setConfirmModal({
      title: 'End Question Clock?',
      message: 'Are you sure you want to end the timer immediately? Candidates who have not locked in will be marked as no-answer.',
      onConfirm: () => {
        socket.emit('admin:endTimerNow', {}, (ack) => {
          if (ack?.error) alert(ack.error);
        });
        setConfirmModal(null);
      },
    });
  };

  const handleEndRound = () => {
    const nextRoundName = (() => {
      if (!currentRound) return 'next round';
      const idx = rounds.findIndex((r) => r.id === currentRound.id);
      return idx < rounds.length - 1 ? rounds[idx + 1].name : null;
    })();
    setConfirmModal({
      title: 'Skip to Next Round?',
      message: nextRoundName
        ? `All remaining questions in "${currentRound?.name}" will be skipped. The quiz will jump to "${nextRoundName}".`
        : `This is the last round. Skipping will end the quiz immediately.`,
      onConfirm: () => {
        socket.emit('admin:endRound', {}, (ack) => {
          if (ack?.error) alert(ack.error);
        });
        setConfirmModal(null);
      },
    });
  };

  const handleEndQuiz = () => {
    setConfirmModal({
      title: 'End Quiz Immediately?',
      message: 'All remaining questions will be skipped and the quiz will end. The final leaderboard will be shown.',
      onConfirm: () => {
        socket.emit('admin:endQuiz', {}, (ack) => {
          if (ack?.error) alert(ack.error);
        });
        setConfirmModal(null);
      },
    });
  };

  const handleAdvanceFromGap = () => {
    socket.emit('admin:advanceFromGap', {}, (ack) => {
      if (ack?.error) alert(ack.error);
    });
  };

  const handleSubmitJudgement = (candidateId, isCorrect) => {
    socket.emit('admin:submitJudgement', { candidateId, isCorrect }, (ack) => {
      if (ack?.error) alert(ack.error);
    });
  };

  const handleAdjustScoreSubmit = () => {
    const deltaVal = parseInt(scoreDelta, 10);
    if (isNaN(deltaVal)) {
      alert('Please enter a valid numeric points value.');
      return;
    }
    if (deltaVal === 0) {
      alert('Delta cannot be zero — use a positive or negative value to change the score.');
      return;
    }
    socket.emit(
      'admin:adjustScore',
      {
        candidateId: adjustScoreModal.candidateId,
        delta: deltaVal,
        reason: scoreReason || 'Manual score adjustment',
      },
      (ack) => {
        if (ack?.error) {
          alert(ack.error);
        } else {
          setAdjustScoreModal(null);
        }
      }
    );
  };

  // Helper to resolve candidate names for lists
  const getCandidateName = (id) => {
    const cand = candidates.find((c) => c.id === id);
    return cand ? cand.name : id;
  };

  const getCandidateLogo = (id) => {
    const cand = candidates.find((c) => c.id === id);
    return cand ? cand.logoUrl : null;
  };

  const availableMatches = matches.filter((match) => match.status === 'not_started' || match.status === 'in_progress');
  const selectedMatch = matches.find((match) => match.id === selectedMatchId);

  // Helper to format countdown duration in SVG dash offset
  const maxTime = gameState?.timeLimitSeconds || 20;
  const pctRemaining = timeRemaining !== null ? timeRemaining / maxTime : 1;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pctRemaining);

  return (
    <div className="flex flex-col gap-stack-lg min-h-[calc(100vh-12rem)] pb-36 relative">
      
      {/* ── HEADER STATUS BANNER ── */}
      <header className="flex justify-between items-end pb-6 border-b border-secondary/20">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="font-display-lg text-headline-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
              LIVE CONTROL
            </h2>
            {gameState && gameState.phase !== 'IDLE' && (
              <p className="font-label-caps text-xs text-on-surface-variant tracking-wider mt-1 uppercase">
                {currentRound?.name || 'Round Info'} · Question {currentQIndex !== -1 ? currentQIndex + 1 : 1} of {currentRoundQuestions.length}
              </p>
            )}
          </div>
        </div>

        {activeMatch && (
          <div className="flex items-center gap-3">
            <div className="hidden xl:block text-right">
              <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">Active Match</p>
              <p className="text-sm text-on-surface font-semibold">{activeMatch.name}</p>
            </div>
            <button
              onClick={handleEndMatch}
              className="px-4 py-2 rounded border border-error/60 text-error hover:bg-error/10 font-label-caps text-xs tracking-wider"
            >
              END MATCH
            </button>
          </div>
        )}

        {/* Phase Badges */}
        <div className="flex items-center gap-3 bg-surface-container-high/80 backdrop-blur-md px-6 py-3 rounded-full border border-secondary/30 shadow-[inset_0_0_10px_rgba(240,192,62,0.1)]">
          <div className={`w-3 h-3 rounded-full ${gameState?.phase === 'QUESTION_SHOWN' ? 'bg-error animate-pulse' : 'bg-outline-variant'}`}></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant font-bold tracking-widest uppercase">
            {gameState ? gameState.phase.replace('_', ' ') : 'CONNECTING...'}
          </span>
        </div>
      </header>

      {/* ── CONNECTING / IDLE SCREEN ── */}
      {(!gameState || gameState.phase === 'IDLE') && (
        <div className="glass-panel rounded-xl p-16 text-center max-w-2xl mx-auto mt-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none"></div>
          <span className="material-symbols-outlined text-[72px] text-secondary mb-6 block animate-pulse">sensors</span>
          {activeMatch ? (
            <>
              <h3 className="font-display-lg text-headline-md text-on-surface mb-4">{activeMatch.name} Is Active</h3>
              <p className="text-on-surface-variant font-body-lg mb-8 max-w-md mx-auto">
                This match is still in progress. End it to record its final result before starting another match.
              </p>
              <button
                onClick={handleEndMatch}
                className="px-12 py-4 bg-error text-on-error font-label-caps text-label-caps font-black tracking-widest hover:bg-error/90 active:scale-95 transition-all rounded"
              >
                END MATCH
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display-lg text-headline-md text-on-surface mb-4">Choose a Match</h3>
              <p className="text-on-surface-variant font-body-lg mb-6 max-w-md mx-auto">
                Select the competitors and question set to run. Only one match can be active at a time.
              </p>
              {availableMatches.length > 0 ? (
                <div className="max-w-md mx-auto text-left flex flex-col gap-5">
                  <label className="flex flex-col gap-2 text-sm text-on-surface-variant">
                    Match
                    <select
                      value={selectedMatchId}
                      onChange={(event) => setSelectedMatchId(event.target.value)}
                      className="bg-surface-container border border-outline/30 rounded px-4 py-3 text-on-surface focus:outline-none focus:border-secondary"
                    >
                      <option value="">Select a match</option>
                      {availableMatches.map((match) => (
                        <option key={match.id} value={match.id}>{match.name} ({match.status.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </label>
                  {selectedMatch && (
                    <p className="text-sm text-on-surface-variant">
                      Candidates: {selectedMatch.candidateIds.map(getCandidateName).join(', ')}
                    </p>
                  )}
                  <button
                    onClick={handleStartMatch}
                    disabled={!selectedMatchId}
                    className="btn-gold-pulse hex-clip px-12 py-4 bg-secondary text-on-secondary font-label-caps text-label-caps font-black tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    START SELECTED MATCH
                  </button>
                </div>
              ) : (
                <p className="text-on-surface-variant font-body-lg">
                  No unstarted matches are available.{' '}
                  <NavLink to="/admin/matches" className="text-secondary underline hover:text-secondary/80 transition-colors">
                    Create one in the Matches tab
                  </NavLink>.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ACTIVE GAME ENGINE FLOW ── */}
      {gameState && gameState.phase !== 'IDLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter overflow-hidden mt-2">
          
          {/* LEFT: Preview Panel (2 columns width) */}
          <div className="lg:col-span-2 flex flex-col bg-surface-container-low/50 backdrop-blur-md rounded-xl border border-outline/20 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="bg-surface-container-highest/80 px-6 py-4 border-b border-outline/20 flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">visibility</span> Presenter View
              </span>
            </div>

            <div className="flex-1 p-8 flex flex-col justify-center items-center relative min-h-[350px]">
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none"></div>
              
              {/* Conditional Rendering by Phase */}
              <AnimatePresence mode="wait">
                
                {/* A. QUESTION SHOWN & TIME UP & JUDGING */}
                {(gameState.phase === 'QUESTION_SHOWN' || gameState.phase === 'TIME_UP' || gameState.phase === 'JUDGING') && (
                  <motion.div 
                    key={gameState.phase}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2 }}
                    className="w-full flex flex-col items-center"
                  >
                  <div className="w-full bg-surface/80 backdrop-blur-xl border-y-[3px] border-secondary p-10 text-center shadow-[0_0_50px_rgba(240,192,62,0.15)] relative mb-8">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-secondary shadow-[0_0_20px_#f0c03e]"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-secondary shadow-[0_0_20px_#f0c03e]"></div>
                    <span className="font-label-caps text-[11px] text-secondary tracking-widest uppercase mb-2 block">
                      {currentRound?.answerMode === 'MCQ' ? 'MULTIPLE CHOICE QUESTION' : 'OPEN-ENDED RESPONSE'}
                    </span>
                    <h2 className="font-headline-md text-headline-md leading-tight font-bold text-on-surface relative z-10">
                      {currentQuestion?.text || 'No question text provided'}
                    </h2>
                  </div>

                  {/* MCQ Options Display */}
                  {currentRound?.answerMode === 'MCQ' && currentQuestion?.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 w-full max-w-2xl mt-4">
                      {currentQuestion.options.map((opt) => {
                        const isCorrect = opt.key === currentQuestion.correctOptionKey;
                        return (
                          <div
                            key={opt.key}
                            className={`hex-clip relative flex items-center h-14 border transition-all overflow-hidden ${
                              isCorrect
                                ? 'bg-secondary/20 border-secondary glow-border-active'
                                : 'bg-surface-variant/40 border-outline/30'
                            }`}
                          >
                            <div className={`w-14 h-full flex items-center justify-center font-display-lg text-headline-md border-r relative z-10 ${
                              isCorrect ? 'text-secondary border-secondary/30' : 'text-outline border-outline/30'
                            }`}>
                              {opt.key}
                            </div>
                            <div className="flex-1 px-4 font-body-lg text-body-md text-on-surface relative z-10 truncate">
                              {opt.text}
                            </div>
                            {isCorrect && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary z-10 flex items-center">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* OPEN-ENDED Target Display */}
                  {currentRound?.answerMode === 'OPEN' && currentQuestion?.correctOptionKey && (
                    <div className="bg-surface/50 border border-outline/20 rounded-lg p-4 w-full max-w-xl text-center">
                      <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-widest mb-1">Target Answer Keyphrase</p>
                      <p className="font-body-lg text-headline-sm text-secondary font-bold">{currentQuestion.correctOptionKey}</p>
                    </div>
                  )}

                  {/* OPEN JUDGING QUEUE */}
                  {gameState.phase === 'JUDGING' && currentRound?.answerMode === 'OPEN' && (
                    <div className="w-full mt-6 max-w-2xl">
                      <div className="border-t border-outline/20 pt-6">
                        <h4 className="font-label-caps text-xs text-secondary tracking-widest uppercase mb-4 text-center">
                          Grading Queue (Fastest First)
                        </h4>
                        
                        <div className="flex flex-col gap-3">
                          {judgingOrder.map(({ candidateId, elapsedMs }, idx) => {
                            const cid = candidateId;
                            const lock = gameState.locks?.[cid];
                            const currentJudgement = gameState.judgements?.[cid];
                            return (
                              <div
                                key={cid}
                                className={`flex items-center justify-between p-3 rounded-lg border bg-surface-container-low/50 ${
                                  currentJudgement === true
                                    ? 'border-emerald-500/50 bg-emerald-500/5'
                                    : currentJudgement === false
                                    ? 'border-error-container/50 bg-error-container/5'
                                    : 'border-outline/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <p className="font-body-lg text-sm text-on-surface font-semibold">
                                      {getCandidateName(cid)}
                                    </p>
                                    <p className="text-xs text-on-surface-variant">
                                      Response in {typeof elapsedMs === 'number' ? (elapsedMs / 1000).toFixed(2) : lock?.elapsedMs ? (lock.elapsedMs / 1000).toFixed(2) : '0.00'}s
                                    </p>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSubmitJudgement(cid, true)}
                                    className={`correct-btn px-3 py-1.5 rounded flex items-center gap-1 font-label-caps text-[11px] tracking-wider transition-all ${
                                      currentJudgement === true
                                        ? 'bg-emerald-500 text-on-primary font-bold border border-emerald-500'
                                        : 'bg-surface-container-highest border border-outline-variant'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-lg group-hover:text-emerald-400 transition-colors">check_circle</span>
                                    <span className="group-hover:text-emerald-400 transition-colors">CORRECT</span>
                                  </button>
                                  <button
                                    onClick={() => handleSubmitJudgement(cid, false)}
                                    className={`incorrect-btn px-3 py-1.5 rounded flex items-center gap-1 font-label-caps text-[11px] tracking-wider transition-all ${
                                      currentJudgement === false
                                        ? 'bg-error-container text-on-error-container font-bold border border-error-container'
                                        : 'bg-surface-container-highest border border-outline-variant'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-lg group-hover:text-rose-500 transition-colors">cancel</span>
                                    <span className="group-hover:text-rose-500 transition-colors">INCORRECT</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {judgingOrder.length === 0 && (
                            <p className="text-center text-on-surface-variant text-sm py-4">
                              No candidates locked in responses.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* B. GAP INTERLUDE VIEW */}
              {gameState.phase === 'GAP' && (
                <motion.div 
                  key="gap"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-6 flex flex-col items-center"
                >
                  <span className="material-symbols-outlined text-[64px] text-tertiary mb-4 animate-spin">history_toggle_off</span>
                  <h3 className="font-display-lg text-headline-sm text-on-surface mb-2">Suspense Gap Interlude</h3>
                  <p className="text-on-surface-variant font-body-md mb-6 max-w-sm">
                    Allowing viewers to guess correct answer before the leaderboard updates.
                  </p>
                  {gapRemaining !== null && (
                    <div className="font-display-lg text-[48px] text-secondary font-black mb-6">
                      {gapRemaining}s
                    </div>
                  )}
                  <button
                    onClick={handleAdvanceFromGap}
                    className="hex-clip px-8 py-3 bg-secondary text-on-secondary font-label-caps text-xs font-bold tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    SKIP INTERLUDE
                  </button>
                </motion.div>
              )}

              {/* C. QUIZ ENDED VIEW */}
              {gameState.phase === 'QUIZ_ENDED' && (
                <motion.div 
                  key="quiz_ended"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-6 flex flex-col items-center"
                >
                  <span className="material-symbols-outlined text-[72px] text-secondary mb-4">emoji_events</span>
                  <h3 className="font-display-lg text-headline-md text-on-surface mb-2">Quiz Complete</h3>
                  <p className="text-on-surface-variant font-body-md mb-8 max-w-md">
                    All questions have been played. The final leaderboard is shown below.
                  </p>
                  <div className="w-full max-w-md">
                    <div className="border-t border-outline/20 pt-6">
                      <h4 className="font-label-caps text-xs text-secondary tracking-widest uppercase mb-4 text-center">
                        Final Standings
                      </h4>
                      <div className="flex flex-col gap-2">
                        {scoreboard.map((team, idx) => {
                          const hasWinner = scoreboard.length > 0 && scoreboard[0].score > 0;
                          const isWinner = hasWinner && idx === 0;
                          return (
                            <div
                              key={team.id}
                              className={`flex items-center justify-between p-4 rounded-lg border backdrop-blur-md ${
                                isWinner
                                  ? 'bg-secondary/15 border-secondary inner-glow-gold'
                                  : 'bg-surface-container-low/80 border-outline-variant/40'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className={`font-display-lg text-lg font-bold ${isWinner ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                  {idx + 1}
                                </span>
                                {team.logoUrl && (
                                  <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-full object-cover border border-outline/25" />
                                )}
                                <p className={`font-body-lg text-sm font-bold ${isWinner ? 'text-secondary' : 'text-on-surface'}`}>
                                  {team.name}
                                </p>
                              </div>
                              <span className={`font-headline-md text-headline-sm font-bold ${isWinner ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                {team.score}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={() => {
                        socket.emit('admin:requestState');
                      }}
                      className="hex-clip px-8 py-3 bg-tertiary-container/30 border border-on-tertiary-container/20 hover:border-on-tertiary-container/50 hover:bg-tertiary-container/50 transition-all text-tertiary font-label-caps text-xs tracking-widest"
                    >
                      REFRESH STATE
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: 'Restart Quiz?',
                          message: 'This will reset question progress and return to idle state. Candidate scores will NOT be reset. You can then start the quiz fresh.',
                          onConfirm: () => {
                            socket.emit('admin:resetQuiz', {}, (ack) => {
                              if (ack?.error) alert(ack.error);
                            });
                            setConfirmModal(null);
                          },
                        });
                      }}
                      className="btn-gold-pulse hex-clip px-8 py-3 bg-secondary text-on-secondary font-label-caps text-xs font-bold tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      RESTART QUIZ
                    </button>
                  </div>
                </motion.div>
              )}

              {/* D. RESULTS VIEW */}
              {gameState.phase === 'RESULTS' && (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-xl"
                >
                  <div className="text-center mb-6">
                    <span className="font-label-caps text-[11px] text-secondary tracking-widest uppercase">QUESTION RESULTS</span>
                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Leaderboard Updates</h3>
                  </div>

                  {resultsRevealedData && (
                    <div className="flex flex-col gap-3">
                      {resultsRevealedData.rankings
                        .slice()
                        .sort((a, b) => {
                          if (a.status === 'correct' && b.status !== 'correct') return -1;
                          if (a.status !== 'correct' && b.status === 'correct') return 1;
                          return (a.elapsedMs || Infinity) - (b.elapsedMs || Infinity);
                        })
                        .map((r, idx) => {
                          const isWinner = r.candidateId === resultsRevealedData.winnerCandidateId;
                          const pointsAwarded = isWinner 
                            ? (currentQuestion?.pointsOverride || currentRound?.pointsPerQuestion || 10) 
                            : 0;

                          return (
                            <div
                              key={r.candidateId}
                              className={`flex items-center justify-between p-4 rounded-lg border backdrop-blur-md transition-colors ${
                                isWinner
                                  ? 'bg-secondary/15 border-secondary inner-glow-gold'
                                  : 'bg-surface-container-low/80 border-outline-variant/40'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className={`font-display-lg text-lg font-bold ${isWinner ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                  {idx + 1}
                                </span>
                                {getCandidateLogo(r.candidateId) && (
                                  <img
                                    src={getCandidateLogo(r.candidateId)}
                                    alt={getCandidateName(r.candidateId)}
                                    className="w-10 h-10 rounded-full object-cover border border-outline/25"
                                  />
                                )}
                                <div>
                                  <p className={`font-body-lg text-sm font-bold ${isWinner ? 'text-secondary' : 'text-on-surface'}`}>
                                    {getCandidateName(r.candidateId)}
                                  </p>
                                  <p className="text-xs text-on-surface-variant">
                                    {r.status === 'correct' 
                                      ? `Correct in ${r.elapsedMs ? (r.elapsedMs / 1000).toFixed(2) : '0.00'}s` 
                                      : r.status === 'incorrect' 
                                      ? 'Incorrect answer' 
                                      : 'No answer'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                {pointsAwarded > 0 ? (
                                  <span className="font-label-caps text-xs text-emerald-400 font-bold">
                                    +{pointsAwarded} PTS
                                  </span>
                                ) : (
                                  <span className="font-label-caps text-xs text-outline-variant">
                                    0 PTS
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Primary Next Action */}
                  <div className="mt-8 flex justify-center w-full">
                    <button
                      onClick={handleNext}
                      className="btn-gold-pulse hex-clip bg-secondary text-on-secondary px-10 py-4 font-label-caps text-xs font-bold tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      ADVANCE TO NEXT QUESTION
                      <span className="material-symbols-outlined text-sm">skip_next</span>
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: Real-time Feedback & Clock */}
          <div className="flex flex-col gap-gutter">
            
            {/* Clock Widget */}
            <div className="bg-surface-container-low/50 backdrop-blur-md rounded-xl border border-outline/20 p-6 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/5 via-background/0 to-background/0"></div>
              <h3 className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest mb-4 z-10">Clock</h3>
              
              {/* Circular Clock progress via SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center z-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    className="stroke-surface-container-highest"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  {timeRemaining !== null && (
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      className="stroke-secondary transition-all duration-1000 ease-linear"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  )}
                </svg>
                {/* Center Value */}
                <div className="absolute text-center">
                  <div className="font-display-lg text-[40px] font-black text-secondary leading-none drop-shadow-[0_0_10px_rgba(240,192,62,0.5)]">
                    {timeRemaining !== null ? timeRemaining : maxTime}
                  </div>
                  <div className="font-label-caps text-[9px] text-on-surface-variant uppercase tracking-widest mt-1">
                    Seconds
                  </div>
                </div>
              </div>
            </div>

            {/* Response lock checklist */}
            <div className="flex-1 bg-surface-container-low/50 backdrop-blur-md rounded-xl border border-outline/20 p-5 flex flex-col shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Responses</h3>
                <span className="font-label-caps text-xs text-secondary font-bold">
                  {locksCount} / {totalActiveCount} Locked
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                {matchCandidates.map((cand) => {
                  const lock = gameState?.locks?.[cand.id];
                  const hasLocked = lock?.answered === true;

                  return (
                    <div
                      key={cand.id}
                      className={`flex flex-col items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                        hasLocked
                          ? 'border-secondary bg-secondary/5 font-bold shadow-[0_0_10px_rgba(240,192,62,0.05)]'
                          : 'border-outline-variant/30 opacity-60'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full border border-outline/20 p-0.5 relative">
                        {cand.logoUrl ? (
                          <img
                            src={cand.logoUrl}
                            alt={cand.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-md">person</span>
                          </div>
                        )}
                        
                        {/* Lock overlay icon badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          hasLocked 
                            ? 'bg-secondary text-on-secondary shadow-[0_0_5px_rgba(240,192,62,0.4)]' 
                            : 'bg-surface-container-highest text-outline border border-outline-variant/40'
                        }`}>
                          <span className="material-symbols-outlined text-[12px] font-bold">
                            {hasLocked ? 'check' : 'hourglass_empty'}
                          </span>
                        </div>
                      </div>
                      <span className="font-label-caps text-[10px] text-on-surface truncate w-full text-center">
                        {cand.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROL BAR ── */}
      {gameState && gameState.phase !== 'IDLE' && (
        <div className="fixed bottom-0 left-64 right-0 bg-surface-container-low/90 backdrop-blur-xl border-t border-secondary/20 p-4 flex gap-6 items-end z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          
          {/* Previous / Next Navigation */}
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              className="hex-clip px-6 py-3.5 bg-tertiary-container/30 border border-on-tertiary-container/20 hover:border-on-tertiary-container/50 hover:bg-tertiary-container/50 transition-all text-tertiary font-label-caps text-xs tracking-widest flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">skip_previous</span>
              PREV
            </button>
            <button
              onClick={handleNext}
              className="hex-clip px-6 py-3.5 bg-tertiary-container border border-on-tertiary-container hover:border-on-tertiary-container hover:bg-tertiary-container/80 transition-all text-tertiary font-label-caps text-xs tracking-widest font-black flex items-center gap-1"
            >
              NEXT
              <span className="material-symbols-outlined text-sm">skip_next</span>
            </button>
          </div>

          {/* Center: Timer + Round/Quiz controls */}
          <div className="flex-1 flex justify-center items-center gap-3">
            {gameState.phase === 'QUESTION_SHOWN' && (
              <button
                onClick={handleEndTimerNow}
                className="px-5 py-2.5 rounded-full bg-surface-variant/30 border border-outline/20 hover:bg-error-container/30 hover:border-error/50 hover:text-error text-on-surface-variant transition-colors font-label-caps text-[11px] tracking-widest flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                End Timer Now
              </button>
            )}
            {gameState.phase !== 'QUIZ_ENDED' && (
              <>
                <button
                  onClick={handleEndRound}
                  className="px-5 py-2.5 rounded-full bg-surface-variant/30 border border-outline/20 hover:bg-tertiary-container/30 hover:border-tertiary/50 hover:text-tertiary text-on-surface-variant transition-colors font-label-caps text-[11px] tracking-widest flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">fast_forward</span>
                  End Round
                </button>
                <button
                  onClick={handleEndQuiz}
                  className="px-5 py-2.5 rounded-full bg-surface-variant/30 border border-outline/20 hover:bg-error-container/30 hover:border-error/50 hover:text-error text-on-surface-variant transition-colors font-label-caps text-[11px] tracking-widest flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">stop</span>
                  End Quiz
                </button>
              </>
            )}
          </div>

          {/* Mini Real-time Scoreboard & Score Modifiers */}
          <div className="flex gap-3 max-w-2xl overflow-x-auto pb-1">
            {scoreboard.map((team) => (
              <div
                key={team.id}
                className="bg-surface/50 border border-outline/10 rounded px-3 py-1.5 flex items-center gap-3 min-w-[140px]"
              >
                <span className="font-label-caps text-[10px] text-on-surface-variant truncate w-20 uppercase">
                  {team.name}
                </span>
                <span className="font-headline-md text-headline-sm text-secondary font-bold flex-1 text-center">
                  {team.score}
                </span>
                <button
                  onClick={() => {
                    setScoreDelta(String(currentRound?.pointsPerQuestion || 10));
                    setScoreReason('');
                    setAdjustScoreModal({ candidateId: team.id, candidateName: team.name, currentScore: team.score });
                  }}
                  className="w-7 h-7 rounded flex items-center justify-center bg-surface-container-high hover:bg-secondary/20 hover:text-secondary text-outline transition-colors border border-outline/20"
                  title="Manual score adjustment"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL OVERLAY ── */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-background/85 backdrop-blur-md" onClick={() => setConfirmModal(null)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="glass-panel max-w-md w-full rounded-xl p-8 z-10 border border-error/40 relative shadow-[0_0_50px_rgba(147,0,10,0.25)]"
            >
              <h3 className="font-headline-md text-headline-sm text-secondary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-error">warning</span>
                {confirmModal.title}
              </h3>
              <p className="text-on-surface-variant font-body-md mb-8 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-6 py-2.5 rounded bg-surface-container-highest text-on-surface font-label-caps text-xs tracking-wider border border-outline/20 hover:bg-surface-container-highest/80 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-6 py-2.5 rounded bg-error text-on-error font-label-caps text-xs tracking-wider hover:bg-error/90 transition-colors"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCORE ADJUSTMENT MODAL OVERLAY ── */}
      <AnimatePresence>
        {adjustScoreModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-background/85 backdrop-blur-md" onClick={() => setAdjustScoreModal(null)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="glass-panel max-w-md w-full rounded-xl p-8 z-10 border border-secondary/40 relative shadow-[0_0_50px_rgba(240,192,62,0.15)]"
            >
              <h3 className="font-headline-md text-headline-sm text-secondary mb-3">
                Manual Score Correction
              </h3>
              <p className="text-on-surface-variant font-body-md mb-2">
                Adjust score for <strong className="text-on-surface">{adjustScoreModal.candidateName}</strong>.
              </p>
              <p className="text-on-surface-variant font-body-md mb-6 text-sm">
                Current score: <strong className="text-secondary">{adjustScoreModal.currentScore ?? '?'}</strong>
                {scoreDelta && !isNaN(parseInt(scoreDelta, 10)) && parseInt(scoreDelta, 10) !== 0 && (
                  <span> → New score: <strong className="text-secondary">{(adjustScoreModal.currentScore ?? 0) + parseInt(scoreDelta, 10)}</strong></span>
                )}
              </p>

              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-2">
                    Points Change (Delta)
                  </label>
                  <input
                    type="number"
                    value={scoreDelta}
                    onChange={(e) => setScoreDelta(e.target.value)}
                    className="w-full bg-surface-container border border-outline/30 rounded px-4 py-2 text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="Positive to add, negative to deduct"
                  />
                  <div className="flex gap-2 mt-2">
                    {[-10, -5, -1, 1, 5, 10, currentRound?.pointsPerQuestion || 10].filter((v, i, a) => a.indexOf(v) === i).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setScoreDelta(String(preset))}
                        className={`px-2 py-1 rounded text-[10px] font-label-caps tracking-wider border transition-colors ${
                          parseInt(scoreDelta, 10) === preset
                            ? 'bg-secondary/20 border-secondary text-secondary'
                            : 'bg-surface-container-high border-outline/20 text-on-surface-variant hover:border-secondary/50'
                        }`}
                      >
                        {preset > 0 ? '+' : ''}{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-label-caps text-on-surface-variant uppercase tracking-wider mb-2">
                    Reason for Adjustment
                  </label>
                  <input
                    type="text"
                    value={scoreReason}
                    onChange={(e) => setScoreReason(e.target.value)}
                    className="w-full bg-surface-container border border-outline/30 rounded px-4 py-2 text-on-surface focus:outline-none focus:border-secondary"
                    placeholder="e.g. Buzzer error correction"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setAdjustScoreModal(null)}
                  className="px-6 py-2.5 rounded bg-surface-container-highest text-on-surface font-label-caps text-xs tracking-wider border border-outline/20 hover:bg-surface-container-highest/80 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAdjustScoreSubmit}
                  className="px-6 py-2.5 rounded bg-secondary text-on-secondary font-label-caps text-xs tracking-wider hover:brightness-110 transition-all"
                >
                  APPLY CORRECTION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
