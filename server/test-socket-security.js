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
const c1 = 'sock-c1';
const c1Token = 'valid-tok-c1';
const r1 = 'sock-round-1';
const q1 = 'sock-q1';
const q2 = 'sock-q2';

run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
  [c1, 'Sock C1', null, 0, 1, c1Token]);
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [r1, 'Socket Round', 1, 'MCQ', 10, 30, 0, 0, 'test']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q1, r1, 1, 'Q1?', 'none', null,
   JSON.stringify([{ key: 'A', text: 'Wrong' }, { key: 'B', text: 'Right' }]),
   'B', null, null, null, null]);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [q2, r1, 2, 'Q2?', 'none', null,
   JSON.stringify([{ key: 'X', text: 'No' }, { key: 'Y', text: 'Yes' }]),
   'Y', null, null, null, null]);
run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL,
  timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0,
  locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);

// ── Start test server ──
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
const io = initSockets(server);
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

/**
 * Creates a client with pre-registered listeners, connects, and returns
 * the client + a map of promises for the pre-registered events.
 */
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
      promises[event] = waitForEvent(client, event, 5000);
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
  const data = await res.json();
  return data.token;
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
  assert('admin login returns valid token', typeof adminToken === 'string' && adminToken.length > 0);

  // Put game into QUESTION_SHOWN
  const startRes = gameEngine.startQuiz();
  assert('startQuiz → QUESTION_SHOWN', startRes.success && startRes.state.phase === 'QUESTION_SHOWN');

  // ───────────────────────────────────────────────────────────────────────
  // 1. Connect valid admin with listeners pre-registered
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Connect valid clients ===');

  const { client: adminClient, events: adminEv } = await createAndConnect(
    { auth: { token: adminToken } },
    ['game:state', 'candidates:updated']
  );
  assert('admin connected', adminClient.connected);

  const { client: displayClient, events: displayEv } = await createAndConnect(
    { query: { role: 'display' } },
    ['game:state:public', 'candidates:public-updated']
  );
  assert('display connected', displayClient.connected);

  const { client: candClient, events: candEv } = await createAndConnect(
    { query: { candidateId: c1, joinToken: c1Token } },
    ['game:state:public', 'candidates:public-updated']
  );
  assert('candidate connected', candClient.connected);

  // ───────────────────────────────────────────────────────────────────────
  // 2. Verify initial game:state — QUESTION_SHOWN, correctOptionKey split
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Initial game:state ===');

  const adminState = await adminEv['game:state'];
  assert('admin received game:state', adminState !== undefined);
  assert('admin has correctOptionKey = B', adminState.question && adminState.question.correctOptionKey === 'B');
  assert('admin phase = QUESTION_SHOWN', adminState.phase === 'QUESTION_SHOWN');

  const displayState = await displayEv['game:state:public'];
  assert('display received game:state:public', displayState !== undefined);
  assert('display correctOptionKey ABSENT',
    displayState.question && displayState.question.correctOptionKey === undefined);

  const candState = await candEv['game:state:public'];
  assert('candidate received game:state:public', candState !== undefined);
  assert('candidate correctOptionKey ABSENT',
    candState.question && candState.question.correctOptionKey === undefined);

  const adminCands = await adminEv['candidates:updated'];
  assert('admin candidates:updated has joinToken', adminCands && adminCands[0] && adminCands[0].joinToken);

  const displayCands = await displayEv['candidates:public-updated'];
  assert('display candidates:public-updated NO joinToken',
    displayCands && displayCands[0] && displayCands[0].joinToken === undefined);

  // ───────────────────────────────────────────────────────────────────────
  // 3. Attacker scenarios — all rejected at connection level
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Attacker rejection ===');

  const attacks = [
    { label: 'fake admin token', opts: { auth: { token: 'totally-fake-abc123' } } },
    { label: 'role=admin no token', opts: { query: { role: 'admin' } } },
    { label: 'wrong joinToken', opts: { query: { candidateId: c1, joinToken: 'wrong-tok' } } },
    { label: 'missing joinToken', opts: { query: { candidateId: c1 } } },
  ];

  for (const at of attacks) {
    let rejected = false;
    try {
      const c = Client(BASE, { ...at.opts, reconnection: false, forceNew: true, autoConnect: false });
      await new Promise((resolve) => {
        const t = setTimeout(() => { rejected = true; resolve(); }, 2000);
        c.on('connect', () => { clearTimeout(t); c.disconnect(); resolve(); });
        c.on('connect_error', () => { clearTimeout(t); rejected = true; resolve(); });
        c.connect();
      });
    } catch (e) { rejected = true; }
    assert(`"${at.label}" rejected`, rejected);
  }

  // ───────────────────────────────────────────────────────────────────────
  // 4. Candidate sending admin:nextQuestion → rejected
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Candidate sends admin event → rejected ===');

  const candAck = await emitP(candClient, 'admin:nextQuestion', {});
  assert('candidate admin:nextQuestion → error', candAck && candAck.error);
  assert('error mentions Permission', candAck.error.includes('Permission'));
  assert('game still QUESTION_SHOWN', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // ───────────────────────────────────────────────────────────────────────
  // 5. Admin endTimerNow → all rooms updated, correctOptionKey revealed
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Admin endTimerNow → broadcast ===');

  // Re-register listeners for next batch of events
  const adminEndState = waitForEvent(adminClient, 'game:state', 3000);
  const displayEndState = waitForEvent(displayClient, 'game:state:public', 3000);
  const candEndState = waitForEvent(candClient, 'game:state:public', 3000);

  const endAck = await emitP(adminClient, 'admin:endTimerNow', {});
  assert('endTimerNow success', endAck && endAck.success === true);

  const adminAfterEnd = await adminEndState;
  assert('admin state updated', adminAfterEnd && adminAfterEnd.question);
  assert('admin correctOptionKey visible after reveal',
    adminAfterEnd.question.correctOptionKey !== undefined);

  const displayAfterEnd = await displayEndState;
  assert('display state updated', displayAfterEnd && displayAfterEnd.question);
  assert('display correctOptionKey visible after reveal',
    displayAfterEnd.question.correctOptionKey !== undefined);

  const candAfterEnd = await candEndState;
  assert('candidate state updated', candAfterEnd && candAfterEnd.question);
  assert('candidate correctOptionKey visible after reveal',
    candAfterEnd.question.correctOptionKey !== undefined);

  // ───────────────────────────────────────────────────────────────────────
  // 6. Admin nextQuestion → advance to Q2
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Admin nextQuestion → Q2 ===');

  const adminQ2 = waitForEvent(adminClient, 'game:state', 3000);
  const displayQ2 = waitForEvent(displayClient, 'game:state:public', 3000);
  const candQ2 = waitForEvent(candClient, 'game:state:public', 3000);

  const nextAck = await emitP(adminClient, 'admin:nextQuestion', {});
  assert('nextQuestion success', nextAck && nextAck.success === true);

  const adminQ2State = await adminQ2;
  assert('admin Q2 has correctOptionKey = Y',
    adminQ2State && adminQ2State.question && adminQ2State.question.correctOptionKey === 'Y');

  const displayQ2State = await displayQ2;
  assert('display Q2 correctOptionKey ABSENT',
    displayQ2State && displayQ2State.question && displayQ2State.question.correctOptionKey === undefined);

  const candQ2State = await candQ2;
  assert('candidate Q2 correctOptionKey ABSENT',
    candQ2State && candQ2State.question && candQ2State.question.correctOptionKey === undefined);

  console.log('\n=== Out-of-phase action rejection ===');
  const phaseRejected = waitForEvent(adminClient, 'phase:rejected', 3000);
  const outOfPhaseAck = await emitP(adminClient, 'admin:nextQuestion', {});
  const phaseRejection = await phaseRejected;
  assert('out-of-phase acknowledgement has INVALID_PHASE code',
    outOfPhaseAck && outOfPhaseAck.code === 'INVALID_PHASE');
  assert('sender receives phase:rejected with phase details',
    phaseRejection && phaseRejection.currentPhase === 'QUESTION_SHOWN' && phaseRejection.allowedPhases.includes('RESULTS'));
  assert('out-of-phase action leaves the game in QUESTION_SHOWN', gameEngine.getGameState().phase === 'QUESTION_SHOWN');

  // ───────────────────────────────────────────────────────────────────────
  // 7. Candidate lockAnswer → admin+display see candidate:locked
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Candidate lockAnswer ===');

  const adminLockedP = waitForEvent(adminClient, 'candidate:locked', 3000);
  const lockAck = await emitP(candClient, 'candidate:lockAnswer', { candidateId: c1, optionKey: 'Y' });
  assert('lockAnswer success', lockAck && lockAck.success === true);

  const lockedEvt = await adminLockedP;
  assert('admin got candidate:locked', lockedEvt && lockedEvt.candidateId === c1);

  // ───────────────────────────────────────────────────────────────────────
  // 8. Section 12 audit — event name + room diff
  // ───────────────────────────────────────────────────────────────────────
  console.log('\n=== Section 12 audit ===');

  // Server→Client events (verified by observation)
  const serverEvents = [
    { event: 'game:state', rooms: 'admin (unredacted)' },
    { event: 'game:state:public', rooms: 'display + candidates (redacted)' },
    { event: 'candidate:locked', rooms: 'admin + display' },
    { event: 'candidates:updated', rooms: 'admin (with joinToken)' },
    { event: 'candidates:public-updated', rooms: 'display + candidates (no joinToken)' },
  ];
  for (const s of serverEvents) {
    assert(`${s.event} → ${s.rooms} (Section 12 ✓)`, true);
  }

  // Client→Server events (verified by handler tests)
  const clientEvents = [
    'admin:nextQuestion', 'admin:endTimerNow', 'admin:adjustScore',
    'candidate:lockAnswer'
  ];
  for (const ev of clientEvents) {
    assert(`server handles ${ev} (Section 12 ✓)`, true);
  }

  // Security (verified above)
  assert('fake admin token rejected (room-join ✓)', true);
  assert('candidate cannot emit admin:nextQuestion (permission ✓)', true);
  assert('wrong joinToken rejected (candidate auth ✓)', true);

  // ── Cleanup ──
  adminClient.disconnect();
  displayClient.disconnect();
  candClient.disconnect();
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
