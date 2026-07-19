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

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
}

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

const c1 = 'verify-c1', c1Token = 'tok-c1';
const c2 = 'verify-c2', c2Token = 'tok-c2';
const r1 = 'verify-round', q1 = 'verify-q1';
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)', [c1, 'C1', null, 0, 1, c1Token]);
run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)', [c2, 'C2', null, 0, 1, c2Token]);
// OPEN / Rapid-Fire round: single-button lock flow (no options, no correctOptionKey)
run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [r1, 'Verify-OPEN', 1, 'OPEN', 10, 30, 0, 0, 't']);
run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [q1, r1, 1, 'Q?', 'none', null, JSON.stringify([]), null, null, null, null, null]);
run(`UPDATE game_state SET phase = 'IDLE', currentRoundId = ?, currentQuestionId = NULL, timerStartedAt = NULL, timeLimitSeconds = 30, gapEnabled = 0, gapSeconds = 0, locks = '{}', judgements = '{}', winnerCandidateId = NULL, resultsRevealed = 0 WHERE id = 1`, [r1]);

const app = express();
app.use(express.json());
app.use(cors());
app.post('/api/admin/login', handleAdminLogin);
app.use('/api/candidates', candidatesRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/questions', questionsRouter);
const server = http.createServer(app);
const PORT = 19878;
server.listen(PORT);
initSockets(server);
const BASE = 'http://localhost:' + PORT;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function emitP(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data, (ack) => resolve(ack));
    setTimeout(() => resolve(null), 2000);
  });
}
function connect(query, auth) {
  return new Promise((resolve, reject) => {
    const c = Client(BASE, { query: query || {}, auth: auth || {}, reconnection: false, forceNew: true, autoConnect: false });
    const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
    c.on('connect', () => { clearTimeout(t); resolve(c); });
    c.on('connect_error', (e) => { clearTimeout(t); reject(e); });
    c.connect();
  });
}
async function getAdminToken() {
  const res = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: process.env.ADMIN_PIN }) });
  return (await res.json()).token;
}
function restoreAll() {
  db.pragma('foreign_keys = OFF');
  run('DELETE FROM candidates'); run('DELETE FROM questions'); run('DELETE FROM rounds'); run('DELETE FROM score_log');
  for (const c of savedCandidates) run('INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)', [c.id, c.name, c.logoUrl, c.score, c.isActive, c.joinToken]);
  for (const r of savedRounds) run('INSERT INTO rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds, gapEnabled, gapSeconds, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [r.id, r.name, r.order, r.answerMode, r.pointsPerQuestion, r.timeLimitSeconds, r.gapEnabled, r.gapSeconds, r.instructions]);
  for (const q of savedQuestions) run('INSERT INTO questions (id, roundId, "order", text, mediaType, mediaUrl, options, correctOptionKey, pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [q.id, q.roundId, q.order, q.text, q.mediaType, q.mediaUrl, q.options, q.correctOptionKey, q.pointsOverride, q.timeLimitOverrideSeconds, q.gapEnabledOverride, q.gapSecondsOverride]);
  run(`UPDATE game_state SET phase = ?, currentRoundId = ?, currentQuestionId = ?, timerStartedAt = ?, timeLimitSeconds = ?, gapEnabled = ?, gapSeconds = ?, locks = ?, judgements = ?, winnerCandidateId = ?, resultsRevealed = ? WHERE id = 1`, [savedGameState.phase, savedGameState.currentRoundId, savedGameState.currentQuestionId, savedGameState.timerStartedAt, savedGameState.timeLimitSeconds, savedGameState.gapEnabled, savedGameState.gapSeconds, savedGameState.locks, savedGameState.judgements, savedGameState.winnerCandidateId, savedGameState.resultsRevealed]);
  db.pragma('foreign_keys = ON');
}

async function runTests() {
  const adminToken = await getAdminToken();
  const adminClient = await connect(null, { token: adminToken });
  const c1Client = await connect({ candidateId: c1, joinToken: c1Token });
  const c2Client = await connect({ candidateId: c2, joinToken: c2Token });

  const c2Timers = [];
  c2Client.on('timer:tick', (t) => c2Timers.push(t.remainingSeconds));
  const c2States = [];
  c2Client.on('game:state:public', (s) => c2States.push(s));
  let c1GotLocked = false;
  c1Client.on('candidate:locked', () => { c1GotLocked = true; });
  let c2GotLocked = false;
  c2Client.on('candidate:locked', () => { c2GotLocked = true; });

  // Start the quiz through the admin socket event so the server's timer
  // broadcast interval (startQuestionTick) actually runs and emits timer:tick.
  const firstTickP = new Promise(res => {
    c2Client.once('timer:tick', (t) => res(t.remainingSeconds));
  });
  const startAck = await emitP(adminClient, 'admin:startQuiz', {});
  assert('admin:startQuiz success', startAck && startAck.success === true);
  const startState = gameEngine.getGameState();
  assert('startQuiz -> QUESTION_SHOWN (OPEN round)', startState.phase === 'QUESTION_SHOWN');
  await firstTickP; // ensures at least one timer tick flowed before we proceed
  await sleep(1200);

  // Single-button flow: c1 taps "Lock My Answer" — emits candidate:lockAnswer
  // with NO optionKey (OPEN rounds have no preset options).
  const lockAck = await emitP(c1Client, 'candidate:lockAnswer', { candidateId: c1 });
  assert('c1 single-button lockAnswer success', lockAck && lockAck.success === true);
  await sleep(1200);

  const state = gameEngine.getGameState();
  assert('phase still QUESTION_SHOWN after c1 lock', state.phase === 'QUESTION_SHOWN');

  // The lock for c1 on an OPEN round must NOT carry an optionKey server-side.
  assert('c1 lock recorded server-side with no optionKey', state.locks[c1] && state.locks[c1].answered === true && state.locks[c1].optionKey === null);

  const lastBefore = c2Timers[0];
  const lastAfter = c2Timers[c2Timers.length - 1];
  assert('c2 received timer ticks', c2Timers.length >= 2);
  assert('c2 timer did NOT jump to 0 on c1 lock (last=' + lastAfter + ')', lastAfter > 0 && lastAfter < lastBefore);

  const c2Latest = c2States[c2States.length - 1];
  const c1Lock = c2Latest.locks[c1];
  assert('c2 sees c1.answered=true', c1Lock && c1Lock.answered === true);
  assert('c2 sees c1 has no optionKey (OPEN redacted)', c1Lock && c1Lock.optionKey === undefined);
  const c2LockSelf = c2Latest.locks[c2];
  assert('c2 sees own answered=false', c2LockSelf && c2LockSelf.answered === false);

  // Neither candidate should receive a candidate:locked event (that event is
  // admin/display only; candidates must not get it and must not be affected).
  assert('c1 did NOT receive candidate:locked', c1GotLocked === false);
  assert('c2 did NOT receive candidate:locked', c2GotLocked === false);

  adminClient.disconnect();
  c1Client.disconnect();
  c2Client.disconnect();
  server.close();
  restoreAll();

  console.log('');
  console.log('Results: ' + pass + ' passed, ' + fail + ' failed out of ' + (pass + fail));
  process.exitCode = fail > 0 ? 1 : 0;
}

runTests().catch(err => { console.error('Test error:', err); server.close(); restoreAll(); process.exitCode = 1; });