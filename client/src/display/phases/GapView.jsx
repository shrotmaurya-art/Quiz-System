import { useDisplayGame } from '../DisplayGameContext';
import { motion } from 'framer-motion';

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
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center">
      {/* Radial vignette for stage focus (transparent center lets the ambient shader show through) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(10,14,41,0) 35%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Ornate filled padlock */}
      <motion.span
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 120 }}
        className="material-symbols-outlined mb-6 text-[120px] leading-none text-secondary"
        style={{
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'opsz' 48, 'GRAD' 0",
          filter: 'drop-shadow(0 0 24px rgba(240,192,62,0.55))',
        }}
      >
        lock
      </motion.span>

      {/* Live countdown */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150, delay: 0.1 }}
        className="luminous-text mb-4 font-display-xl text-[120px] leading-none"
        aria-live="polite"
      >
        {remaining}
      </motion.div>

      {/* Pulsing headline */}
      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="luminous-text animate-suspense-pulse font-display-lg text-display-lg tracking-wide"
      >
        CALCULATING RESULTS…
      </motion.h2>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-4 font-body-xl text-body-xl text-on-surface-variant"
      >
        Please wait while we tally the scores
      </motion.p>
    </div>
  );
}