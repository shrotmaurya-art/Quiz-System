'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { run, get, all, getGlobalSettings } = require('./src/db/db');
const {
  getGameState, startQuiz, lockAnswer, handleTimeUp, computeWinner, revealResults, enterGap
} = require('./src/sockets/gameEngine');

let pass = 0;
let fail = 0;

function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
}

// ── Snapshot existing data so we can restore it after the test ──
const savedCandidates = all('SELECT * FROM candidates');
const savedRounds = all('SELECT * FROM rounds');
const savedQuestions = all('SELECT * FROM questions');
const savedGameState = get('SELECT * FROM game_state WHERE id = 1');

// ── Wipe ALL candidates, rounds, questions so startQuiz picks only our test data ──
// Disable FKs to safely clear across tables
const { db } = require('./src/db/db');
db.pragma('foreign_keys = OFF');
run('DELETE FROM candidates');
run('DELETE FROM questions');
run('DELETE FROM rounds');
run("UPDATE game_state SET currentRoundId = NULL, currentQuestionId = NULL WHERE id = 1");
db.pragma('foreign_keys = ON');

const c1 = 'test-c1';
const c2 = 'test-c2';
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c1, 'Candidate 1', null, 0, 1, 'tok1']);
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c2, 'Candidate 2', null, 0, 1, 'tok2']);

const r1 = 'test-round-1';
const q1 = 'test-q1';
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [r1, 'Test Round', 1, 'MCQ', 10, 30, 0, 0, 'test']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q1, r1, 1, 'What is 2+2?', 'none', null,
   JSON.stringify([{ key: 'A', text: '3' }, { key: 'B', text: '4' }, { key: 'C', text: '5' }]),
   'B', null, null, null, null]);

run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL,
  timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0,
  locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);

// ── Test 1: startQuiz ──
console.log('\n--- startQuiz ---');
const startResult = startQuiz();
assert('startQuiz returns success', startResult.success === true);
assert('phase is QUESTION_SHOWN', startResult.state.phase === 'QUESTION_SHOWN');
assert('both candidates in locks', c1 in startResult.state.locks && c2 in startResult.state.locks);
assert('neither candidate answered yet', !startResult.state.locks[c1].answered && !startResult.state.locks[c2].answered);

// ── Test 2: Two candidates lock different answers ──
console.log('\n--- lockAnswer ---');

// C1 locks 'A' (wrong) at ~200ms
const lock1 = lockAnswer(c1, 'A');
assert('C1 lock returns success', lock1.success === true);
assert('C1 answered = true', lock1.state.locks[c1].answered === true);
assert('C1 optionKey = A', lock1.state.locks[c1].optionKey === 'A');
assert('C1 elapsedMs is a positive number', typeof lock1.state.locks[c1].elapsedMs === 'number' && lock1.state.locks[c1].elapsedMs >= 0);

// Simulate C2 locking later by backdating timerStartedAt
const state = getGameState();
state.timerStartedAt = Date.now() - 500; // pretend timer started 500ms ago
run(`UPDATE game_state SET timerStartedAt = ? WHERE id = 1`, [state.timerStartedAt]);

// C2 locks 'B' (correct)
const lock2 = lockAnswer(c2, 'B');
assert('C2 lock returns success', lock2.success === true);
assert('C2 optionKey = B', lock2.state.locks[c2].optionKey === 'B');
assert('C2 elapsedMs > C1 elapsedMs (simulated delay)',
  lock2.state.locks[c2].elapsedMs > lock1.state.locks[c1].elapsedMs);

// ── Test 3: Duplicate lock rejected ──
console.log('\n--- Duplicate lock rejection ---');
const dupLock = lockAnswer(c1, 'C');
assert('Second lock for same candidate returns error', !!dupLock.error);
assert('Error mentions already locked', dupLock.error.includes('already locked'));

// ── Test 4: handleTimeUp ──
console.log('\n--- handleTimeUp ---');
const timeUp = handleTimeUp();
assert('handleTimeUp returns success', timeUp.success === true);
assert('phase moved past QUESTION_SHOWN', timeUp.state.phase !== 'QUESTION_SHOWN');

// ── Test 5: Lock after timeUp is rejected ──
console.log('\n--- Lock after TIME_UP rejection ---');
// Reset to QUESTION_SHOWN to test this
run(`UPDATE game_state SET phase = 'QUESTION_SHOWN' WHERE id = 1`);
// Now set phase to TIME_UP
run(`UPDATE game_state SET phase = 'TIME_UP' WHERE id = 1`);
const lateLock = lockAnswer(c1, 'C');
assert('Lock after TIME_UP returns error', !!lateLock.error);
assert('Error mentions wrong phase', lateLock.error.includes('QUESTION_SHOWN'));

// ── Test 6: computeWinner picks faster CORRECT, not faster overall ──
console.log('\n--- computeWinner: faster-but-wrong loses ---');
// Reset to proper state for winner computation
run(`UPDATE game_state SET phase = 'RESULTS', timerStartedAt = ? WHERE id = 1`,
  [Date.now() - 1000]);

// C1 locked 'A' (wrong) at ~100ms, C2 locked 'B' (correct) at ~600ms
// C1 is faster but wrong → C2 should win
const gs = getGameState();
gs.locks[c1] = { optionKey: 'A', elapsedMs: 100, answered: true };
gs.locks[c2] = { optionKey: 'B', elapsedMs: 600, answered: true };
gs.phase = 'RESULTS';
run(`UPDATE game_state SET phase = 'RESULTS', locks = ? WHERE id = 1`,
  [JSON.stringify(gs.locks)]);

const winner = computeWinner();
assert('Winner is C2 (slower but correct)', winner === c2);
assert('Winner is NOT C1 (faster but wrong)', winner !== c1);

// ── Test 7: computeWinner when both correct → faster one wins ──
console.log('\n--- computeWinner: both correct → faster wins ---');
gs.locks[c1] = { optionKey: 'B', elapsedMs: 200, answered: true };
gs.locks[c2] = { optionKey: 'B', elapsedMs: 800, answered: true };
run(`UPDATE game_state SET locks = ? WHERE id = 1`,
  [JSON.stringify(gs.locks)]);

const winner2 = computeWinner();
assert('Winner is C1 (faster, both correct)', winner2 === c1);

// ── Test 8: computeWinner when nobody correct → null ──
console.log('\n--- computeWinner: nobody correct → null ---');
gs.locks[c1] = { optionKey: 'A', elapsedMs: 100, answered: true };
gs.locks[c2] = { optionKey: 'C', elapsedMs: 200, answered: true };
run(`UPDATE game_state SET locks = ? WHERE id = 1`,
  [JSON.stringify(gs.locks)]);

const winner3 = computeWinner();
assert('Winner is null when nobody correct', winner3 === null);

// ── Cleanup: restore original data (disable FKs to avoid constraint issues) ──
db.pragma('foreign_keys = OFF');
run('DELETE FROM candidates');
run('DELETE FROM questions');
run('DELETE FROM rounds');
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

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${'='.repeat(50)}\n`);
process.exitCode = fail > 0 ? 1 : 0;
