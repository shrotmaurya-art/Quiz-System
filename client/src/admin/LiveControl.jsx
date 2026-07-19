export default function LiveControl() {
  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end pb-4 border-b border-secondary/20">
        <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
          LIVE CONTROL
        </h2>
        <div className="flex items-center gap-3 bg-surface-container-highest/80 backdrop-blur-md px-6 py-3 rounded-full border border-secondary">
          <div className="w-3 h-3 rounded-full bg-outline animate-pulse"></div>
          <span className="font-label-caps text-label-caps text-on-surface-variant font-bold tracking-widest">
            IDLE
          </span>
        </div>
      </header>
      <div className="glass-panel rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4 block">sensors</span>
        <p className="text-on-surface-variant font-body-lg">
          Quiz controls will appear here once the quiz begins.
        </p>
      </div>
    </div>
  );
}
