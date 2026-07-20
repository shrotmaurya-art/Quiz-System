/**
 * Shared elapsed-time formatter used by candidate, display, and admin views.
 *
 * @param {number|null|undefined} ms - elapsed milliseconds
 * @returns {string} formatted string like "3.42s", or "—" if null/undefined
 */
export function formatElapsed(ms) {
  if (ms == null) return '—';
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * Status-aware time formatter for the display screen.
 * Returns "No Answer" instead of "—" for null values, matching display convention.
 *
 * @param {number|null|undefined} ms - elapsed milliseconds
 * @returns {string} formatted string like "3.42s", or "No Answer" if null/undefined
 */
export function formatTimeDisplay(ms) {
  if (ms == null) return 'No Answer';
  return (ms / 1000).toFixed(2) + 's';
}
