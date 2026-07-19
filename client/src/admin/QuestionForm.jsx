import { useState } from 'react';

const DEFAULT_OPTIONS = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

export default function QuestionForm({ question, roundId, rounds, onSave, onCancel }) {
  const round = rounds.find((r) => r.id === roundId);
  const isMCQ = round?.answerMode === 'MCQ';

  const [form, setForm] = useState(() => {
    if (question) {
      return {
        text: question.text,
        mediaType: question.mediaType || 'none',
        media: null,
        options: question.options?.length ? question.options : DEFAULT_OPTIONS,
        correctOptionKey: question.correctOptionKey || '',
        useRoundPoints: question.pointsOverride === null,
        pointsOverride: question.pointsOverride ?? round?.pointsPerQuestion ?? 10,
        useRoundTime: question.timeLimitOverrideSeconds === null,
        timeLimitOverrideSeconds: question.timeLimitOverrideSeconds ?? round?.timeLimitSeconds ?? 30,
        useRoundGap: question.gapEnabledOverride === null,
        gapEnabledOverride: question.gapEnabledOverride ?? round?.gapEnabled ?? false,
        useRoundGapSec: question.gapSecondsOverride === null,
        gapSecondsOverride: question.gapSecondsOverride ?? round?.gapSeconds ?? 5,
      };
    }
    return {
      text: '',
      mediaType: 'none',
      media: null,
      options: DEFAULT_OPTIONS.map((o) => ({ ...o })),
      correctOptionKey: '',
      useRoundPoints: true,
      pointsOverride: round?.pointsPerQuestion ?? 10,
      useRoundTime: true,
      timeLimitOverrideSeconds: round?.timeLimitSeconds ?? 30,
      useRoundGap: true,
      gapEnabledOverride: round?.gapEnabled ?? false,
      useRoundGapSec: true,
      gapSecondsOverride: round?.gapSeconds ?? 5,
    };
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setOption(key, text) {
    set('options', form.options.map((o) => (o.key === key ? { ...o, text } : o)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      roundId,
      text: form.text,
      mediaType: form.mediaType,
      media: form.media,
      options: isMCQ ? form.options : [],
      correctOptionKey: isMCQ ? (form.correctOptionKey || null) : null,
      pointsOverride: form.useRoundPoints ? null : Number(form.pointsOverride),
      timeLimitOverrideSeconds: form.useRoundTime ? null : (form.timeLimitOverrideSeconds === '' ? null : Number(form.timeLimitOverrideSeconds)),
      gapEnabledOverride: form.useRoundGap ? null : form.gapEnabledOverride,
      gapSecondsOverride: form.useRoundGapSec ? null : Number(form.gapSecondsOverride),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="glass-panel rounded-xl w-full max-w-3xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-secondary/50 overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary/30 bg-surface-container/50 flex justify-between items-center">
          <h3 className="font-headline-md text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">edit_square</span>
            {question ? `Edit Question #${question.order}` : 'New Question'}
          </h3>
          <button onClick={onCancel} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[65vh]">
          {/* Question text */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">QUESTION TEXT</label>
            <textarea
              required
              value={form.text}
              onChange={(e) => set('text', e.target.value)}
              rows={3}
              className="w-full bg-surface-container-highest border-b border-tertiary focus:border-secondary focus:ring-0 text-on-surface font-headline-md text-lg p-4 rounded-t resize-none transition-colors focus:gold-glow shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
              placeholder="Enter question..."
            />
          </div>

          {/* Media upload */}
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">MEDIA (OPTIONAL)</label>
            <label className="border-2 border-dashed border-secondary/40 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all cursor-pointer gold-glow">
              <span className="material-symbols-outlined text-3xl text-secondary opacity-80">image</span>
              <p className="font-body-md text-on-surface-variant text-center text-sm">
                {form.media ? form.media.name : 'Click to browse (Optional)'}
              </p>
              <span className="text-xs text-outline">Image or Video</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    set('media', file);
                    set('mediaType', file.type.startsWith('video') ? 'video' : 'image');
                  }
                }}
              />
            </label>
          </div>

          {/* MCQ Options */}
          {isMCQ && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <label className="font-label-caps text-xs text-secondary tracking-widest">MULTIPLE CHOICE OPTIONS</label>
                <span className="text-xs text-outline-variant font-body-md">Mark correct answer</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.options.map((opt) => {
                  const isSelected = form.correctOptionKey === opt.key;
                  return (
                    <div key={opt.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => set('correctOptionKey', isSelected ? '' : opt.key)}
                        className={`shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center font-display-lg text-lg transition-all ${
                          isSelected
                            ? 'bg-secondary text-on-secondary border-secondary shadow-[0_0_12px_rgba(240,192,62,0.6)]'
                            : 'bg-surface-container border-outline/40 text-outline-variant hover:border-secondary/60 hover:text-secondary'
                        }`}
                      >
                        {opt.key}
                      </button>
                      <input
                        value={opt.text}
                        onChange={(e) => setOption(opt.key, e.target.value)}
                        placeholder={`Option ${opt.key}`}
                        className={`w-full bg-surface-container border-b-2 focus:ring-0 text-on-surface font-body-lg p-3 transition-colors ${
                          isSelected
                            ? 'border-b-secondary'
                            : 'border-b-outline/30 focus:border-b-secondary'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meta settings */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
            {/* Points override */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-outline tracking-widest">POINTS</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  disabled={form.useRoundPoints}
                  value={form.useRoundPoints ? (round?.pointsPerQuestion ?? 10) : form.pointsOverride}
                  onChange={(e) => set('pointsOverride', e.target.value)}
                  className="w-24 bg-surface-container border-b border-outline focus:border-secondary focus:ring-0 text-on-surface font-headline-md p-2 rounded-t text-center disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useRoundPoints}
                    onChange={(e) => set('useRoundPoints', e.target.checked)}
                    className="rounded text-secondary focus:ring-secondary bg-surface border-outline"
                  />
                  Use Round Default
                </label>
              </div>
            </div>

            {/* Time limit override */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-outline tracking-widest">TIME LIMIT (SEC)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  disabled={form.useRoundTime}
                  value={form.useRoundTime ? (round?.timeLimitSeconds ?? 30) : form.timeLimitOverrideSeconds}
                  onChange={(e) => set('timeLimitOverrideSeconds', e.target.value)}
                  className="w-24 bg-surface-container border-b border-outline focus:border-secondary focus:ring-0 text-on-surface font-headline-md p-2 rounded-t text-center disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useRoundTime}
                    onChange={(e) => set('useRoundTime', e.target.checked)}
                    className="rounded text-secondary focus:ring-secondary bg-surface border-outline"
                  />
                  Use Round Default
                </label>
              </div>
            </div>

            {/* Gap override */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-outline tracking-widest">GAP ENABLED</label>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={form.useRoundGap}
                    checked={form.useRoundGap ? (round?.gapEnabled ?? false) : form.gapEnabledOverride}
                    onChange={(e) => set('gapEnabledOverride', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container border border-secondary/30 disabled:opacity-50" />
                </label>
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useRoundGap}
                    onChange={(e) => set('useRoundGap', e.target.checked)}
                    className="rounded text-secondary focus:ring-secondary bg-surface border-outline"
                  />
                  Use Round Default
                </label>
              </div>
            </div>

            {/* Gap seconds override */}
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-outline tracking-widest">GAP SECONDS</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  disabled={form.useRoundGapSec}
                  value={form.useRoundGapSec ? (round?.gapSeconds ?? 5) : form.gapSecondsOverride}
                  onChange={(e) => set('gapSecondsOverride', e.target.value)}
                  className="w-24 bg-surface-container border-b border-outline focus:border-secondary focus:ring-0 text-on-surface font-headline-md p-2 rounded-t text-center disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.useRoundGapSec}
                    onChange={(e) => set('useRoundGapSec', e.target.checked)}
                    className="rounded text-secondary focus:ring-secondary bg-surface border-outline"
                  />
                  Use Round Default
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary/30 bg-surface-container-highest flex justify-end gap-4">
          <button onClick={onCancel} className="px-6 py-2 font-label-caps text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            CANCEL
          </button>
          <button onClick={handleSubmit} className="px-8 py-2 font-label-caps text-sm bg-secondary text-on-secondary clip-diamond hover:bg-secondary-fixed transition-colors shadow-[0_0_20px_rgba(240,192,62,0.5)] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">save</span>
            {question ? 'SAVE QUESTION' : 'ADD QUESTION'}
          </button>
        </div>
      </div>
    </div>
  );
}
