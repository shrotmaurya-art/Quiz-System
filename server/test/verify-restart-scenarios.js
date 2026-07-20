/**
 * Phase 8: Server restart scenario verification.
 *
 * Scenarios:
 *   1. Mid-timer short delay (under limit): resumes timer, post-reconnect lock-in scored correctly.
 *   2. Mid-timer long delay (past limit): resolves immediately on boot.
 *   3a. Mid-gap short delay (under limit): resumes gap countdown, then transitions to RESULTS.
 *   3b. Mid-gap long delay (past limit): transitions to RESULTS immediately on boot.
 *   4. Match isolation: second match scores unaffected.
 *
 * Usage: node server/test/verify-restart-scenarios.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');
const Database = require('better-sqlite3');

const SERVER_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite');
const PORT = process.env.PORT || 3991;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0, fail = 0;
const assert = (l, c) => { if (c) { pass++; console.log(`  PASS  ${l}`); } else { fail++; console.error(`  FAIL  ${l}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Helpers ──

function makeCandidate(candId, token) {
  const store = { state: null, tick: null, gapTick: null };
  const c = Client(BASE, {
    query: { role: 'candidate', candidateId: candId, joinToken: token },
    transports: ['websocket'],
    reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 1000,
    autoConnect: false,
  });
  c.on('game:state:public', (s) => { store.state = s; });
  c.on('timer:tick', (t) => { store.tick = t; });
  c.on('gap:tick', (g) => { store.gapTick = g; });
  c.connect();
  return { c, store, candId };
}

const waitConnected = async (cl, timeout = 10000) => {
  const t0 = Date.now();
  while (!cl.c.connected && Date.now() - t0 < timeout) await sleep(50);
  if (!cl.c.connected) throw new Error(`${cl.candId} connect timeout`);
};

const waitState = async (store, cond = () => true, timeout = 10000) => {
  const t0 = Date.now();
  while ((!store.state || !cond(store.state)) && Date.now() - t0 < timeout) await sleep(50);
  if (!store.state || !cond(store.state)) throw new Error('timeout waiting for state');
  return store.state;
};

const waitTick = async (store, timeout = 10000) => {
  const t0 = Date.now();
  while (!store.tick && Date.now() - t0 < timeout) await sleep(50);
  return store.tick;
};

const waitGapTick = async (store, timeout = 10000) => {
  const t0 = Date.now();
  while (!store.gapTick && Date.now() - t0 < timeout) await sleep(50);
  return store.gapTick;
};

function spawnServer() {
  const s = spawn('node', ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, ADMIN_PIN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  s.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
  s.stderr.on('data', (d) => process.stderr.write(`[srv-err] ${d}`));
  return s;
}

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN }),
      });
      if (r.status === 200 || r.status === 401) return;
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('server not ready');
}

async function killSrv(s) {
  return new Promise((res) => {
    s.on('exit', res);
    s.kill('SIGTERM');
    setTimeout(() => { try { s.kill('SIGKILL'); } catch (_) {} }, 3000);
  });
}

async function adminLogin() {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: ADMIN_PIN }),
  });
  return (await r.json()).token;
}

function makeAdmin(token) {
  return new Promise((res, rej) => {
    const a = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    const t = setTimeout(() => rej(new Error('admin connect timeout')), 5000);
    a.on('connect', () => { clearTimeout(t); res(a); });
    a.on('connect_error', (e) => { clearTimeout(t); rej(e); });
  });
}

function emitP(sock, ev, data, timeout = 8000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`emit ${ev} timeout`)), timeout);
    sock.emit(ev, data, (ack) => { clearTimeout(t); res(ack); });
  });
}

// ── Seed ──
const M1 = 'res-m1';
const M2 = 'res-m2';
const CANDS_M1 = [
  { id: 'res-alice', name: 'Alice', joinToken: 'res-tok-alice' },
  { id: 'res-bob',   name: 'Bob',   joinToken: 'res-tok-bob' },
];
const CANDS_M2 = [
  { id: 'res-eva',   name: 'Eva',   joinToken: 'res-tok-eva' },
  { id: 'res-frank', name: 'Frank', joinToken: 'res-tok-frank' },
];

const SEED = {
  matches: [
    { id: M1, name: 'Restart M1', order: 1, candidateIds: CANDS_M1.map(c => c.id), status: 'not_started' },
    { id: M2, name: 'Restart M2', order: 2, candidateIds: CANDS_M2.map(c => c.id), status: 'not_started' },
  ],
  match_scores: [
    ...CANDS_M1.map(c => ({ matchId: M1, candidateId: c.id, score: 0 })),
    ...CANDS_M2.map(c => ({ matchId: M2, candidateId: c.id, score: 0 })),
  ],
  rounds: [
    { id: 'res-r1', name: 'R1-NoGap', order: 1, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 10, gapEnabled: 0, gapSeconds: 0,
      instructions: '', matchId: M1 },
    { id: 'res-r2', name: 'R2-Gap', order: 2, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 10, gapEnabled: 1, gapSeconds: 10,
      instructions: '', matchId: M1 },
  ],
  questions: [
    { id: 'res-q1', roundId: 'res-r1', order: 1, text: 'Q1?', mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Y' }, { key: 'B', text: 'N' }],
      correctOptionKey: 'A', pointsOverride: null, timeLimitOverrideSeconds: null,
      gapEnabledOverride: null, gapSecondsOverride: null },
    { id: 'res-q2', roundId: 'res-r1', order: 2, text: 'Q2?', mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Y' }, { key: 'B', text: 'N' }],
      correctOptionKey: 'A', pointsOverride: null, timeLimitOverrideSeconds: null,
      gapEnabledOverride: null, gapSecondsOverride: null },
    { id: 'res-q3', roundId: 'res-r2', order: 1, text: 'Q3?', mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Y' }, { key: 'B', text: 'N' }],
      correctOptionKey: 'A', pointsOverride: null, timeLimitOverrideSeconds: null,
      gapEnabledOverride: null, gapSecondsOverride: null },
    { id: 'res-q4', roundId: 'res-r2', order: 2, text: 'Q4?', mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Y' }, { key: 'B', text: 'N' }],
      correctOptionKey: 'A', pointsOverride: null, timeLimitOverrideSeconds: null,
      gapEnabledOverride: null, gapSecondsOverride: null },
  ],
  candidates: [
    ...CANDS_M1.map(c => ({ ...c, score: 0, isActive: 1, logoUrl: null })),
    ...CANDS_M2.map(c => ({ ...c, score: 0, isActive: 1, logoUrl: null })),
  ],
};

function getScore(matchId, candId) {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db.prepare("SELECT score FROM match_scores WHERE matchId = ? AND candidateId = ?").get(matchId, candId);
  db.close();
  return row ? row.score : null;
}

// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('=== Phase 8: Server Restart Verification ===\n');
  let server = spawnServer();

  try {
    await waitReady();
    let token = await adminLogin();

    // Seed
    const imp = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(SEED),
    });
    if (!imp.ok) throw new Error('import failed: ' + await imp.text());
    console.log('Seed imported.\n');

    // Connect candidates for M1
    const alice = makeCandidate('res-alice', 'res-tok-alice');
    const bob   = makeCandidate('res-bob',   'res-tok-bob');
    const clients = [alice, bob];
    for (const cl of clients) await waitState(cl.store);

    // Start match
    let admin = await makeAdmin(token);
    await emitP(admin, 'admin:startMatch', { matchId: M1 });
    await waitState(alice.store, s => s.phase === 'QUESTION_SHOWN');
    console.log('Match 1 started on Q1.\n');

    // ═════════════════════════════════════════════════════════════════════
    // SCENARIO 1: Short delay under timer limit
    // ═════════════════════════════════════════════════════════════════════
    console.log('--- Scenario 1: Short delay under timer (10s limit) ---');

    // Alice locks correct at ~1s
    await sleep(1000);
    await emitP(alice.c, 'candidate:lockAnswer', { candidateId: 'res-alice', optionKey: 'A' });
    console.log('  Alice locked A (correct) at ~1s.');

    // Kill at ~2s
    await sleep(1000);
    admin.disconnect();
    await killSrv(server);
    console.log('  Server killed at ~2s.');

    // Tamper DB: set timerStartedAt to 4s ago (simulating 4s elapsed)
    let db = new Database(DB_PATH);
    db.prepare("UPDATE game_state SET timerStartedAt = ? WHERE id = 1").run(Date.now() - 4000);
    db.close();

    // Clear client stores
    for (const cl of clients) { cl.store.state = null; cl.store.tick = null; }

    // Restart
    server = spawnServer();
    await waitReady();
    console.log('  Server restarted (4s elapsed, ~6s remaining).');

    // Wait for candidates to reconnect and get state
    for (const cl of clients) {
      await waitConnected(cl);
      await waitState(cl.store, s => s.phase === 'QUESTION_SHOWN');
    }

    // Assert resumed timer remaining
    const tick1 = await waitTick(alice.store);
    console.log(`  Resumed timer:tick remaining = ${tick1.remainingSeconds}s`);
    assert('S1: Resumed timer is 4-7s (not full 10)', tick1.remainingSeconds >= 4 && tick1.remainingSeconds <= 7);

    // Bob locks correct post-reconnect (during the resumed window)
    await emitP(bob.c, 'candidate:lockAnswer', { candidateId: 'res-bob', optionKey: 'A' });
    console.log('  Bob locked A (correct) post-reconnect.');

    // Wait for timer to expire
    await sleep(7000);

    assert('S1: Alice 10pts (faster lock)', getScore(M1, 'res-alice') === 10);
    assert('S1: Bob 0pts (slower lock)',    getScore(M1, 'res-bob') === 0);
    console.log(`  Scores — Alice: ${getScore(M1, 'res-alice')}, Bob: ${getScore(M1, 'res-bob')}`);

    // ═════════════════════════════════════════════════════════════════════
    // SCENARIO 2: Long delay past timer limit
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- Scenario 2: Long delay past timer (10s limit) ---');

    // Re-login after restart, advance to Q2
    token = await adminLogin();
    admin = await makeAdmin(token);
    await emitP(admin, 'admin:nextQuestion', {});
    await waitState(alice.store, s => s.phase === 'QUESTION_SHOWN' && s.currentQuestionId === 'res-q2');
    console.log('  Advanced to Q2.');

    // Alice locks correct at ~1s
    await sleep(1000);
    await emitP(alice.c, 'candidate:lockAnswer', { candidateId: 'res-alice', optionKey: 'A' });
    console.log('  Alice locked A (correct) at ~1s.');

    admin.disconnect();
    await killSrv(server);
    console.log('  Server killed.');

    // Tamper DB: set timerStartedAt to 14s ago (well past 10s limit)
    db = new Database(DB_PATH);
    db.prepare("UPDATE game_state SET timerStartedAt = ? WHERE id = 1").run(Date.now() - 14000);
    db.close();

    for (const cl of clients) { cl.store.state = null; cl.store.tick = null; }

    server = spawnServer();
    await waitReady();
    console.log('  Server restarted (14s elapsed, timer expired during downtime).');

    for (const cl of clients) {
      await waitConnected(cl);
      await waitState(cl.store);
    }

    // Server should have auto-resolved
    assert('S2: Phase is RESULTS (auto-resolved on boot)', alice.store.state.phase === 'RESULTS');
    assert('S2: Alice 20pts total', getScore(M1, 'res-alice') === 20);
    assert('S2: Bob 0pts total',    getScore(M1, 'res-bob') === 0);
    console.log(`  Scores — Alice: ${getScore(M1, 'res-alice')}, Bob: ${getScore(M1, 'res-bob')}`);

    // ═════════════════════════════════════════════════════════════════════
    // SCENARIO 3a: Short delay mid-GAP
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- Scenario 3a: Short delay mid-GAP (10s gap) ---');

    // Advance to Q3 (round with gap enabled, gapSeconds=10)
    token = await adminLogin();
    admin = await makeAdmin(token);
    await emitP(admin, 'admin:nextQuestion', {});
    await waitState(alice.store, s => s.phase === 'QUESTION_SHOWN' && s.currentQuestionId === 'res-q3');
    console.log('  Advanced to Q3 (gap-enabled round).');

    // Alice locks
    await sleep(500);
    await emitP(alice.c, 'candidate:lockAnswer', { candidateId: 'res-alice', optionKey: 'A' });

    // End timer -> enters GAP
    await emitP(admin, 'admin:endTimerNow', {});
    await waitState(alice.store, s => s.phase === 'GAP');
    console.log('  Entered GAP phase.');

    // Kill after 2s in gap
    await sleep(2000);
    admin.disconnect();
    await killSrv(server);
    console.log('  Server killed 2s into GAP.');

    // Tamper DB: set gapStartedAt to 5s ago (5s elapsed of 10s gap)
    db = new Database(DB_PATH);
    db.prepare("UPDATE game_state SET gapStartedAt = ?, timerStartedAt = NULL WHERE id = 1").run(Date.now() - 5000);
    db.close();

    for (const cl of clients) { cl.store.state = null; cl.store.gapTick = null; }

    server = spawnServer();
    await waitReady();
    console.log('  Server restarted (5s gap elapsed, ~5s remaining).');

    for (const cl of clients) {
      await waitConnected(cl);
      await waitState(cl.store, s => s.phase === 'GAP');
    }

    const gapTick = await waitGapTick(alice.store);
    console.log(`  Resumed gap:tick remaining = ${gapTick.remainingSeconds}s`);
    assert('S3a: Resumed gap timer is 3-6s', gapTick.remainingSeconds >= 3 && gapTick.remainingSeconds <= 6);

    // Wait for gap to expire → RESULTS
    await sleep(6000);
    assert('S3a: Phase is RESULTS after gap expired', alice.store.state.phase === 'RESULTS');
    assert('S3a: Alice 30pts total', getScore(M1, 'res-alice') === 30);
    console.log(`  Scores — Alice: ${getScore(M1, 'res-alice')}, Bob: ${getScore(M1, 'res-bob')}`);

    // ═════════════════════════════════════════════════════════════════════
    // SCENARIO 3b: Long delay mid-GAP
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- Scenario 3b: Long delay mid-GAP (10s gap) ---');

    token = await adminLogin();
    admin = await makeAdmin(token);
    await emitP(admin, 'admin:nextQuestion', {});
    await waitState(alice.store, s => s.phase === 'QUESTION_SHOWN' && s.currentQuestionId === 'res-q4');
    console.log('  Advanced to Q4 (gap-enabled round).');

    await sleep(500);
    await emitP(alice.c, 'candidate:lockAnswer', { candidateId: 'res-alice', optionKey: 'A' });

    await emitP(admin, 'admin:endTimerNow', {});
    await waitState(alice.store, s => s.phase === 'GAP');
    console.log('  Entered GAP phase.');

    admin.disconnect();
    await killSrv(server);
    console.log('  Server killed mid-GAP.');

    // Tamper DB: set gapStartedAt to 14s ago (well past 10s)
    db = new Database(DB_PATH);
    db.prepare("UPDATE game_state SET gapStartedAt = ?, timerStartedAt = NULL WHERE id = 1").run(Date.now() - 14000);
    db.close();

    for (const cl of clients) { cl.store.state = null; cl.store.gapTick = null; }

    server = spawnServer();
    await waitReady();
    console.log('  Server restarted (14s gap elapsed, expired during downtime).');

    for (const cl of clients) {
      await waitConnected(cl);
      await waitState(cl.store);
    }

    assert('S3b: Phase is RESULTS (auto-resolved on boot)', alice.store.state.phase === 'RESULTS');
    assert('S3b: Alice 40pts total', getScore(M1, 'res-alice') === 40);
    assert('S3b: Bob 0pts total',    getScore(M1, 'res-bob') === 0);
    console.log(`  Scores — Alice: ${getScore(M1, 'res-alice')}, Bob: ${getScore(M1, 'res-bob')}`);

    // ═════════════════════════════════════════════════════════════════════
    // SCENARIO 4: Match 2 isolation
    // ═════════════════════════════════════════════════════════════════════
    console.log('\n--- Scenario 4: Match 2 isolation ---');
    assert('S4: Eva 0pts (untouched M2)',   getScore(M2, 'res-eva') === 0);
    assert('S4: Frank 0pts (untouched M2)', getScore(M2, 'res-frank') === 0);
    console.log(`  Scores — Eva: ${getScore(M2, 'res-eva')}, Frank: ${getScore(M2, 'res-frank')}`);

    for (const cl of clients) cl.c.disconnect();
  } finally {
    await killSrv(server);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => { console.error('FATAL:', e); process.exitCode = 1; });
