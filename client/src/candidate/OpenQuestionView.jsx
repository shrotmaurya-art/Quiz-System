import { useCandidateGame } from './CandidateGameContext';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OpenQuestionView — OPEN / Rapid Fire answer screen.
 *
 * Architecture (Section 13, line 291-296):
 *   round.answerMode === "OPEN" → single "Lock My Answer" button.
 *   On tap → emits `candidate:lockAnswer` with { candidateId } only
 *   (no optionKey — answer is spoken aloud off-app).
 *   Timer keeps running for all candidates; locking does NOT stop it.
 *
 * Visual references:
 *   Pre-lock:  docs/stitch-ui/candidate_tablet_rapid_fire_active/
 *   Post-lock: docs/stitch-ui/candidate_tablet_rapid_fire_locked/
 *
 * Gap handling (Section 0.1 / Task 5.4):
 *   This locked view stays on-screen through TIME_UP, JUDGING, and GAP
 *   phases — there is no separate tablet Gap mockup for OPEN rounds.
 */
export default function OpenQuestionView() {
  const { gameState, timer, isLockedIn, lockAnswer, phase } = useCandidateGame();

  const question = gameState?.question;
  const questionId = question?.id;

  // Timer values — mirror McqQuestionView logic exactly
  const totalTime = gameState?.timeLimitSeconds || 30;
  // If timer ticking, show ticking value; if phase is TIME_UP, GAP, or JUDGING rest at 0
  const remaining = (phase === 'TIME_UP' || phase === 'GAP' || phase === 'JUDGING')
    ? 0
    : (timer?.remainingSeconds ?? totalTime);
  const progress = totalTime > 0 ? remaining / totalTime : 0;
  const strokeDashoffset = 283 * (1 - progress);

  const handleLockAnswer = () => {
    if (isLockedIn) return;
    // OPEN mode: no optionKey — just lock the timestamp
    lockAnswer();
  };

  return (
      <div className="relative min-h-screen w-full overflow-y-auto flex flex-col font-body-md text-body-md text-on-surface bg-surface-container-lowest touch-manipulation" style={{ touchAction: 'manipulation' }}>
      {/* Custom styles matching Stitch mockups */}
      <style>{`
        .open-radial-bg {
          background: radial-gradient(circle at center, #1a1a3a 0%, #080f14 80%);
        }
        .open-spotlight {
          background: radial-gradient(ellipse at top, rgba(240, 192, 62, 0.15) 0%, transparent 60%);
        }
        .open-beam {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 100%;
          background: conic-gradient(from 180deg at 50% 100%, transparent 45%, rgba(240, 192, 62, 0.05) 50%, transparent 55%);
          pointer-events: none;
        }
        .lock-btn-pulse {
          animation: lock-pulse-ring 2s infinite;
        }
        @keyframes lock-pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0.7); }
          70% { box-shadow: 0 0 0 30px rgba(240, 192, 62, 0); }
          100% { box-shadow: 0 0 0 0 rgba(240, 192, 62, 0); }
        }
        .timer-ring circle {
          transition: stroke-dashoffset 0.5s linear;
        }
        .hex-clip {
          clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .locked-glow {
          animation: open-locked-glow 2s infinite ease-in-out;
        }
        @keyframes open-locked-glow {
          0%, 100% { box-shadow: inset 0 0 20px rgba(240, 192, 62, 0.4), 0 0 30px rgba(240, 192, 62, 0.2); }
          50% { box-shadow: inset 0 0 30px rgba(240, 192, 62, 0.6), 0 0 50px rgba(240, 192, 62, 0.3); }
        }
      `}</style>

      {/* Background Layers */}
      <div className="absolute inset-0 open-radial-bg z-0 pointer-events-none" />
      <div className="absolute inset-0 open-spotlight z-0 pointer-events-none" />
      <div className="absolute inset-0 open-beam z-0 pointer-events-none" />

      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full bg-surface-dim/80 backdrop-blur-xl border-b border-secondary/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)] z-50">
        <div className="flex justify-between items-center px-6 md:px-16 h-20 w-full">
          <button className="text-on-surface-variant hover:bg-secondary/10 hover:text-secondary transition-all p-2 rounded-full active:scale-95 duration-150">
            <span className="material-symbols-outlined block" style={{ fontVariationSettings: "'FILL' 0" }}>menu</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-secondary drop-shadow-[0_0_10px_rgba(240,192,62,0.5)] uppercase tracking-widest text-center flex-1">
            QUIZ SHOW LIVE
          </h1>
          <button className="text-on-surface-variant hover:bg-secondary/10 hover:text-secondary transition-all p-2 rounded-full active:scale-95 duration-150">
            <span className="material-symbols-outlined block" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center pt-28 pb-32 px-4 md:px-16 max-w-5xl mx-auto w-full">
        {/* Question Text Area */}
        <motion.div 
          key={questionId || 'no-question'}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          className="text-center mb-8 relative z-20 max-w-3xl w-full"
        >
          <h2 className={isLockedIn
            ? "font-headline-md text-headline-md md:text-display-lg-mobile text-on-surface leading-tight select-none"
            : "font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-secondary drop-shadow-[0_4px_20px_rgba(240,192,62,0.6)] leading-tight select-none"
          }>
            {question?.text || 'No question text provided'}
          </h2>
          {/* Question media (image) */}
          {question?.mediaUrl && question?.mediaType === 'image' && (
            <img
              src={question.mediaUrl}
              alt="Question media"
              className="mt-6 mx-auto max-h-[30vh] rounded-lg object-contain border border-secondary/25 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            />
          )}
          {/* Video is intentionally display-only to prevent independent playback. */}
          {question?.mediaType === 'video' && (
            <p className="mt-6 font-headline-md text-headline-md text-on-surface-variant">
              Watch the main screen
            </p>
          )}
        </motion.div>

        {/* Timer Ring */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-32 h-32 mb-8 flex items-center justify-center"
        >
          <svg className="w-full h-full transform -rotate-90 timer-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(240,192,62,0.2)" strokeWidth="4" />
            <circle
              className="text-secondary drop-shadow-[0_0_8px_rgba(240,192,62,0.8)]"
              cx="50"
              cy="50"
              fill="none"
              r="45"
              stroke="currentColor"
              strokeDasharray="283"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth="6"
              style={{ filter: 'drop-shadow(0 0 8px rgba(240,192,62,0.8))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display-lg-mobile text-display-lg-mobile text-secondary drop-shadow-[0_0_10px_rgba(240,192,62,0.8)] select-none">
              {remaining}
            </span>
          </div>
        </motion.div>

        {/* Lock Button Area */}
        <AnimatePresence mode="wait">
          {!isLockedIn ? (
            /* Pre-lock: Large glowing "LOCK ANSWER" button */
            <motion.div 
              key="lock-active"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 180 }}
              className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center z-30"
            >
              {/* Glow underlay */}
              <div className="absolute inset-0 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />
              <button
                id="open-lock-answer-btn"
                onClick={handleLockAnswer}
                className="relative w-full h-full bg-gradient-to-br from-secondary to-secondary-container rounded-full flex flex-col items-center justify-center shadow-[inset_0_0_40px_rgba(255,255,255,0.4),0_10px_50px_rgba(240,192,62,0.6)] border-4 border-secondary lock-btn-pulse active:scale-95 transition-transform duration-200"
              >
                <span
                  className="material-symbols-outlined text-[64px] text-on-secondary mb-2 drop-shadow-md"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                <span className="font-label-caps text-label-caps text-on-secondary text-xl font-bold tracking-widest drop-shadow-md">
                  LOCK ANSWER
                </span>
              </button>
            </motion.div>
          ) : (
            /* Post-lock: Disabled hexagonal "LOCKED ✔" badge */
            <motion.div 
              key="locked-badge"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 180 }}
              className="w-full max-w-xl z-30"
            >
              <button
                id="open-locked-badge"
                className="w-full relative hex-clip bg-secondary text-on-secondary-fixed font-headline-md text-headline-md py-6 px-12 transition-all duration-300 scale-95 opacity-100 flex items-center justify-center gap-4 locked-glow cursor-not-allowed"
                disabled
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  lock
                </span>
                LOCKED
                <span className="material-symbols-outlined font-bold text-3xl">check</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar (mobile) — decorative, matches mockup layout */}
      <nav className="bg-surface-dim/90 backdrop-blur-2xl fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-3 border-t border-secondary/20 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:hidden">
        <button className="flex flex-col items-center justify-center text-on-surface-variant/70 px-6 py-1 hover:text-secondary hover:bg-secondary/5 transition-colors duration-200">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0" }}>bolt</span>
          <span className="font-label-caps text-[10px]">LIFELINES</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant/70 px-6 py-1 hover:text-secondary hover:bg-secondary/5 transition-colors duration-200">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0" }}>groups</span>
          <span className="font-label-caps text-[10px]">AUDIENCE</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant/70 px-6 py-1 hover:text-secondary hover:bg-secondary/5 transition-colors duration-200">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0" }}>leaderboard</span>
          <span className="font-label-caps text-[10px]">STATS</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant/70 px-6 py-1 hover:text-secondary hover:bg-secondary/5 transition-colors duration-200">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
          <span className="font-label-caps text-[10px]">LEAVE</span>
        </button>
      </nav>
    </div>
  );
}
