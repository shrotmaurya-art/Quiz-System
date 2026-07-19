'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { run, get, all } = require('./src/db/db');
const {
  getGameState, startQuiz, lockAnswer, handleTimeUp, revealResults,
  computeWinner, endTimerNow, nextQuestion, adjustScoreManually
} = require('./src/sockets/gameEngine');

let pass = 0;
let fail = 0;

function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
}

// ── Snapshot + wipe ──
const savedCandidates = all('SELECT * FROM candidates');
const savedRounds = all('SELECT * FROM rounds');
const savedQuestions = all('SELECT * FROM questions');
const savedGameState = get('SELECT * FROM game_state WHERE id = 1');
const { db } = require('./src/db/db');
db.pragma('foreign_keys = OFF');
run('DELETE FROM candidates');
run('DELETE FROM questions');
run('DELETE FROM rounds');
run('DELETE FROM score_log');
run("UPDATE game_state SET currentRoundId = NULL, currentQuestionId = NULL WHERE id = 1");
db.pragma('foreign_keys = ON');

// ── Seed ──
const c1 = 'sc-c1';
const c2 = 'sc-c2';
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c1, 'Scorer 1', null, 0, 1, 'stok1']);
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c2, 'Scorer 2', null, 0, 1, 'stok2']);

const r1 = 'sc-round-1';
const q1 = 'sc-q1';
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [r1, 'Scoring Round', 1, 'MCQ', 10, 30, 0, 0, 'test']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q1, r1, 1, 'Score Q?', 'none', null,
   JSON.stringify([{ key: 'A', text: 'Wrong' }, { key: 'B', text: 'Right' }]),
   'B', null, null, null, null]);
run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL,
  timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0,
  locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);

function resetToIdle() {
  run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL,
    timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0,
    locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);
}

function restoreAll() {
  db.pragma('foreign_keys = OFF');
  run('DELETE FROM candidates');
  run('DELETE FROM questions');
  run('DELETE FROM rounds');
  run('DELETE FROM score_log');
  for (const c of savedCandidates) {
    run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.name, c.logoUrl, c.score, c.isActive, c.joinToken]);
  }
  for (const r of savedRounds) {
    run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [r.id, r.name, r.order, r.answerMode, r.pointsPerQuestion, r.timeLimitSeconds, r.gapEnabled, r.gapSeconds, r.instructions]);
  }
  for (const q of savedQuestions) {
    run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [q.id, q.roundId, q.order, q.text, q.mediaType, q.mediaUrl, q.options, q.correctOptionKey, q.pointsOverride, q.timeLimitOverrideSeconds, q.gapEnabledOverride, q.gapSecondsOverride]);
  }
  run(`UPDATE game_state SET phase = ?, currentRoundId = ?, currentQuestionId = ?,
    timerStartedAt = ?, timeLimitSeconds = ?, gapEnabled = ?, gapSeconds = ?,
    locks = ?, judgements = ?, winnerCandidateId = ?, resultsRevealed = ? WHERE id = 1`,
    [savedGameState.phase, savedGameState.currentRoundId, savedGameState.currentQuestionId,
     savedGameState.timerStartedAt, savedGameState.timeLimitSeconds, savedGameState.gapEnabled,
     savedGameState.gapSeconds, savedGameState.locks, savedGameState.judgements,
     savedGameState.winnerCandidateId, savedGameState.resultsRevealed]);
  db.pragma('foreign_keys = ON');
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Test 1: MCQ round, round-level points (10) ──
console.log('=== Test 1: MCQ winner scoring — round pointsPerQuestion ===');

resetToIdle();
const start1 = startQuiz();
assert('startQuiz succeeds', start1.success === true);

// C1 locks wrong, C2 locks correct
lockAnswer(c1, 'A');
run('UPDATE game_state SET timerStartedAt = ? WHERE id = 1', [Date.now() - 500]);
lockAnswer(c2, 'B');

// C1 score before
const c1Before = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2Before = get('SELECT score FROM candidates WHERE id = ?', [c2]);
assert('C1 starts at 0', c1Before.score === 0);
assert('C2 starts at 0', c2Before.score === 0);

// Time up + reveal
handleTimeUp();
const resState = getGameState();
assert('phase is RESULTS', resState.phase === 'RESULTS');
assert('winner is C2', resState.winnerCandidateId === c2);

// Score checks
const c1After = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2After = get('SELECT score FROM candidates WHERE id = ?', [c2]);
assert('C1 score unchanged at 0', c1After.score === 0);
assert('C2 score increased by 10 (round pointsPerQuestion)', c2After.score === 10);

