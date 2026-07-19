import { useDisplayGame } from '../DisplayGameContext';

/**
 * Results / ranking screen for the Main Display (Section 13 / Task 4.5).
 *
 * Renders the `results:revealed` payload:
 *   - correct answer highlighted in a gold diamond banner
 *   - the WINNER as a dramatic hero card (trophy, logo, "Fastest Correct", big
 *     gold time) — the hero moment of the round, not a small badge
 *   - a ranked list of every other candidate joined from `candidates`
 *     (logo + name from candidates:public-updated) with their elapsedMs/status
 *     from results:revealed's rankings array, formatted as "3.42s" or
 *     "No Answer"
 *   - the live scoreboard strip at the bottom
 *
 * All data is already redacted/public-safe upstream; the display never sees
 * correctOptionKey before reveal (Section 11/12).
 */

function formatTime(ms) {
  if (ms == null) return 'No Answer';
  return (ms / 1000).toFixed(2) + 's';
}

export default function ResultsView() {
  const { results, candidates, scoreboard } = useDisplayGame();

  const correctKey = results?.correctOptionKey;
  const rankings = results?.rankings || [];
  const winnerId = results?.winnerCandidateId || null;

  // Map candidateId -> public candidate (logo + name)
  const candidateById = (id) => candidates.find((c) => c.id === id);

  // Preserve the server's fastest-first ordering; attach name/logo.
  const rankedRows = rankings.map((r) => ({
    ...r,
    candidate: candidateById(r.candidateId),
  }));

  const winnerRow = rankedRows.find((r) => r.candidateId === winnerId) || null;
  // Everyone except the winner, in the same fastest-first order.
  const otherRows = rankedRows.filter((r) => r.candidateId !== winnerId);

  return (
    <div className="relative flex flex-col items-center h-full w-full overflow-y-auto px-4 py-10 md:px-margin-desktop">
      {/* ── Correct Answer banner ── */}
      <p className="font-label-caps text-label-caps text-secondary mb-4 tracking-[0.2em] uppercase">
        Correct Answer
      </p>
      <div className="relative w-full md:w-3/4 max-w-3xl h-24 md:h-32 p-[2px] bg-secondary diamond-clip shadow-[0_0_40px_rgba(240,192,62,0.4)] mb-12">
        <div className="w-full h-full bg-surface-container-lowest/90 backdrop-blur-[20px] diamond-clip flex items-center justify-center gap-5 relative overflow-hidden gold-glow">
          <span
            className="material-symbols-outlined text-[44px] text-[#4ade80] drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          <h1 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.6)]">
            {correctKey ? `${correctKey}` : 'Answer judged by Quiz Master'}
          </h1>
        </div>
      </div>

      {/* ── Winner hero card (the dramatic moment) ── */}
      {winnerRow && (
        <div className="w-full max-w-4xl mb-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-secondary/0 via-secondary to-secondary/0 rounded-xl blur-lg opacity-60 transition-opacity duration-1000" />
          <div
            className="relative w-full bg-surface-container-low/95 backdrop-blur-[20px] border border-secondary rounded-xl p-6 md:p-8 flex items-center gap-6 md:gap-8 shadow-[inset_0_0_30px_rgba(240,192,62,0.2)] overflow-hidden"
            style={{
              background:
                'radial-gradient(circle at center, rgba(240,192,62,0.15) 0%, transparent 70%), rgba(22,28,34,0.95)',
            }}
          >
            {/* Trophy */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary/20 border border-secondary/50 shadow-[0_0_15px_rgba(240,192,62,0.3)]">
              <span
                className="material-symbols-outlined text-[30px] md:text-[32px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emoji_events
              </span>
            </div>
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-secondary overflow-hidden shadow-[0_0_20px_rgba(240,192,62,0.4)] bg-surface-container-high flex items-center justify-center">
              {winnerRow.candidate?.logoUrl ? (
                <img
                  className="w-full h-full object-cover"
                  src={winnerRow.candidate.logoUrl}
                  alt={winnerRow.candidate.name || 'winner'}
                />
              ) : (
                <span className="material-symbols-outlined text-secondary text-[32px]">person</span>
              )}
            </div>
            {/* Info */}
            <div className="flex-grow min-w-0">
              <p className="font-label-caps text-label-caps text-secondary mb-1">Fastest Correct</p>
              <h2 className="font-headline-xl text-headline-xl text-on-surface truncate">
                {winnerRow.candidate?.name || 'Unknown'}
              </h2>
            </div>
            {/* Time */}
            <div className="flex-shrink-0 text-right">
              <p className="font-display-lg text-[36px] md:text-[44px] text-secondary font-black drop-shadow-[0_0_10px_rgba(240,192,62,0.5)] leading-none">
                {formatTime(winnerRow.elapsedMs)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Ranked list of the rest ── */}
      <div className="w-full max-w-4xl flex flex-col gap-3 md:gap-4">
        {otherRows.map((r, i) => {
          const isCorrect = r.status === 'correct';
          const isNoAnswer = r.status === 'no_answer';
          const rowClass = isNoAnswer
            ? 'bg-surface-container-lowest/50 border-outline-variant/10 opacity-50 grayscale'
            : isCorrect
              ? 'bg-surface-container/80 border-secondary/30 shadow-[inset_0_0_15px_rgba(240,192,62,0.05)]'
              : 'bg-surface-container-lowest/80 border-outline-variant/30 opacity-70 grayscale-[50%]';

          return (
            <div
              key={r.candidateId}
              className={`w-full ${rowClass} backdrop-blur-[10px] border rounded-lg p-4 flex items-center gap-4 md:gap-6`}
            >
              <div className="w-8 text-center font-label-caps text-label-caps text-on-surface-variant">
                {i + 2}
              </div>
              <div className="w-12 h-12 rounded-full border border-secondary/50 overflow-hidden bg-surface-container-high flex items-center justify-center flex-shrink-0">
                {r.candidate?.logoUrl ? (
                  <img className="w-full h-full object-cover" src={r.candidate.logoUrl} alt={r.candidate.name || ''} />
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-[28px]">person</span>
                )}
              </div>
              <div className="flex-grow font-headline-md text-[32px] text-on-surface truncate">
                {r.candidate?.name || 'Unknown'}
              </div>
              <div
                className={`text-body-xl font-bold flex-shrink-0 ${
                  isNoAnswer
                    ? 'text-outline italic font-normal'
                    : isCorrect
                      ? 'text-secondary'
                      : 'text-error/80'
                }`}
              >
                {formatTime(r.elapsedMs)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Scoreboard strip ── */}
      {scoreboard && scoreboard.length > 0 && (
        <div className="w-full max-w-4xl mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {scoreboard.map((c, i) => (
            <div
              key={c.id}
              className="flex items-center gap-2 glass-panel rounded-full pl-1 pr-4 py-1"
            >
              <div className="w-8 h-8 rounded-full border border-secondary/40 overflow-hidden bg-surface-container-high flex items-center justify-center flex-shrink-0">
                {c.logoUrl ? (
                  <img className="w-full h-full object-cover" src={c.logoUrl} alt={c.name} />
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">person</span>
                )}
              </div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                {i + 1}. {c.name}
              </span>
              <span className="text-body-xl text-secondary font-bold">{c.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}