import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * WaitingRoom — candidate-tablet idle/waiting screen (Task 5.6).
 * Shows THIS candidate's own name + logo (fetched once on connect via
 * GET /api/candidates/:id/public) and a "Waiting for the quiz to start…" message.
 * Visual refs: candidate_tablet_waiting_room/ and candidate_tablet_waiting_room_desktop/
 */

function buildApiBase() {
  const v = import.meta.env.VITE_API_URL;
  if (v) return v.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:4000`;
  return '';
}

export default function WaitingRoom({ candidateId }) {
  const [profile, setProfile] = useState(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!candidateId) return;
    fetch(`${buildApiBase()}/api/candidates/${encodeURIComponent(candidateId)}/public`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('profile ' + r.status))))
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setErrored(true); });
    return () => { cancelled = true; };
  }, [candidateId]);

  const name = profile?.name || candidateId || 'Contestant';
  const logoUrl = profile?.logoUrl || null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-body-md text-body-md text-on-surface bg-surface-container-lowest">
      <style>{`
        .waiting-radial { background: radial-gradient(circle at 50% 35%, #1a1a3a 0%, #080f14 80%); }
        .waiting-spotlight { background: radial-gradient(ellipse at top, rgba(240, 192, 62, 0.15) 0%, transparent 60%); }
        .waiting-pulse { animation: waiting-pulse 2.2s infinite ease-in-out; }
        @keyframes waiting-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
        .logo-ring { box-shadow: 0 0 30px rgba(240, 192, 62, 0.3), inset 0 0 15px rgba(240, 192, 62, 0.2); }
      `}</style>

      <div className="absolute inset-0 waiting-radial z-0 pointer-events-none" />
      <div className="absolute inset-0 waiting-spotlight z-0 pointer-events-none" />

      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-4 md:px-16 py-16 max-w-2xl mx-auto w-full text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          className="mb-8"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={`${name} logo`} className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-contain bg-surface-container-high logo-ring" />
          ) : (
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-surface-container-high flex items-center justify-center logo-ring">
              <span className="material-symbols-outlined text-[56px] md:text-[72px] text-secondary">person</span>
            </div>
          )}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', delay: 0.1, damping: 20, stiffness: 150 }}
          className="mb-3 font-display-md text-display-md md:font-display-lg md:text-display-lg text-secondary drop-shadow-[0_0_12px_rgba(240,192,62,0.5)]"
        >
          {name}
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-6 flex items-center gap-3 text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[28px] text-secondary waiting-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
          <p className="font-label-caps text-label-caps tracking-[0.2em]">WAITING FOR THE QUIZ TO START…</p>
        </motion.div>

        {errored && (
          <p className="mt-6 font-body-sm text-body-sm text-on-surface-variant">(Could not load your profile — but you're connected.)</p>
        )}
      </main>
    </div>
  );
}