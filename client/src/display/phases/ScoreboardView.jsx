import { useDisplayGame } from '../DisplayGameContext';
import { motion } from 'framer-motion';
import { useBranding } from '../../shared/BrandingContext';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 15 } }
};

export default function ScoreboardView() {
  const { scoreboard, phase } = useDisplayGame();
  const { schoolName, brandLogoUrl } = useBranding();

  const teams = scoreboard || [];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-4xl mx-auto">
      {phase === 'QUIZ_ENDED' && brandLogoUrl && (
        <img src={brandLogoUrl} alt={`${schoolName} logo`} className="mb-4 h-16 w-16 object-contain" />
      )}
      <motion.p 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-8"
      >
        {phase === 'QUIZ_ENDED' ? 'Final Standings' : 'Scoreboard'}
      </motion.p>
      <motion.div 
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="w-full space-y-4"
      >
        {teams.length === 0 && (
          <p className="font-body-xl text-body-xl text-on-surface-variant">No scores yet</p>
        )}
        {teams.map((t, i) => {
          const isChampion = i === 0;
          return (
            <motion.div 
              variants={itemVariants}
              key={t.id} 
              className="relative"
            >
              {isChampion && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, y: 5 }}
                  animate={{ scale: 1, opacity: 1, y: -12 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                  className="absolute left-1/2 -translate-x-1/2 z-30 bg-secondary text-on-secondary px-6 py-1 rounded-full font-label-caps text-label-caps border border-white/20 whitespace-nowrap flex items-center gap-2 shadow-[0_0_15px_rgba(240,192,62,0.6)]"
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    emoji_events
                  </span>
                  CHAMPION
                </motion.div>
              )}
              <div
                className={`w-full glass-panel hex-clip flex items-center justify-between px-10 py-5 ${
                  isChampion
                    ? 'border-secondary gold-glow'
                    : 'border-outline-variant/30'
                }`}
              >
                <div className="flex items-center gap-5">
                  <span
                    className={`font-display-lg text-[32px] font-black leading-none ${
                      isChampion ? 'text-secondary' : 'text-on-surface-variant'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`font-headline-md text-[36px] ${
                      isChampion ? 'text-on-surface font-bold' : 'text-on-surface'
                    }`}
                  >
                    {t.name}
                  </span>
                </div>
                <span className="font-display-lg text-[40px] text-secondary leading-none drop-shadow-[0_0_12px_rgba(240,192,62,0.5)]">
                  {t.score}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
