import { useDisplayGame } from '../DisplayGameContext';

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
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-5xl mx-auto">
      {questionIndex && (
        <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-4">
          Question {questionIndex}
        </p>
      )}

      {question?.text ? (
        <div className="glass-panel-active rounded-xl p-10 w-full mb-8">
          <h2 className="font-headline-md text-headline-md text-on-surface leading-relaxed">
            {question.text}
          </h2>
          {question.mediaUrl && question.mediaType === 'image' && (
            <img
              src={question.mediaUrl}
              alt="Question media"
              className="mt-6 mx-auto max-h-[50vh] rounded-lg object-contain"
            />
          )}
        </div>
      ) : (
        <div className="glass-panel-active rounded-xl p-10 w-full mb-8">
          <h2 className="font-headline-md text-headline-md text-on-surface-variant animate-pulse">
            Waiting for question…
          </h2>
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-full border-4 border-secondary flex items-center justify-center">
          <span className="font-label-caps text-label-caps text-secondary">{timerDisplay}s</span>
        </div>
        <div className="glass-panel rounded-lg px-6 py-3">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            🔒 {lockedCount}/{totalCandidates} locked in
          </span>
        </div>
      </div>
    </div>
  );
}
