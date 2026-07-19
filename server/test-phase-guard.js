'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { io: Client } = require('socket.io-client');
const { all, get, run } = require('./src/db/db');
const { handleAdminLogin } = require('./src/middleware/auth');
const candidatesRouter = require('./src/routes/candidates.routes');
const roundsRouter = require('./src/routes/rounds.routes');
const questionsRouter = require('./src/routes/questions.routes');
const initSockets = require('./src/sockets/index');
const gameEngine = require('./src/sockets/gameEngine');

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
const c1 = 'pg-c1';
const c1Token = 'pg-tok-c1';
const r1 = 'pg-round-1';
const q1 = 'pg-q1';
const q2 = 'pg-q2';

run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c1, 'PG C1', null, 0, 1, c1Token]);
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [r1, 'PG Round', 1, 'MCQ', 10, 30, 0, 0, 'test']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q1, r1, 1, 'Q1?', 'none', null,
   JSON.stringify([{ key: 'A', text: 'Wrong' }, { key: 'B', text: 'Right' }]),
   'B', null, null, null, null]);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q2, r1, 2, 'Q2?', 'none', null,
   JSON.stringify([{ key: 'X', text: 'No' }, { key: 'Y', text: 'Yes' }]),
   'Y', 25, null, null, null]);
run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL,
  timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0,
  locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);

