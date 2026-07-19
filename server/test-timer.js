'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { run, get, all } = require('./src/db/db');
const {
  getGameState, startQuiz, lockAnswer, handleTimeUp, endTimerNow,
  computeWinner, nextQuestion, revealResults, registerOnTimeUp
} = require('./src/sockets/gameEngine');

let pass = 0;
let fail = 0;

function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
}

// ── Snapshot existing data for restore ──
const savedCandidates = all('SELECT * FROM candidates');
const savedRounds = all('SELECT * FROM rounds');
const savedQuestions = all('SELECT * FROM questions');
const savedGameState = get('SELECT * FROM game_state WHERE id = 1');

const { db } = require('./src/db/db');
db.pragma('foreign_keys = OFF');
run('DELETE FROM candidates');
run('DELETE FROM questions');
run('DELETE FROM rounds');
run("UPDATE game_state SET currentRoundId = NULL, currentQuestionId = NULL WHERE id = 1");
db.pragma('foreign_keys = ON');

// ── Seed: 1 candidate, 1 MCQ round with 1 question, 1-second timer, gap=0 ──
const c1 = 'timer-c1';
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c1, 'Timer Candidate', null, 0, 1, 'ttok1']);

const r1 = 'timer-round-1';
const q1 = 'timer-q1';
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [r1, 'Timer Test Round', 1, 'MCQ', 10, 1, 0, 0, 'test']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q1, r1, 1, 'Timer Q?', 'none', null,
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('=== Test 1: Auto-timer fires handleTimeUp after timeLimitSeconds ===');

  resetToIdle();
  let callbackFired = false;
  let callbackState = null;
  registerOnTimeUp((state) => {
    callbackFired = true;
    callbackState = state;
  });

  const start = startQuiz();
  assert('startQuiz succeeds', start.success === true);
  assert('phase is QUESTION_SHOWN', start.state.phase === 'QUESTION_SHOWN');
  assert('timeLimitSeconds is 1', start.state.timeLimitSeconds === 1);

  const stateBefore = getGameState();
  assert('phase is QUESTION_SHOWN before timer fires', stateBefore.phase === 'QUESTION_SHOWN');

  console.log('  Waiting 1.5s for auto-timer...');
  await sleep(1500);

  const stateAfter = getGameState();
  assert('phase changed after timer elapsed', stateAfter.phase !== 'QUESTION_SHOWN');
  assert('phase is RESULTS (gap disabled, MCQ)', stateAfter.phase === 'RESULTS');
  assert('onTimeUp callback fired', callbackFired === true);
  assert('callback received valid state', callbackState !== null && callbackState.phase === 'RESULTS');

  console.log('\n=== Test 2: endTimerNow() early — original setTimeout must NOT double-fire ===');

  resetToIdle();
  callbackFired = false;
  callbackState = null;

  const start2 = startQuiz();
  assert('startQuiz succeeds (round 2)', start2.success === true);
  assert('phase is QUESTION_SHOWN (round 2)', start2.state.phase === 'QUESTION_SHOWN');

  console.log('  Calling endTimerNow() at ~200ms...');
  await sleep(200);
  const earlyResult = endTimerNow();
  assert('endTimerNow returns success', earlyResult.success === true);
  assert('phase changed immediately', earlyResult.state.phase !== 'QUESTION_SHOWN');
  assert('phase is RESULTS after early end', earlyResult.state.phase === 'RESULTS');

  const stateAfterEarly = getGameState();
  assert('DB confirms phase is RESULTS', stateAfterEarly.phase === 'RESULTS');

  console.log('  Waiting another 1.5s to confirm no double-fire...');
  await sleep(1500);

  const stateAfterWait = getGameState();
  assert('phase still RESULTS (no double-fire)', stateAfterWait.phase === 'RESULTS');

  let doubleFireDetected = false;
  registerOnTimeUp(() => { doubleFireDetected = true; });
  await sleep(300);
  assert('onTimeUp callback NOT fired a second time', doubleFireDetected === false);

  console.log('\n=== Test 3: nextQuestion() also schedules auto-timer ===');

  resetToIdle();
  // Need 2 questions for nextQuestion to work
  const q2 = 'timer-q2';
  run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [q2, r1, 2, 'Second Q?', 'none', null,
     JSON.stringify([{ key: 'A', text: 'X' }, { key: 'B', text: 'Y' }]),
     'A', null, null, null, null]);

  callbackFired = false;
  registerOnTimeUp(() => { callbackFired = true; });

  startQuiz();
  // Move to RESULTS to allow nextQuestion
  endTimerNow();
  const nextRes = nextQuestion();
  assert('nextQuestion succeeds', nextRes.success === true);
  assert('phase is QUESTION_SHOWN for Q2', nextRes.state.phase === 'QUESTION_SHOWN');

  console.log('  Waiting 1.5s for auto-timer on Q2...');
  await sleep(1500);

  const stateQ2 = getGameState();
  assert('Q2 auto-timer fired → RESULTS', stateQ2.phase === 'RESULTS');
  assert('onTimeUp callback fired for Q2', callbackFired === true);

  db.pragma('foreign_keys = OFF');
  run("UPDATE game_state SET currentQuestionId = NULL WHERE id = 1");
  run('DELETE FROM questions WHERE id = ?', [q2]);
  db.pragma('foreign_keys = ON');

  // ── Cleanup ──
  restoreAll();

  // ── Summary ──
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}\n`);
  process.exitCode = fail > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  restoreAll();
  process.exitCode = 1;
});
