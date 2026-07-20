/**
 * Table-driven tests for the timing-value resolution order (Section 9).
 *
 * Covers resolveTimeLimitSeconds, resolveGapEnabled, and resolveGapSeconds
 * from gameStateStore.js — each with three cases:
 *   1. Question override set → question wins
 *   2. Question null, round set → round wins
 *   3. Question null, round null → GlobalSettings default wins
 *
 * Usage: node server/test/resolution-order.js
 */

'use strict';

const {
  resolveTimeLimitSeconds,
  resolveGapEnabled,
  resolveGapSeconds,
} = require('../src/sockets/gameStateStore');

let pass = 0;
let fail = 0;

function assert(label, expected, actual) {
  const ok = expected === actual;
  if (ok) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.error(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── GlobalSettings fixture (fixed across all cases) ──
const GLOBAL = {
  defaultTimeLimitSeconds: 30,
  defaultGapEnabled: true,
  defaultGapSeconds: 10,
};

// ── Test data: each row is { label, question, round, fn, expected } ──
const cases = [
  // ─── resolveTimeLimitSeconds ───
  {
    label: 'timeLimit: question override wins even if round and global differ',
    question: { timeLimitOverrideSeconds: 45 },
    round:    { timeLimitSeconds: 20 },
    fn: resolveTimeLimitSeconds,
    expected: 45,
  },
  {
    label: 'timeLimit: round value wins when question override is null',
    question: { timeLimitOverrideSeconds: null },
    round:    { timeLimitSeconds: 25 },
    fn: resolveTimeLimitSeconds,
    expected: 25,
  },
  {
    label: 'timeLimit: global default wins when question and round are null',
    question: { timeLimitOverrideSeconds: null },
    round:    { timeLimitSeconds: null },
    fn: resolveTimeLimitSeconds,
    expected: 30,
  },

  // ─── resolveGapEnabled ───
  {
    label: 'gapEnabled: question override wins even if round and global differ',
    question: { gapEnabledOverride: false },
    round:    { gapEnabled: true },
    fn: resolveGapEnabled,
    expected: false,
  },
  {
    label: 'gapEnabled: round value wins when question override is null',
    question: { gapEnabledOverride: null },
    round:    { gapEnabled: false },
    fn: resolveGapEnabled,
    expected: false,
  },
  {
    label: 'gapEnabled: global default wins when question and round are null',
    question: { gapEnabledOverride: null },
    round:    { gapEnabled: null },
    fn: resolveGapEnabled,
    expected: true,
  },

  // ─── resolveGapSeconds ───
  {
    label: 'gapSeconds: question override wins even if round and global differ',
    question: { gapSecondsOverride: 20 },
    round:    { gapSeconds: 5 },
    fn: resolveGapSeconds,
    expected: 20,
  },
  {
    label: 'gapSeconds: round value wins when question override is null',
    question: { gapSecondsOverride: null },
    round:    { gapSeconds: 7 },
    fn: resolveGapSeconds,
    expected: 7,
  },
  {
    label: 'gapSeconds: global default wins when question and round are null',
    question: { gapSecondsOverride: null },
    round:    { gapSeconds: null },
    fn: resolveGapSeconds,
    expected: 10,
  },
];

// ── Run all cases ──
for (const c of cases) {
  const actual = c.fn(c.question, c.round, GLOBAL);
  assert(c.label, c.expected, actual);
}

// ── Summary ──
console.log(`\n${'='.repeat(60)}`);
console.log(`  RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${'='.repeat(60)}`);
process.exitCode = fail > 0 ? 1 : 0;
