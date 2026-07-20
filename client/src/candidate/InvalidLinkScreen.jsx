import { motion } from 'framer-motion';

/**
 * Friendly error screen shown when a candidate's /play/:candidateId?token= link
 * is invalid (missing token, or the server rejected the candidateId+token pair
 * at the Socket.IO layer — see Section 15 / Task 2.5). Matches the Stitch mockup
 * `docs/stitch-ui/candidate_tablet_invalid_link_error/`.
 *
 * This is intentionally a dead-end screen: it shows a clear message and does
 * NOT attempt any further connection. The real fix is for the Quiz Master to
 * issue a fresh link.
 */
export default function InvalidLinkScreen() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-center">
      {/* Atmospheric radial backdrop (matches the rest of the app) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, #1a2026 0%, #080f14 100%)',
        }}
      />

      <main
        aria-labelledby="error-headline"
        className="relative z-10 flex w-full max-w-md flex-col items-center justify-center px-4 md:px-0"
      >
        <motion.article 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="glass-panel relative w-full overflow-hidden rounded-xl p-8 flex flex-col items-center text-center transition-all duration-500 hover:shadow-[0_0_40px_rgba(240,192,62,0.25)]"
        >
          {/* Subtle top light reflection */}
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-secondary/50 to-transparent opacity-70" />

          {/* Icon container */}
          <div className="relative mb-6">
            <div className="absolute inset-0 scale-150 rounded-full bg-secondary opacity-30 blur-xl pulse-slow" />
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-secondary bg-surface-container shadow-[inset_0_0_15px_rgba(240,192,62,0.3)]">
              <span
                className="material-symbols-outlined text-5xl text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                warning
              </span>
            </div>
          </div>

          {/* Content */}
          <header className="flex w-full flex-col gap-2">
            <h1
              id="error-headline"
              className="m-0 font-display-lg text-display-lg text-secondary"
              style={{ textShadow: '0 0 10px rgba(240,192,62,0.5)' }}
            >
              This link isn't valid
            </h1>
            <div className="mx-auto my-2 h-px w-24 bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
            <p className="m-0 mx-auto max-w-xs font-body-lg text-body-lg text-on-surface opacity-90">
              Please check with your Quiz Master to get a new link.
            </p>
          </header>

          {/* Bottom edge decor */}
          <div className="absolute bottom-0 left-0 flex w-full translate-y-1/2 justify-center">
            <div className="h-2 w-2 bg-secondary opacity-50 shadow-[0_0_10px_#f0c03e] clip-diamond" />
          </div>
        </motion.article>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="font-label-caps text-label-caps text-outline tracking-[0.2em]">
            CINEMATIC BROADCAST SYSTEMS
          </p>
        </motion.footer>
      </main>
    </div>
  );
}