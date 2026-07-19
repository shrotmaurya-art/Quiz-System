import { useCandidateGame } from './CandidateGameContext';

/**
 * ResultsView — candidate-tablet RESULTS / feedback screen (Task 5.5).
 *
 * Architecture (Section 13, "Results state"):
 *   Shows THIS candidate's own slice of `results:revealed`:
 *     - the correct answer (MCQ: option text for correctOptionKey;
 *       OPEN: a "spoken answer" note since there is no preset option)
 *     - whether THIS candidate was correct / incorrect / no-answer
 *       (status derived from results.rankings, filtered to this candidate id)
 *     - their own response time (elapsedMs, formatted to 2 decimals)
 *     - a clear "You won this round! 🏆" state if winnerCandidateId
 *       matches this candidate's id
 *
 * Visual references:
 *   winner     → docs/stitch-ui/candidate_tablet_results_winner/
 *   correct    → docs/stitch-ui/candidate_tablet_results_correct/
 *   incorrect  → docs/stitch-ui/candidate_tablet_results_incorrect/
 *                (reused for the "no answer" case too, only the badge text changes)
 */

function formatElapsed(ms) {
  if (ms == null) return '—';
  return (ms / 1000).toFixed(2) + 's';
}

export default function ResultsView() {
  const { gameState, results, candidateId, phase } = useCandidateGame();

  // `results` is the results:revealed payload:
  //   { correctOptionKey, rankings: [{ candidateId, elapsedMs, status }], winnerCandidateId }
  // It may be briefly null if we entered RESULTS before the event arrived;
  // fall back to the redacted snapshot's winnerCandidateId / locks.
  const winnerCandidateId = results?.winnerCandidateId ?? gameState?.winnerCandidateId ?? null;
  const correctOptionKey = results?.correctOptionKey ?? gameState?.question?.correctOptionKey ?? null;

  const myEntry = results?.rankings?.find((r) => r.candidateId === candidateId) ?? null;
  const myStatus = myEntry?.status ?? 'no_answer';
  const myElapsed = myEntry?.elapsedMs ?? gameState?.locks?.[candidateId]?.elapsedMs ?? null;

  const isWinner = winnerCandidateId === candidateId;
  const answerMode = gameState?.answerMode;
  const question = gameState?.question;

  // Resolve the correct-answer display text
  let correctAnswerLabel = '—';
  if (answerMode === 'MCQ' && question?.options && correctOptionKey) {
    const opt = question.options.find((o) => o.key === correctOptionKey);
    correctAnswerLabel = opt ? `${opt.key}. ${opt.text}` : correctOptionKey;
  } else if (answerMode === 'OPEN') {
    correctAnswerLabel = 'Spoken answer (judged by Quiz Master)';
  }

  // Status → copy + style (reuse incorrect layout for the no-answer case)
  const STATUS_MAP = {
    correct: {
      badge: 'CORRECT',
      tone: 'text-tertiary',
      ring: 'border-tertiary',
      glyph: 'check_circle',
    },
    incorrect: {
      badge: 'INCORRECT',
      tone: 'text-error',
      ring: 'border-error',
      glyph: 'cancel',
    },
    no_answer: {
      badge: 'NO ANSWER',
      tone: 'text-on-surface-variant',
      ring: 'border-outline',
      glyph: 'do_not_disturb',
    },
  };
  const statusInfo = STATUS_MAP[myStatus] || STATUS_MAP.no_answer;

  return (
    <div className="relative min-h-screen w-full overflow-y-auto flex flex-col font-body-md text-body-md text-on-surface bg-surface-container-lowest">
      <style>{`
        .results-radial-bg {
          background: radial-gradient(circle at center, #1a1a3a 0%, #080f14 80%);
        }
        .results-spotlight {
          background: radial-gradient(ellipse at top, rgba(240, 192, 62, 0.15) 0%, transparent 60%);
        }
        .winner-glow {
          animation: winner-glow 2s infinite ease-in-out;
        }
        @keyframes winner-glow {
          0%, 100% { box-shadow: inset 0 0 30px rgba(240, 192, 62, 0.4), 0 0 40px rgba(240, 192, 62, 0.25); }
          50% { box-shadow: inset 0 0 45px rgba(240, 192, 62, 0.6), 0 0 70px rgba(240, 192, 62, 0.4); }
        }
      `}</style>

      {/* Background Layers */}
      <div className="absolute inset-0 results-radial-bg z-0 pointer-events-none" />
      <div className="absolute inset-0 results-spotlight z-0 pointer-events-none" />

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center pt-28 pb-16 px-4 md:px-16 max-w-2xl mx-auto w-full">
        {isWinner ? (
          <div className="w-full max-w-xl z-30 rounded-3xl border-4 border-secondary bg-surface-container-high/80 p-8 md:p-12 text-center winner-glow">
            <span
              className="material-symbols-outlined text-[72px] text-secondary mb-2 drop-shadow-[0_0_20px_rgba(240,192,62,0.8)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              emoji_events
            </span>
            <h1 className="font-display-lg text-display-lg md:text-display-lg text-secondary drop-shadow-[0_0_12px_rgba(240,192,62,0.6)] leading-tight">
              YOU WON THIS ROUND! 🏆
            </h1>
            <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant">
              Fastest correct answer — points secured.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-xl z-30 rounded-3xl border border-outline bg-surface-container-high/80 p-8 md:p-12 text-center">
            <span
              className={`material-symbols-outlined text-[64px] mb-2 ${statusInfo.tone}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {statusInfo.glyph}
            </span>
            <h1 className={`font-display-md text-display-md ${statusInfo.tone} leading-tight`}>
              {myStatus === 'correct' ? "That's Correct!" : myStatus === 'incorrect' ? 'Not Quite' : "Time's Up"}
            </h1>
            <p className={`mt-2 font-label-caps text-label-caps tracking-[0.2em] ${statusInfo.tone}`}>
              {statusInfo.badge}
            </p>
          </div>
        )}

        {/* Feedback detail card */}
        <div className="w-full max-w-xl mt-8 z-30 rounded-2xl border border-secondary/30 bg-surface-container/70 p-6 md:p-8">
          {/* Correct answer */}
          <div className="flex flex-col gap-1 mb-5">
            <span className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em]">
              CORRECT ANSWER
            </span>
            <span className="font-headline-sm text-headline-sm md:text-headline-md text-secondary">
              {correctAnswerLabel}
            </span>
          </div>

          {/* This candidate's response time */}
          <div className="flex items-center justify-between border-t border-outline/40 pt-4">
            <span className="font-body-lg text-body-lg text-on-surface-variant">
              Your response time
            </span>
            <span className="font-display-sm text-display-sm text-on-surface">
              {myStatus === 'no_answer' ? '—' : formatElapsed(myElapsed)}
            </span>
          </div>

          {/* This candidate's status recap */}
          <div className="flex items-center justify-between border-t border-outline/40 pt-4 mt-4">
            <span className="font-body-lg text-body-lg text-on-surface-variant">
              Your result
            </span>
            <span className={`font-label-caps text-label-caps tracking-[0.15em] ${statusInfo.tone}`}>
              {statusInfo.badge}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}