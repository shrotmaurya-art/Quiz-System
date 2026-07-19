import { useDisplayGame } from '../DisplayGameContext';

export default function ScoreboardView() {
  const { scoreboard } = useDisplayGame();

  const teams = scoreboard || [];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-4xl mx-auto">
      <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-8">
        Scoreboard
      </p>
      <div className="w-full space-y-4">
        {teams.length === 0 && (
          <p className="font-body-lg text-body-lg text-on-surface-variant">No scores yet</p>
        )}
        {teams.map((t, i) => {
          const isChampion = i === 0;
          return (
            <div key={t.id} className="relative">
              {isChampion && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 bg-secondary text-on-secondary px-6 py-1 rounded-full font-label-caps text-label-caps border border-white/20 whitespace-nowrap flex items-center gap-2 shadow-[0_0_15px_rgba(240,192,62,0.6)]">
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    emoji_events
                  </span>
                  CHAMPION
                </div>
              )}
              <div
                className={`w-full glass-panel diamond-clip flex items-center justify-between px-10 py-5 ${
                  isChampion
                    ? 'border-secondary gold-glow animate-slow-pulse'
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
                    className={`font-headline-md text-[28px] ${
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
