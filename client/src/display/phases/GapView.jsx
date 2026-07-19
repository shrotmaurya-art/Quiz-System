import { useDisplayGame } from '../DisplayGameContext';

/**
 * GAP-phase suspense screen for the Main Display (Section 10 / FR25).
 *
 * Shown the moment the phase becomes GAP (driven by `gap:started` from the
 * server). The server only emits `gap:started` when the resolved `gapEnabled`
 * is true, so this view never has to guess — if it is mounted, a gap is in
 * progress. It renders a live countdown from `gap.remainingSeconds` (falling
 * back to `gap.gapSeconds` before the first tick arrives) and hands off to the
 * results view the moment `results:revealed` fires (handled by DisplayShell's
 * phase mapping).
 */
export default function GapView() {
  const { gap } = useDisplayGame();
  const remaining = gap?.remainingSeconds ?? gap?.gapSeconds ?? 0;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0A0E29] text-center">
      {/* Radial vignette for stage focus */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10,14,41,0) 35%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Ornate filled padlock */}
      <span
        className="material-symbols-outlined mb-6 text-[120px] leading-none text-secondary"
        style={{
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'opsz' 48, 'GRAD' 0",
          filter: 'drop-shadow(0 0 24px rgba(240,192,62,0.55))',
        }}
      >
        lock
      </span>

      {/* Live countdown */}
      <div
        className="luminous-text mb-4 font-display-xl text-[120px] leading-none"
        aria-live="polite"
      >
        {remaining}
      </div>

      {/* Pulsing headline */}
      <h2 className="luminous-text animate-suspense-pulse font-display-lg text-display-lg tracking-wide">
        CALCULATING RESULTS…
      </h2>

      <p className="mt-4 font-body-lg text-body-lg text-on-surface-variant">
        Please wait while we tally the scores
      </p>
    </div>
  );
}