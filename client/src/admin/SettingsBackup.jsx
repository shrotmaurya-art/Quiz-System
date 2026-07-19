export default function SettingsBackup() {
  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="mb-stack-md">
        <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
          System Settings
        </h2>
        <p className="font-body-lg text-on-surface-variant mt-2 max-w-2xl">
          Configure global broadcast parameters and manage system data architecture.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <section className="glass-panel rounded-xl p-8 relative overflow-hidden">
          <h3 className="font-headline-md text-headline-md text-tertiary mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined">tune</span>
            General Settings
          </h3>
          <p className="text-on-surface-variant font-body-md">
            Default time limit, gap settings, and scoring defaults will appear here.
          </p>
        </section>
        <section className="glass-panel rounded-xl p-8 relative overflow-hidden">
          <h3 className="font-headline-md text-headline-md text-secondary mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined">database</span>
            Backup &amp; Restore
          </h3>
          <p className="text-on-surface-variant font-body-md">
            Export and import backup controls will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
