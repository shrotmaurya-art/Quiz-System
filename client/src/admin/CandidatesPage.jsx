export default function CandidatesPage() {
  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end pb-4 border-b border-secondary/20">
        <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
          CANDIDATE ROSTER
        </h2>
        <button className="clip-diamond bg-secondary/10 border border-secondary text-secondary px-8 py-3 font-label-caps text-label-caps flex items-center gap-2 hover:bg-secondary/20 transition-all">
          <span className="material-symbols-outlined text-lg">add</span>
          ADD CANDIDATE
        </button>
      </header>
      <div className="glass-panel rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4 block">groups</span>
        <p className="text-on-surface-variant font-body-lg">
          Candidate management will appear here.
        </p>
      </div>
    </div>
  );
}
