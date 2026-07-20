/**
 * StatusBadge — reusable visual badge for question result statuses.
 *
 * Used by candidate ResultsView, display ResultsView, and admin LiveControl
 * to render a consistent status indicator with icon + label.
 *
 * @param {string} status - one of 'correct', 'incorrect', 'no_answer', 'not_judged'
 * @param {object} [opts]
 * @param {string} [opts.size] - 'sm' (inline) | 'md' (default) | 'lg' (hero)
 * @param {boolean} [opts.showIcon] - whether to show the material icon (default true)
 */
const STATUS_CONFIG = {
  correct: {
    label: 'CORRECT',
    icon: 'check_circle',
    color: 'text-tertiary',
    bgColor: 'bg-tertiary/10',
    borderColor: 'border-tertiary/30',
  },
  incorrect: {
    label: 'INCORRECT',
    icon: 'cancel',
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-error/30',
  },
  no_answer: {
    label: 'NO ANSWER',
    icon: 'do_not_disturb',
    color: 'text-on-surface-variant',
    bgColor: 'bg-surface-container-highest/50',
    borderColor: 'border-outline/30',
  },
  not_judged: {
    label: 'NOT JUDGED',
    icon: 'help',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
    borderColor: 'border-secondary/30',
  },
};

export default function StatusBadge({ status, size = 'md', showIcon = true }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.no_answer;

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${config.borderColor} ${config.bgColor}`}>
        {showIcon && (
          <span
            className={`material-symbols-outlined text-[32px] ${config.color}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {config.icon}
          </span>
        )}
        <span className={`font-label-caps text-label-caps tracking-[0.2em] ${config.color}`}>
          {config.label}
        </span>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 font-label-caps text-[10px] tracking-[0.15em] ${config.color}`}>
        {showIcon && (
          <span
            className="material-symbols-outlined text-[12px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {config.icon}
          </span>
        )}
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-label-caps text-xs tracking-[0.15em] ${config.color}`}>
      {showIcon && (
        <span
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {config.icon}
        </span>
      )}
      {config.label}
    </span>
  );
}
