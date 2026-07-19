import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../shared/api';

export default function SettingsBackup() {
  const [settings, setSettings] = useState({
    defaultTimeLimitSeconds: 30,
    defaultGapEnabled: true,
    defaultGapSeconds: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchSettings = useCallback(async () => {
    const res = await apiFetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      setSettings({
        defaultTimeLimitSeconds: data.defaultTimeLimitSeconds,
        defaultGapEnabled: Boolean(data.defaultGapEnabled),
        defaultGapSeconds: data.defaultGapSeconds,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultTimeLimitSeconds: Number(settings.defaultTimeLimitSeconds),
        defaultGapEnabled: settings.defaultGapEnabled ? 1 : 0,
        defaultGapSeconds: Number(settings.defaultGapSeconds),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings({
        defaultTimeLimitSeconds: data.defaultTimeLimitSeconds,
        defaultGapEnabled: Boolean(data.defaultGapEnabled),
        defaultGapSeconds: data.defaultGapSeconds,
      });
      setSaveMessage('Settings saved successfully.');
    } else {
      setSaveMessage('Failed to save settings.');
    }
    setSaving(false);
  }

  async function handleExport() {
    const res = await apiFetch('/api/export');
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file) {
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    let document;
    try {
      document = JSON.parse(text);
    } catch {
      alert('Invalid JSON file.');
      setImporting(false);
      return;
    }
    const res = await apiFetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });
    if (res.ok) {
      alert('Backup imported successfully. The page will now reload.');
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Import failed: ${err.error || 'Unknown error'}`);
    }
    setImporting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="material-symbols-outlined text-secondary animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

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
        {/* General Settings Card */}
        <section className="glass-panel bg-primary-container/40 rounded-xl border border-tertiary-fixed-dim/30 p-8 relative overflow-hidden clip-diamond">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-tertiary/20 rounded-full blur-3xl"></div>
          <h3 className="font-headline-md text-headline-md text-tertiary mb-6 flex items-center gap-3">
            <span className="material-symbols-outlined">tune</span>
            General Settings
          </h3>

          <div className="flex flex-col gap-stack-md">
            {/* Default Time Limit */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                Default Time Limit (Seconds)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.defaultTimeLimitSeconds}
                onChange={(e) => setSettings({ ...settings, defaultTimeLimitSeconds: e.target.value })}
                className="w-full bg-surface-container-highest/50 border-b border-tertiary-fixed-dim/50 focus:border-tertiary focus:ring-0 text-on-surface p-3 font-body-lg transition-all rounded"
              />
            </div>

            {/* Gap Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded border border-outline-variant/30">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface block">
                  Default Gap Enabled
                </label>
                <span className="text-sm text-on-surface-variant">
                  Introduce dramatic pause between stages.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.defaultGapEnabled}
                  onChange={(e) => setSettings({ ...settings, defaultGapEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container border border-secondary/30 box-shadow-[inset_0_0_10px_rgba(240,192,62,0.2)]"></div>
              </label>
            </div>

            {/* Default Gap Seconds */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                Default Gap Seconds
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.defaultGapSeconds}
                onChange={(e) => setSettings({ ...settings, defaultGapSeconds: e.target.value })}
                className="w-full bg-surface-container-highest/50 border-b border-tertiary-fixed-dim/50 focus:border-tertiary focus:ring-0 text-on-surface p-3 font-body-lg transition-all rounded"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/20">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-secondary/10 border border-secondary text-secondary py-3 px-6 rounded font-label-caps text-label-caps btn-gold-pulse flex justify-center items-center gap-2 hover:bg-secondary hover:text-background transition-colors duration-300 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">
                {saving ? 'progress_activity' : 'save'}
              </span>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveMessage && (
              <p className={`text-sm mt-3 text-center ${saveMessage.includes('Failed') ? 'text-error' : 'text-secondary'}`}>
                {saveMessage}
              </p>
            )}
          </div>
        </section>

        {/* Backup & Restore Card */}
        <section className="glass-panel bg-surface-container-highest/40 rounded-xl border border-secondary/30 p-8 relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"></div>
          <h3 className="font-headline-md text-headline-md text-secondary mb-6 flex items-center gap-3 font-display-lg text-2xl tracking-normal">
            <span className="material-symbols-outlined">database</span>
            Backup &amp; Restore
          </h3>
          <p className="text-on-surface-variant font-body-md mb-8">
            Securely export current show configuration or restore from a previous save state. Ensure broadcast readiness before executing restore.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleExport}
              className="bg-secondary text-background font-label-caps text-label-caps py-4 px-4 rounded shadow-[0_0_20px_rgba(240,192,62,0.3)] hover:shadow-[0_0_30px_rgba(240,192,62,0.6)] transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <span className="material-symbols-outlined text-2xl group-hover:-translate-y-1 transition-transform">
                download
              </span>
              Export Backup
            </button>

            <label className="bg-transparent border border-tertiary text-tertiary font-label-caps text-label-caps py-4 px-4 rounded shadow-[inset_0_0_15px_rgba(196,192,255,0.1)] hover:bg-tertiary/10 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer">
              <span className="material-symbols-outlined text-2xl group-hover:-translate-y-1 transition-transform">
                {importing ? 'progress_activity' : 'upload'}
              </span>
              {importing ? 'Importing...' : 'Import Backup'}
              <input
                type="file"
                accept=".json"
                className="hidden"
                disabled={importing}
                onChange={(e) => handleImport(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="bg-error-container/20 border border-error/30 rounded p-4 flex gap-3 items-start mt-auto">
            <span className="material-symbols-outlined text-error text-sm mt-0.5">warning</span>
            <p className="text-error font-body-md text-sm leading-tight text-secondary-fixed">
              <strong className="font-bold">Warning:</strong> Importing a backup will overwrite all current rounds, questions, and candidate data.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
