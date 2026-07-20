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
  const isLongQuestion = (question?.text?.length ?? 0) > 120;
  const hasMedia = Boolean(question?.mediaUrl);

  const timerDisplay =
    timer?.remainingSeconds != null ? timer.remainingSeconds : gameState?.timeLimitSeconds ?? '—';

  return (
    <div className="flex min-h-0 h-full flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center sm:px-8 lg:px-12 max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={question?.id || 'no-question'}
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full flex flex-col items-center"
        >
          {(gameState?.roundName || questionIndex) && (
            <p className="font-label-caps text-[clamp(0.85rem,1.4vw,1.15rem)] text-secondary tracking-[0.15em] uppercase mb-3">
              {gameState?.roundName && <span>{gameState.roundName}</span>}
              {gameState?.roundName && questionIndex && <span className="mx-3 text-on-surface-variant">•</span>}
              {questionIndex && <span>Question {questionIndex}</span>}
            </p>
          )}

          {question?.text ? (
            <div className={`glass-panel-active rounded-xl w-full mb-6 relative overflow-hidden ${hasMedia ? 'p-6 lg:p-8' : 'p-7 lg:p-10'}`}>
              <h2 className={`font-display-lg text-on-surface leading-[1.18] ${
                isLongQuestion
                  ? 'text-[clamp(2rem,3.25vw,3.5rem)]'
                  : 'text-[clamp(2.25rem,4vw,4.25rem)]'
              }`}>
                {question.text}
              </h2>
              {question.mediaUrl && question.mediaType === 'image' && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  src={question.mediaUrl}
                  alt="Question media"
                  className="mt-5 mx-auto max-h-[30vh] rounded-lg object-contain"
                />
              )}
              {question.mediaUrl && question.mediaType === 'video' && (
                <video
                  src={question.mediaUrl}
                  autoPlay
                  muted
                  playsInline
                  className="mt-5 mx-auto max-h-[30vh] rounded-lg"
                />
              )}
            </div>
          ) : (
            <div className="glass-panel-active rounded-xl p-7 lg:p-10 w-full mb-6">
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
        className="flex flex-wrap items-center justify-center gap-4 lg:gap-8"
      >
        <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full border-4 border-secondary flex items-center justify-center gold-glow shadow-[0_0_20px_rgba(240,192,62,0.4)]">
          <span className="font-display-lg text-[clamp(2.6rem,4vw,3.5rem)] text-secondary font-black leading-none drop-shadow-[0_0_15px_rgba(240,192,62,0.6)]">
            {timerDisplay}
          </span>
        </div>
        <div className="glass-panel rounded-lg px-5 py-3 lg:px-8 lg:py-4 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-secondary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            lock
          </span>
          <span className="font-label-caps text-[clamp(1rem,1.8vw,1.35rem)] text-on-surface-variant">
            {lockedCount}/{totalCandidates} locked in
          </span>
        </div>
      </motion.div>
    </div>
  );
}
