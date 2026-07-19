export default function GapView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="relative mb-8">
        <span className="material-symbols-outlined text-[80px] text-tertiary/50 animate-pulse">
          hourglass_top
        </span>
      </div>
      <h2 className="font-display-lg text-display-lg text-on-surface mb-4">
        Calculating Results…
      </h2>
      <p className="font-body-lg text-body-lg text-on-surface-variant">
        Please wait
      </p>
    </div>
  );
}
