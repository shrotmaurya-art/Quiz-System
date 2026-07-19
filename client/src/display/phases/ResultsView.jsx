import { useDisplayGame } from '../DisplayGameContext';

function formatTime(ms) {
  if (ms == null) return '';
  return (ms / 1000).toFixed(1) + 's';
}

export default function ResultsView() {
  const { results, candidates, gameState } = useDisplayGame();

  const correctKey = results?.correctOptionKey;
  const rankings = results?.rankings || [];
  const winnerId = results?.winnerCandidateId;

  const getCandidateName = (id) => {
    const c = candidates.find((c) => c.id === id);
    return c?.name || id;
  };

  const statusLabel = (status) => {
    if (status === 'correct') return '✓ Correct';
    if (status === 'incorrect') return '✗ Incorrect';
    return '✗ No Answer';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-4xl mx-auto">
      <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-6">
        Question Results
      </p>

      {correctKey && (
        <div className="glass-panel-active rounded-xl p-8 w-full mb-8">
          <p className="font-headline-md text-headline-md text-on-surface">
            Correct Answer: <span className="text-secondary">{correctKey}</span>
          </p>
        </div>
      )}

      {winnerId && (
        <div className="glass-panel rounded-lg px-6 py-3 mb-6 border-secondary/60 gold-glow">
          <span className="font-label-caps text-label-caps text-secondary">
            🏆 Winner: {getCandidateName(winnerId)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 w-full">
        {rankings.map((r, i) => (
          <div
            key={r.candidateId}
            className={`glass-panel rounded-lg p-4 flex items-center gap-4 ${
              r.candidateId === winnerId ? 'border-secondary/60 gold-glow' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-label-caps text-sm">
              {i + 1}
            </div>
            <div className="text-left">
              <p className="font-body-md text-body-md text-on-surface">
                {getCandidateName(r.candidateId)}
              </p>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {statusLabel(r.status)}
                {r.elapsedMs != null && ` — ${formatTime(r.elapsedMs)}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
