import { useEffect, useState } from 'react';
import { useCandidateGame } from './CandidateGameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../shared/BrandingContext';
import { playSoundEffect } from '../shared/soundEffects';

const optionListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const optionItemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 18 } }
};

export default function McqQuestionView() {
  const { gameState, timer, isLockedIn, myLock, lockAnswer, phase } = useCandidateGame();
  const { soundEffectsEnabled } = useBranding();
  const [localSelection, setLocalSelection] = useState(null);

  const question = gameState?.question;
  const questionId = question?.id;

  // Reset local selection when a new question starts
  useEffect(() => {
    setLocalSelection(null);
  }, [questionId]);

  // Derive locked state and locked option
  const activeSelection = isLockedIn ? myLock?.optionKey : localSelection;
  const isPendingOrLocked = isLockedIn || localSelection !== null;

  // Timer values
  const totalTime = gameState?.timeLimitSeconds || 30;
  // If timer ticking, show ticking value; if phase is TIME_UP or GAP, rest at 0
  const remaining = (phase === 'TIME_UP' || phase === 'GAP') 
    ? 0 
    : (timer?.remainingSeconds ?? totalTime);
  const progress = totalTime > 0 ? remaining / totalTime : 0;
  const strokeDashoffset = 283 * (1 - progress);

  const handleSelectOption = (key) => {
    if (isPendingOrLocked) return;
    setLocalSelection(key);
    // This runs on the tablet's tap, before its Socket.IO message leaves.
    playSoundEffect('lockIn', soundEffectsEnabled);
    // Send event with callback to handle error gracefully
    lockAnswer(key);
  };

  const options = question?.options || [];

  return (
      <div className="relative min-h-screen w-full overflow-y-auto flex flex-col font-body-md text-body-md text-on-surface bg-surface-container-lowest touch-manipulation" style={{ touchAction: 'manipulation' }}>
      {/* Custom styles for micro-animations and layouts from Stitch mockups */}
      <style>{`
        .hex-clip {
          clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
        }
        .bg-cinematic-radial {
          background: radial-gradient(circle at 50% 30%, rgba(10, 0, 73, 0.8) 0%, rgba(8, 15, 20, 1) 70%);
        }
        .spotlight {
          background: radial-gradient(circle at 50% -20%, rgba(240, 192, 62, 0.2) 0%, transparent 60%);
        }
        .option-glow {
          box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.3);
        }
        .option-hover-bloom:hover:not(:disabled) {
          box-shadow: 0 0 25px rgba(240, 192, 62, 0.25), inset 0 0 15px rgba(240, 192, 62, 0.5);
        }
        .locked-glow {
          animation: mcq-locked-glow 2s infinite ease-in-out;
        }
        @keyframes mcq-locked-glow {
          0%, 100% { box-shadow: inset 0 0 15px rgba(240, 192, 62, 0.8), 0 0 20px rgba(240, 192, 62, 0.4); }
          50% { box-shadow: inset 0 0 25px rgba(240, 192, 62, 1), 0 0 40px rgba(240, 192, 62, 0.6); }
        }
        .sparkle-bg {
          background-image: 
            radial-gradient(circle at 20% 40%, rgba(240, 192, 62, 0.4) 1px, transparent 1px),
            radial-gradient(circle at 80% 30%, rgba(240, 192, 62, 0.6) 2px, transparent 2px),
            radial-gradient(circle at 40% 70%, rgba(240, 192, 62, 0.3) 1px, transparent 1px),
            radial-gradient(circle at 70% 80%, rgba(240, 192, 62, 0.5) 1.5px, transparent 1.5px);
          background-size: 100px 100px;
          animation: twinkle 4s infinite alternate;
        }
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 0.7; }
        }
        .timer-ring circle {
          transition: stroke-dashoffset 0.5s linear;
        }
      `}</style>

      {/* Background Layers */}
      <div className="absolute inset-0 bg-cinematic-radial z-0 pointer-events-none" />
      <div className="absolute inset-0 spotlight z-0 pointer-events-none" />
      <div className="absolute inset-0 sparkle-bg z-0 opacity-40 pointer-events-none" />

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
        {/* Timer & Meta Header */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="flex flex-col items-center mb-6 relative"
        >
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 timer-ring" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(240,192,62,0.1)" strokeWidth="6" />
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
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display-lg-mobile text-display-lg-mobile text-secondary drop-shadow-[0_0_10px_rgba(240,192,62,0.8)] select-none">
                {remaining}
              </span>
            </div>
          </div>
          {question?.order != null && (
            <div className="mt-3 flex items-center gap-2 bg-surface-container/50 px-4 py-1 rounded-full border border-secondary/20">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Q. {question.order}</span>
            </div>
          )}
        </motion.div>

        {/* Question Card */}
        <motion.div 
          key={questionId || 'no-question'}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          className="w-full max-w-3xl mb-6 relative"
        >
          <div className="absolute inset-0 bg-secondary/5 blur-xl rounded-xl pointer-events-none" />
          <div className="bg-surface-dim/90 backdrop-blur-2xl border-t-4 border-b-4 border-secondary rounded-xl p-8 text-center shadow-[inset_0_0_30px_rgba(240,192,62,0.1),0_10px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-secondary to-transparent" />
            <h2 className={isPendingOrLocked
              ? "font-headline-md text-headline-md md:font-display-lg md:text-display-lg text-on-surface leading-tight select-none"
              : "font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-secondary text-center leading-tight drop-shadow-[0_0_15px_rgba(240,192,62,0.4)] select-none"
            }>
              {question?.text || 'No question text provided'}
            </h2>
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
          </div>
        </motion.div>

        {/* Options Stack (Transition Layout on Lock) */}
        <AnimatePresence mode="wait">
          {!isPendingOrLocked ? (
            /* Active pre-lock state: 2x2 grid */
            <motion.div 
              key="active-grid"
              variants={optionListVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl"
            >
              {options.map((opt) => (
                <motion.button
                  variants={optionItemVariants}
                  key={opt.key}
                  onClick={() => handleSelectOption(opt.key)}
                  className="group relative w-full min-h-[76px] py-6 px-8 hex-clip bg-tertiary-container/80 backdrop-blur-md border border-white/20 transition-all duration-300 hover:border-secondary hover:bg-tertiary-container option-hover-bloom active:scale-[0.98]"
                >
                  <div className="flex items-center">
                    <span className="font-display-lg-mobile text-display-lg-mobile text-secondary mr-4 group-hover:drop-shadow-[0_0_10px_rgba(240,192,62,0.8)] select-none">
                      {opt.key}:
                    </span>
                    <span className="font-headline-md text-headline-md text-on-surface group-hover:text-white transition-colors text-left truncate flex-1 select-none">
                      {opt.text}
                    </span>
                  </div>
                  {/* Inner Glow hover highlight */}
                  <div className="absolute inset-0 hex-clip pointer-events-none group-hover:option-glow transition-all duration-300" />
                </motion.button>
              ))}
            </motion.div>
          ) : (
            /* Locked/countdown pre-lock over: 1-column list */
            <motion.div 
              key="locked-list"
              variants={optionListVariants}
              initial="hidden"
              animate="visible"
              className="w-full max-w-2xl flex flex-col gap-4"
            >
              {options.map((opt) => {
                const isSelected = opt.key === activeSelection;
                if (isSelected) {
                  return (
                    <motion.div 
                      variants={optionItemVariants}
                      key={opt.key} 
                      className="relative w-full transform scale-[1.02] transition-transform duration-300"
                    >
                      <div className="hex-clip bg-secondary border-2 border-secondary locked-glow min-h-[76px] py-5 px-8 flex items-center shadow-[0_10px_30px_rgba(240,192,62,0.3)]">
                        <span className="font-headline-md text-headline-md text-on-secondary w-12 text-left select-none">
                          {opt.key}:
                        </span>
                        <span className="font-body-lg text-body-lg text-on-secondary flex-1 text-center font-bold select-none truncate">
                          {opt.text}
                        </span>
                        <div className="w-12 flex justify-end items-center gap-1">
                          <span className="material-symbols-outlined text-on-secondary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            lock
                          </span>
                          <span className="font-label-caps text-[10px] text-on-secondary font-bold select-none">LOCKED</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                } else {
                    return (
                    <motion.div 
                      variants={optionItemVariants}
                      key={opt.key} 
                      className="relative w-full opacity-40 filter grayscale cursor-not-allowed"
                    >
                      <div className="hex-clip bg-primary-container/40 border border-outline/30 min-h-[76px] py-5 px-8 flex items-center backdrop-blur-sm">
                        <span className="font-headline-md text-headline-md text-on-surface-variant w-12 text-left select-none">
                          {opt.key}:
                        </span>
                        <span className="font-body-lg text-body-lg text-on-surface-variant flex-1 text-center select-none truncate">
                          {opt.text}
                        </span>
                        <div className="w-12" />
                      </div>
                    </motion.div>
                  );
                }
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Bottom Navigation Bar (matches mockups layout) */}
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
