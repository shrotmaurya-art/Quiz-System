import { useDisplayGame } from '../DisplayGameContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionView() {
  const { gameState, timer, candidateLocked, candidates } = useDisplayGame();

  const question = gameState?.question;
  const lockedCount = gameState?.locks
    ? Object.values(gameState.locks).filter((l) => l.answered).length
    : 0;
  const totalCandidates = candidates?.length || 0;
  const questionIndex = question?.order ?? '';

  const timerDisplay =
    timer?.remainingSeconds != null ? timer.remainingSeconds : gameState?.timeLimitSeconds ?? '—';

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={question?.id || 'no-question'}
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full flex flex-col items-center"
        >
          {questionIndex && (
            <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-4">
              Question {questionIndex}
            </p>
          )}

          {question?.text ? (
            <div className="glass-panel-active rounded-xl p-12 w-full mb-10 relative overflow-hidden">
              <h2 className="font-display-lg text-display-lg text-on-surface leading-snug">
                {question.text}
              </h2>
              {question.mediaUrl && question.mediaType === 'image' && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  src={question.mediaUrl}
                  alt="Question media"
                  className="mt-8 mx-auto max-h-[45vh] rounded-lg object-contain"
                />
              )}
            </div>
          ) : (
            <div className="glass-panel-active rounded-xl p-12 w-full mb-10">
              <h2 className="font-headline-xl text-headline-xl text-on-surface-variant animate-pulse">
                Waiting for question…
              </h2>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-8"
      >
        <div className="w-40 h-40 rounded-full border-4 border-secondary flex items-center justify-center gold-glow shadow-[0_0_20px_rgba(240,192,62,0.4)]">
          <span className="font-display-lg text-[56px] text-secondary font-black leading-none drop-shadow-[0_0_15px_rgba(240,192,62,0.6)]">
            {timerDisplay}
          </span>
        </div>
        <div className="glass-panel rounded-lg px-8 py-4 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-secondary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          <span className="font-label-caps text-label-caps text-on-surface-variant text-[22px]">
            {lockedCount}/{totalCandidates} locked in
          </span>
        </div>
      </motion.div>
    </div>
  );
}
