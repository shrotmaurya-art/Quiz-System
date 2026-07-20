/**
 * Verification for candidate tablet network-drop / reconnect / server-restart resilience.
 *
 * Test scenarios:
 *   1. Starts a match with 4 candidate clients.
 *   2. Simulates a Wi-Fi drop on Alice's client by disconnecting and reconnecting.
 *      Verify she resyncs correctly (including remaining timer and lock status).
 *   3. Alice locks in. Wi-Fi drops again. Verify she resyncs as "already locked".
 *   4. Server crashes (killed) mid-timer. Sockets attempt reconnecting and experience
 *      transport errors (e.g. connection refused). Verify they ignore transport errors and do not fail auth.
 *   5. Modifies DB game_state to simulate 5 seconds elapsed out of 10.
 *   6. Restarts server. Candidates reconnect. Verify they receive the resumed
 *      state with the correct matchId, Alice is still locked, and remaining timer is ~5s.
 *
 * Usage: node server/test/verify-candidate-reconnect-robustness.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');
const Database = require('better-sqlite3');

const SERVER_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite');
const PORT = process.env.PORT || 3993;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0, fail = 0;
const assert = (l, c) => { if (c) { pass++; console.log(`  PASS  ${l}`); } else { fail++; console.error(`  FAIL  ${l}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeCandidate(candId, token) {
  const store = { state: null, tick: null, connected: false, connectErrors: [] };
  const c = Client(BASE, {
    query: { role: 'candidate', candidateId: candId, joinToken: token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 1000,
    autoConnect: false,
  });
  c.on('game:state:public', (s) => { store.state = s; });
  c.on('timer:tick', (t) => { store.tick = t; });
  c.on('connect', () => { store.connected = true; });
  c.on('disconnect', () => { store.connected = false; });
  c.on('connect_error', (err) => { store.connectErrors.push(err); });
  c.connect();
  return { c, store, candId };
}

const waitState = async (store, condition = (s) => !!s, timeout = 8000) => {
  const t0 = Date.now();
  while ((!store.state || !condition(store.state)) && Date.now() - t0 < timeout) await sleep(50);
  if (!store.state || !condition(store.state)) throw new Error('timeout waiting for game:state:public');
  return store.state;
};

const waitTick = async (store, timeout = 8000) => {
  const t0 = Date.now();
  while (!store.tick && Date.now() - t0 < timeout) await sleep(50);
  if (!store.tick) throw new Error('timeout waiting for timer:tick');
  return store.tick;
};

function spawnServer() {
  const server = spawn('node', ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, ADMIN_PIN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server-err] ${d}`));
  return server;
}

async function waitForServerReady() {
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
  throw new Error('Server never became ready');
}

async function killServer(server) {
  return new Promise((resolve) => {
    server.on('exit', resolve);
    server.kill('SIGTERM');
    setTimeout(() => { try { server.kill('SIGKILL'); } catch (_) {} }, 3000);
  });
}

// ── Seed document ──
const CANDIDATES = [
  { id: 'rob-alice',   name: 'Alice',   joinToken: 'rob-tok-alice' },
  { id: 'rob-bob',     name: 'Bob',     joinToken: 'rob-tok-bob' },
  { id: 'rob-charlie', name: 'Charlie', joinToken: 'rob-tok-charlie' },
  { id: 'rob-dana',    name: 'Dana',    joinToken: 'rob-tok-dana' },
];
const MATCH_ID = 'rob-match-1';

const SEED_DOCUMENT = {
  matches: [
    { id: MATCH_ID, name: 'Robustness Match', order: 1, candidateIds: CANDIDATES.map(c => c.id), status: 'not_started' },
  ],
  match_scores: CANDIDATES.map(c => ({ matchId: MATCH_ID, candidateId: c.id, score: 0 })),
  rounds: [
    {
      id: 'rob-r1', name: 'R1', order: 1, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 10, gapEnabled: 0, gapSeconds: 0,
      instructions: 'Robustness Round', matchId: MATCH_ID,
    },
  ],
  questions: [
    {
      id: 'rob-q1', roundId: 'rob-r1', order: 1, text: 'Is this robust?',
      mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Yes' }, { key: 'B', text: 'No' }],
      correctOptionKey: 'A', pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    },
  ],
  candidates: CANDIDATES.map(c => ({ ...c, score: 0, isActive: 1, logoUrl: null })),
};

async function main() {
  console.log('Starting server...');
  let server = spawnServer();

  try {
    await waitForServerReady();
    console.log('Server is up.');

    const adminToken = await fetch(`${BASE}/api/admin/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: ADMIN_PIN }),
    }).then(res => res.json()).then(d => d.token);

    // Seed
    await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(SEED_DOCUMENT),
    });
    console.log('Seed data imported.');

    // Connect 4 candidates
    console.log('Connecting 4 candidates...');
    const clients = CANDIDATES.map(c => makeCandidate(c.id, c.joinToken));
    for (const cl of clients) {
      await waitState(cl.store);
    }
    console.log('All 4 candidates connected.');

    // Connect Admin
    const admin = Client(BASE, { query: { role: 'admin', adminToken }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));

    // Start match
    await new Promise((res, rej) => admin.emit('admin:startMatch', { matchId: MATCH_ID }, (a) => (a && a.error ? rej(new Error(a.error)) : res(a))));
    console.log('Match started.');

    // ── Scenario 1: Wi-Fi drop on Alice (not locked in yet) ──
    console.log('\n--- Scenario 1: Wi-Fi drop on Alice (not locked in) ---');
    const alice = clients[0];
    assert('Alice is connected', alice.store.connected);
    
    // Simulate drop
    alice.c.disconnect();
    await sleep(2000);
    assert('Alice is disconnected', !alice.store.connected);

    // Reconnect
    alice.c.connect();
    await waitState(alice.store, (s) => s.phase === 'QUESTION_SHOWN');
    assert('Alice resynced successfully', alice.store.state.phase === 'QUESTION_SHOWN');
    assert('Alice correct matchId resynced', alice.store.state.matchId === MATCH_ID);

    // ── Scenario 2: Alice locks in, Wi-Fi drops, reconnects as locked in ──
    console.log('\n--- Scenario 2: Alice locks in and drops Wi-Fi ---');
    await new Promise((res, rej) => alice.c.emit('candidate:lockAnswer', { candidateId: 'rob-alice', optionKey: 'A' }, (ack) => (ack && ack.error ? rej(new Error(ack.error)) : res(ack))));
    await waitState(alice.store, (s) => s.locks['rob-alice'].answered === true);
    assert('Alice is marked answered on server', alice.store.state.locks['rob-alice'].answered === true);

    alice.c.disconnect();
    await sleep(2000);
    alice.c.connect();
    await waitState(alice.store, (s) => s.locks['rob-alice'].answered === true);
    assert('Alice resynced as locked-in', alice.store.state.locks['rob-alice'].answered === true);

    // ── Scenario 3: Server crash recovery (mid-timer) ──
    console.log('\n--- Scenario 3: Server crash recovery mid-timer ---');
    // Disconnect admin
    admin.disconnect();

    // Kill server
    console.log('Killing server...');
    await killServer(server);
    console.log('Server is down.');

    // Verify candidates detect disconnect and attempt reconnection (which produces transport errors)
    await sleep(1000);
    for (const cl of clients) {
      assert('Candidate is disconnected', !cl.store.connected);
    }

    // Direct DB update: mock crash mid-timer (5 seconds elapsed out of 10)
    console.log('Updating DB to mock crash mid-timer...');
    const db = new Database(DB_PATH);
    const mockStartedAt = Date.now() - 5000;
    db.prepare("UPDATE game_state SET timerStartedAt = ?, gapStartedAt = NULL, phase = 'QUESTION_SHOWN', resultsRevealed = 0 WHERE id = 1").run(mockStartedAt);
    db.close();

    // Clear client store states and ticks so we don't read stale values
    for (const cl of clients) {
      cl.store.state = null;
      cl.store.tick = null;
    }

    // Restart server
    console.log('Restarting server...');
    server = spawnServer();
    await waitForServerReady();
    console.log('Server is back up.');

    // Wait for clients to automatically reconnect and resync
    console.log('Waiting for candidates to automatically reconnect and resync...');
    for (const cl of clients) {
      // Wait for socket-level connection
      const t0 = Date.now();
      while (!cl.c.connected && Date.now() - t0 < 10000) await sleep(50);
      
      assert(`Candidate ${cl.candId} reconnected`, cl.c.connected);

      // Wait for fresh state update
      await waitState(cl.store, (s) => s.phase === 'QUESTION_SHOWN');
      assert(`Candidate ${cl.candId} got correct matchId`, cl.store.state.matchId === MATCH_ID);
      assert(`Candidate ${cl.candId} got correct Alice lock status`, cl.store.state.locks['rob-alice'].answered === true);
    }

    // Verify remaining timer is ~5 seconds (not full 10s)
    const aliceTick = await waitTick(alice.store);
    console.log(`Resumed timer remaining seconds: ${aliceTick.remainingSeconds}`);
    assert('Resumed timer is between 1 and 6 seconds', aliceTick.remainingSeconds >= 1 && aliceTick.remainingSeconds <= 6);

    // Verify client connection error logs didn't cause permanent lockouts
    // If transport error was ignored, Alice's errors list should contain transport errors but she successfully reconnected.
    console.log(`Alice connection errors registered: ${alice.store.connectErrors.length}`);
    assert('Alice registered connection errors during downtime', alice.store.connectErrors.length > 0);

    // Clean up
    for (const cl of clients) {
      cl.c.disconnect();
    }
  } finally {
    await killServer(server);
    console.log('Server cleaned up.');
  }

  console.log(`\n${'='.repeat(50)}\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}\n${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
