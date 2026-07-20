import { useState } from 'react';
import { motion } from 'framer-motion';

const DEFAULTS = {
  name: '',
  order: 1,
  answerMode: 'MCQ',
  pointsPerQuestion: 10,
  timeLimitSeconds: 30,
  gapEnabled: false,
  gapSeconds: 5,
  instructions: '',
};

export default function RoundForm({ round, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    round
      ? {
          name: round.name,
          order: round.order,
          answerMode: round.answerMode,
          pointsPerQuestion: round.pointsPerQuestion,
          timeLimitSeconds: round.timeLimitSeconds ?? '',
          gapEnabled: round.gapEnabled ?? false,
          gapSeconds: round.gapSeconds ?? 5,
          instructions: round.instructions ?? '',
        }
      : { ...DEFAULTS }
  );

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      timeLimitSeconds: form.timeLimitSeconds === '' ? null : Number(form.timeLimitSeconds),
      gapSeconds: Number(form.gapSeconds),
      pointsPerQuestion: Number(form.pointsPerQuestion),
      order: Number(form.order),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="glass-panel rounded-xl w-full max-w-2xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-secondary/50 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-secondary/30 bg-surface-container/50 flex justify-between items-center">
          <h3 className="font-headline-md text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">edit_square</span>
            {round ? 'Edit Round' : 'New Round'}
          </h3>
          <button onClick={onCancel} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">ROUND NAME</label>
            <input
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-surface-container-highest border-b border-tertiary focus:border-secondary focus:ring-0 text-on-surface font-headline-md text-xl p-3 rounded-t transition-colors"
              placeholder="e.g. General Knowledge"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-secondary tracking-widest">ANSWER MODE</label>
              <select
                value={form.answerMode}
                onChange={(e) => set('answerMode', e.target.value)}
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0"
              >
                <option value="MCQ">MCQ</option>
                <option value="OPEN">OPEN</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-secondary tracking-widest">ORDER</label>
              <input
                type="number"
                min="1"
                value={form.order}
                onChange={(e) => set('order', e.target.value)}
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-secondary tracking-widest">POINTS PER QUESTION</label>
              <input
                type="number"
                min="0"
                value={form.pointsPerQuestion}
                onChange={(e) => set('pointsPerQuestion', e.target.value)}
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-secondary tracking-widest">TIME LIMIT (SEC)</label>
              <input
                type="number"
                min="0"
                value={form.timeLimitSeconds}
                onChange={(e) => set('timeLimitSeconds', e.target.value)}
                placeholder="Use global default"
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-surface-container-highest/30 rounded border border-outline-variant/30">
              <div>
                <label className="font-label-caps text-xs text-on-surface block">Gap Enabled</label>
                <span className="text-xs text-on-surface-variant">Pause between stages</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.gapEnabled}
                  onChange={(e) => set('gapEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container border border-secondary/30" />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-xs text-secondary tracking-widest">GAP SECONDS</label>
              <input
                type="number"
                min="0"
                value={form.gapSeconds}
                onChange={(e) => set('gapSeconds', e.target.value)}
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">INSTRUCTIONS</label>
            <textarea
              value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              rows={2}
              className="bg-surface-container-highest border border-outline/30 text-on-surface p-3 rounded focus:border-secondary focus:ring-0 resize-none"
              placeholder="Optional instructions shown to candidates"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-secondary/30 bg-surface-container-highest flex justify-end gap-4">
          <button onClick={onCancel} className="px-6 py-2 font-label-caps text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            CANCEL
          </button>
          <button onClick={handleSubmit} className="px-8 py-2 font-label-caps text-sm bg-secondary text-on-secondary clip-diamond hover:bg-secondary-fixed transition-colors shadow-[0_0_20px_rgba(240,192,62,0.5)] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">save</span>
            {round ? 'SAVE ROUND' : 'CREATE ROUND'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
