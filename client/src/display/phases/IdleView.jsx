const SCHOOL_NAME = "St. Jude's Academy";

const EVENT_TITLE = `${SCHOOL_NAME} Annual Quiz`;

export default function IdleView() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Overlay gradient for text legibility over shader */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(14,20,26,0.4)_40%,rgba(14,20,26,0.9)_100%)] mix-blend-multiply" />

      <main className="relative z-10 flex flex-col items-center justify-center gap-stack-lg max-w-[1200px] mx-auto px-[64px] text-center">
        <h1 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_30px_rgba(240,192,62,0.8)] tracking-tight leading-[1.1]">
          {EVENT_TITLE}
        </h1>

        <p className="font-headline-md text-headline-md text-on-surface-variant animate-slow-pulse tracking-[0.2em] uppercase">
          Get Ready.
        </p>
      </main>
    </div>
  );
}