// score_log check
const logRow = get(
  "SELECT * FROM score_log WHERE candidateId = ? AND reason = 'timed_ranking_win' AND questionId = ?",
  [c2, resState.currentQuestionId]
);
assert('score_log row exists for winner', logRow !== undefined && logRow !== null);
assert('score_log pointsChange = 10', logRow.pointsChange === 10);
assert('score_log reason = timed_ranking_win', logRow.reason === 'timed_ranking_win');
assert('score_log candidateId matches winner', logRow.candidateId === c2);

// No spurious log rows for C1
const c1Logs = all("SELECT * FROM score_log WHERE candidateId = ? AND reason = 'timed_ranking_win'", [c1]);
assert('no score_log row for loser', c1Logs.length === 0);

// ── Test 2: Question-level pointsOverride ──
console.log('\n=== Test 2: Question pointsOverride (25) overrides round points (10) ===');

resetToIdle();
// Update q1 to have pointsOverride = 25
run('UPDATE questions SET pointsOverride = 25 WHERE id = ?', [q1]);

const start2 = startQuiz();
assert('startQuiz succeeds', start2.success === true);

// C2 locks wrong, C1 locks correct (flip scenario)
lockAnswer(c2, 'A');
run('UPDATE game_state SET timerStartedAt = ? WHERE id = 1', [Date.now() - 300]);
lockAnswer(c1, 'B');

const c1Before2 = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2Before2 = get('SELECT score FROM candidates WHERE id = ?', [c2]);
assert('C1 still at 0 from prev test (was loser)', c1Before2.score === 0);
assert('C2 still at 10 from prev test (was winner)', c2Before2.score === 10);

handleTimeUp();
const resState2 = getGameState();
assert('winner is C1 this time', resState2.winnerCandidateId === c1);

const c1After2 = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2After2 = get('SELECT score FROM candidates WHERE id = ?', [c2]);
assert('C1 gained 25 (question override)', c1After2.score === 25);
assert('C2 unchanged at 10', c2After2.score === 10);

const logRow2 = get(
  "SELECT * FROM score_log WHERE candidateId = ? AND reason = 'timed_ranking_win' AND questionId = ?",
  [c1, resState2.currentQuestionId]
);
assert('score_log row exists for C1', logRow2 !== undefined && logRow2 !== null);
assert('score_log pointsChange = 25 (override)', logRow2.pointsChange === 25);

// Reset pointsOverride
run('UPDATE questions SET pointsOverride = NULL WHERE id = ?', [q1]);

// ── Test 3: No correct answers → no score changes ──
console.log('\n=== Test 3: No correct answers → no scoring ===');

resetToIdle();
const start3 = startQuiz();
assert('startQuiz succeeds', start3.success === true);

lockAnswer(c1, 'A');
run('UPDATE game_state SET timerStartedAt = ? WHERE id = 1', [Date.now() - 200]);
lockAnswer(c2, 'C');

const c1Before3 = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2Before3 = get('SELECT score FROM candidates WHERE id = ?', [c2]);

handleTimeUp();
const resState3 = getGameState();
assert('no winner', resState3.winnerCandidateId === null);

const c1After3 = get('SELECT score FROM candidates WHERE id = ?', [c1]);
const c2After3 = get('SELECT score FROM candidates WHERE id = ?', [c2]);
assert('C1 score unchanged', c1After3.score === c1Before3.score);
assert('C2 score unchanged', c2After3.score === c2Before3.score);

const anyLogs = all("SELECT * FROM score_log WHERE reason = 'timed_ranking_win'");
assert('no new timed_ranking_win logs', anyLogs.length === 2); // only the 2 from prev tests

// ── Test 4: adjustScoreManually ──
console.log('\n=== Test 4: adjustScoreManually ===');

resetToIdle();
const c1score = get('SELECT score FROM candidates WHERE id = ?', [c1]).score;
const adj = adjustScoreManually(c1, 15, 'manual_adjustment');
assert('adjustScoreManually succeeds', adj.success === true);

const c1Adj = get('SELECT score FROM candidates WHERE id = ?', [c1]);
assert('C1 gained 15 from manual adjust', c1Adj.score === c1score + 15);

const adjLog = get(
  "SELECT * FROM score_log WHERE candidateId = ? AND reason = 'manual_adjustment' ORDER BY timestamp DESC LIMIT 1",
  [c1]
);
assert('manual_adjustment log exists', adjLog !== undefined && adjLog !== null);
assert('manual log pointsChange = 15', adjLog.pointsChange === 15);

// ── Cleanup ──
restoreAll();

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${'='.repeat(50)}\n`);
process.exitCode = fail > 0 ? 1 : 0;
