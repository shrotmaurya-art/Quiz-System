import { motion } from 'framer-motion';
import { useBranding } from '../../shared/BrandingContext';
import { unlockAudio, isAudioUnlocked } from '../../shared/soundEffects';
import { useState, useCallback } from 'react';

export default function IdleView() {
  const { schoolName, brandLogoUrl } = useBranding();
  const eventTitle = /quiz\s*$/i.test(schoolName) ? schoolName : `${schoolName} Annual Quiz`;
  const [unlocked, setUnlocked] = useState(isAudioUnlocked());

  const handleUnlock = useCallback(() => {
    unlockAudio();
    setUnlocked(true);
  }, []);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      onClick={!unlocked ? handleUnlock : undefined}
      style={!unlocked ? { cursor: 'pointer' } : undefined}
    >
      {/* Subtle vignette that lets the ambient shader show through (no darkening overlay) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(8,15,20,0.55)_100%)]" />

      <main className="relative z-10 flex flex-col items-center justify-center gap-stack-lg max-w-[1200px] mx-auto px-[64px] text-center">
        {brandLogoUrl && (
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            src={brandLogoUrl}
            alt={`${schoolName} logo`}
            className="w-24 h-24 md:w-32 md:h-32 object-contain mb-4 drop-shadow-[0_0_20px_rgba(240,192,62,0.4)]"
          />
        )}

        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="font-display-lg text-[clamp(2.8rem,5.2vw,5rem)] text-secondary tracking-tight leading-[1.05] drop-shadow-[0_0_30px_rgba(240,192,62,0.8)]"
        >
          {eventTitle}
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="font-label-caps text-label-caps text-on-surface-variant animate-slow-pulse tracking-[0.2em] uppercase"
        >
          Get Ready.
        </motion.p>

        {!unlocked && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="mt-8 font-body-lg text-body-lg text-on-surface-variant/70 animate-pulse"
          >
            Click anywhere to enable sound
          </motion.p>
        )}
      </main>
    </div>
  );
}
