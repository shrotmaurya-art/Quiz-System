export default function ScoreboardView() {
  const teams = [
    { name: 'Team Alpha', score: 120 },
    { name: 'Team Beta', score: 90 },
    { name: 'Team Gamma', score: 75 },
    { name: 'Team Delta', score: 60 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-3xl mx-auto">
      <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-6">
        Scoreboard
      </p>
      <div className="w-full space-y-3">
        {teams.map((t, i) => (
          <div
            key={t.name}
            className={`glass-panel rounded-lg px-6 py-4 flex items-center justify-between ${
              i === 0 ? 'border-secondary/60 gold-glow' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="font-label-caps text-label-caps text-on-surface-variant w-8">
                #{i + 1}
              </span>
              <span className="font-headline-md text-headline-md text-on-surface">
                {t.name}
              </span>
            </div>
            <span className="font-label-caps text-label-caps text-secondary">
              {t.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
