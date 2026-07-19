export default function ResultsView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-4xl mx-auto">
      <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-6">
        Question Results
      </p>
      <div className="glass-panel-active rounded-xl p-8 w-full mb-8">
        <p className="font-headline-md text-headline-md text-on-surface">
          Correct Answer: <span className="text-secondary">B</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full">
        {['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'].map((name, i) => (
          <div key={name} className="glass-panel rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant font-label-caps text-sm">
              {i + 1}
            </div>
            <div className="text-left">
              <p className="font-body-md text-body-md text-on-surface">{name}</p>
              <p className="font-label-caps text-label-caps text-on-surface-variant">
                {i === 0 ? '✓ Correct — 3.2s' : i < 3 ? '✓ Correct' : '✗ No Answer'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