// ── Server ──
const app = express();
app.use(express.json());
app.use(cors());
app.post('/api/admin/login', handleAdminLogin);
app.use('/api/candidates', candidatesRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/questions', questionsRouter);

const server = http.createServer(app);
const PORT = 19876;
server.listen(PORT);
initSockets(server);
const BASE = `http://localhost:${PORT}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitForEvent(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

function emitP(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data, (ack) => resolve(ack));
    setTimeout(() => resolve(null), 2000);
  });
}

function createAndConnect(opts, eventsToListen) {
  return new Promise((resolve, reject) => {
    const client = Client(BASE, {
      query: opts.query || {},
      auth: opts.auth || {},
      reconnection: false,
      forceNew: true,
      autoConnect: false
    });

    const promises = {};
    for (const event of eventsToListen) {
      const p = new Promise((res) => {
        const timer = setTimeout(() => res(null), 5000);
        client.once(event, (data) => { clearTimeout(timer); res(data); });
      });
      promises[event] = p;
    }

    const connectP = new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('connect timeout')), 5000);
      client.on('connect', () => { clearTimeout(t); res(); });
      client.on('connect_error', (err) => { clearTimeout(t); rej(err); });
    });

    client.connect();
    connectP.then(() => resolve({ client, events: promises })).catch(reject);
  });
}

async function getAdminToken() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: process.env.ADMIN_PIN })
  });
  return (await res.json()).token;
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

async function runTests() {
  const adminToken = await getAdminToken();
  assert('admin login ok', typeof adminToken === 'string');

  // ── Start quiz → QUESTION_SHOWN ──
  gameEngine.startQuiz();
  assert('startQuiz → QUESTION_SHOWN', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // ── Connect clients (listen for phase:rejected) ──
  const { client: admin, events: adminEv } = await createAndConnect(
    { auth: { token: adminToken } },
    ['game:state', 'candidates:updated', 'phase:rejected']
  );
  assert('admin connected', admin.connected);

  const { client: cand } = await createAndConnect(
    { query: { candidateId: c1, joinToken: c1Token } },
    ['game:state:public', 'phase:rejected']
  );
  assert('candidate connected', cand.connected);

  // Drain initial events
  await adminEv['game:state'];
  await adminEv['candidates:updated'];

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: QUESTION_SHOWN — out-of-phase sends
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== QUESTION_SHOWN: invalid actions ===');

  // admin:nextQuestion — only valid in RESULTS/IDLE
  const r1 = await emitP(admin, 'admin:nextQuestion', {});
  assert('admin:nextQuestion rejected in QUESTION_SHOWN', r1 && r1.error);
  assert('phase unchanged after rejected nextQ', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // admin:submitJudgement — only valid in JUDGING
  const r2 = await emitP(admin, 'admin:submitJudgement', { candidateId: c1, isCorrect: true });
  assert('admin:submitJudgement rejected in QUESTION_SHOWN', r2 && r2.error);
  assert('phase unchanged after rejected judgement', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // admin:advanceFromGap — only valid in TIME_UP/JUDGING
  const r3 = await emitP(admin, 'admin:advanceFromGap', {});
  assert('admin:advanceFromGap rejected in QUESTION_SHOWN', r3 && r3.error);
  assert('phase unchanged after rejected advanceFromGap', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // admin:adjustScore — always valid (no phase guard) — should succeed
  const r4 = await emitP(admin, 'admin:adjustScore', { candidateId: c1, delta: 1, reason: 'test' });
  assert('admin:adjustScore accepted (no phase guard)', r4 && r4.success === true);
  // Revert score
  await emitP(admin, 'admin:adjustScore', { candidateId: c1, delta: -1, reason: 'test' });

  // candidate:lockAnswer — valid in QUESTION_SHOWN — should succeed
  const r5 = await emitP(cand, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'A' });
  assert('candidate:lockAnswer accepted in QUESTION_SHOWN', r5 && r5.success === true);

  // candidate:lockAnswer again — duplicate rejected
  const r6 = await emitP(cand, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'B' });
  assert('duplicate lockAnswer rejected', r6 && r6.error);

  // GameState integrity check
  const gs1 = gameEngine.getGameState();
  assert('GameState still intact after rejections', gs1.phase === 'QUESTION_SHOWN');
  assert('C1 lock recorded correctly', gs1.locks[c1] && gs1.locks[c1].optionKey === 'A');

  // ═══════════════════════════════════════════════════════════════════════════
  // Move to RESULTS via endTimerNow
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Transition: QUESTION_SHOWN → RESULTS ===');

  const adminEndP = waitForEvent(admin, 'game:state', 3000);
  const endAck = await emitP(admin, 'admin:endTimerNow', {});
  assert('endTimerNow success', endAck && endAck.success === true);
  await adminEndP;
  assert('phase is now RESULTS', gameEngine.getGameState().phase === 'RESULTS');

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: RESULTS — out-of-phase sends
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== RESULTS: invalid actions ===');

  // candidate:lockAnswer — only valid in QUESTION_SHOWN
  const r7 = await emitP(cand, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'B' });
  assert('candidate:lockAnswer rejected in RESULTS', r7 && r7.error);

  // admin:submitJudgement — only valid in JUDGING
  const r8 = await emitP(admin, 'admin:submitJudgement', { candidateId: c1, isCorrect: true });
  assert('admin:submitJudgement rejected in RESULTS', r8 && r8.error);

  // admin:endTimerNow — only valid in QUESTION_SHOWN
  const r9 = await emitP(admin, 'admin:endTimerNow', {});
  assert('admin:endTimerNow rejected in RESULTS', r9 && r9.error);

  // admin:advanceFromGap — only valid in TIME_UP/JUDGING
  const r10 = await emitP(admin, 'admin:advanceFromGap', {});
  assert('admin:advanceFromGap rejected in RESULTS', r10 && r10.error);

  // admin:nextQuestion — valid in RESULTS → should succeed
  const adminQ2P = waitForEvent(admin, 'game:state', 3000);
  const r11 = await emitP(admin, 'admin:nextQuestion', {});
  assert('admin:nextQuestion accepted in RESULTS', r11 && r11.success === true);
  await adminQ2P;
  assert('phase advanced to QUESTION_SHOWN (Q2)', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // GameState integrity
  const gs2 = gameEngine.getGameState();
  assert('GameState intact after RESULTS rejections', gs2.phase === 'QUESTION_SHOWN');
  assert('advanced to Q2 (correctOptionKey=Y question)',
    gs2.currentQuestionId === q2);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE: QUESTION_SHOWN (Q2) — endTimerNow → auto-resolve MCQ → RESULTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Transition: Q2 QUESTION_SHOWN → RESULTS ===');

  // Lock C1 with correct answer for Q2
  await emitP(cand, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'Y' });

  const adminEnd2P = waitForEvent(admin, 'game:state', 3000);
  await emitP(admin, 'admin:endTimerNow', {});
  await adminEnd2P;
  assert('Q2 ended → RESULTS', gameEngine.getGameState().phase === 'RESULTS');

  // Verify scoring happened (Q2 has pointsOverride=25)
  const c1Score = get('SELECT score FROM candidates WHERE id = ?', [c1]);
  assert('C1 scored 25 points for Q2 correct answer', c1Score.score === 25);

  // ═══════════════════════════════════════════════════════════════════════════
  // Rapid-fire: 3 invalid sends in sequence, no crash
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== Rapid-fire invalid sends ===');

  const p1 = emitP(admin, 'admin:submitJudgement', { candidateId: c1, isCorrect: true });
  const p2 = emitP(admin, 'admin:endTimerNow', {});
  const p3 = emitP(cand, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'Y' });
  const results = await Promise.all([p1, p2, p3]);

  assert('rapid submitJudgement rejected', results[0] && results[0].error);
  assert('rapid endTimerNow rejected', results[1] && results[1].error);
  assert('rapid lockAnswer rejected', results[2] && results[2].error);
  assert('server still alive after rapid-fire', gameEngine.getGameState() !== null);
  assert('GameState still RESULTS', gameEngine.getGameState().phase === 'RESULTS');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  admin.disconnect();
  cand.disconnect();
  server.close();
  restoreAll();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}\n`);
  process.exitCode = fail > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('Test error:', err);
  server.close();
  restoreAll();
  process.exitCode = 1;
});
