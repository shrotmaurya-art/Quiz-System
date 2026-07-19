export default function QuestionView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 max-w-5xl mx-auto">
      <p className="font-label-caps text-label-caps text-secondary tracking-[0.15em] uppercase mb-4">
        Round 1 &middot; Question 1
      </p>
      <div className="glass-panel-active rounded-xl p-10 w-full mb-8">
        <h2 className="font-headline-md text-headline-md text-on-surface leading-relaxed">
          What is the capital of France?
        </h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 rounded-full border-4 border-secondary flex items-center justify-center">
          <span className="font-label-caps text-label-caps text-secondary">15s</span>
        </div>
        <div className="glass-panel rounded-lg px-6 py-3">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            🔒 0/4 locked in
          </span>
        </div>
      </div>
    </div>
  );
}
