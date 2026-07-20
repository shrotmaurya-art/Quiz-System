/**
 * Verification script for the Display GAP-state suspense screen (Section 10 / FR25).
 *
 * Self-contained: spawns the dev server, then drives two questions through the
 * real Socket.IO layer and asserts the DISPLAY room's event stream:
 *
 *   Case A (gapEnabled = true):  display must receive `gap:started` then a
 *                                sequence of `gap:tick` events spanning the
 *                                configured gapSeconds, then `results:revealed`.
 *   Case B (gapEnabled = false): display must receive NO `gap:started` event —
 *                                it goes straight from `time:up` to
 *                                `results:revealed`.
 *
 * Usage:
 *   node server/test/verify-gap-view.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3999;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0;
let fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.error(`  FAIL  ${label}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForEvent(socket, event, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}
function emitP(socket, event, data) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    socket.emit(event, data, (ack) => finish(ack));
    setTimeout(() => finish(null), 8000);
  });
}
function createClient(opts, events) {
  return new Promise((resolve, reject) => {
    const client = Client(BASE, {
      query: opts.query || {},
      auth: opts.auth || {},
      reconnection: false, forceNew: true, autoConnect: false,
      transports: ['websocket'],
    });
    const promises = {};
    for (const e of events) promises[e] = waitForEvent(client, e, 30000);
    const connectP = new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('connect timeout')), 5000);
      client.on('connect', () => { clearTimeout(t); res(); });
      client.on('connect_error', (err) => { clearTimeout(t); rej(err); });
    });
    client.connect();
    connectP.then(() => resolve({ client, events: promises })).catch(reject);
  });
}

async function adminLogin() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: ADMIN_PIN }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  return (await res.json()).token;
}

async function importSeed(token, doc) {
  const res = await fetch(`${BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(`Import failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Records every event of interest on the display socket into an ordered log.
function attachDisplayRecorder(display, log) {
  for (const ev of ['time:up', 'gap:started', 'gap:tick', 'results:revealed', 'game:state:public']) {
    display.on(ev, (data) => log.push({ ev, data, t: Date.now() }));
  }
}

async function runCase(label, gapEnabled, gapSeconds) {
  console.log(`\n=== ${label} (gapEnabled=${gapEnabled}, gapSeconds=${gapSeconds}) ===`);

  const token = await adminLogin();

  const doc = {
    rounds: [{
      id: 'vg-r', name: 'Verify Round', order: 1, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 8,
      gapEnabled, gapSeconds, instructions: 'verify',
    }],
    questions: [{
      id: 'vg-q', roundId: 'vg-r', order: 1, text: '2 + 2 = ?',
      mediaType: 'none', mediaUrl: null,
      options: [
        { key: 'A', text: '3' }, { key: 'B', text: '4' },
        { key: 'C', text: '5' }, { key: 'D', text: '22' },
      ],
      correctOptionKey: 'B', pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    }],
    candidates: [
      { id: 'vg-cand', name: 'Vee', joinToken: 'vg-tok', logoUrl: null, score: 0, isActive: 1 },
    ],
  };
  const importRes = await importSeed(token, doc);
  const matchId = importRes.matches[0].id;

  const { client: admin, events: adminEv } = await createClient(
    { auth: { token } }, ['game:state']
  );
  await adminEv['game:state'];

  const { client: display } = await createClient(
    { query: { role: 'display' } }, ['game:state:public']
  );
  await displayEv_drain(display);

  const displayLog = [];
  attachDisplayRecorder(display, displayLog);

  // Start match
  const startAck = await emitP(admin, 'admin:startMatch', { matchId });
  assert('startMatch acknowledged', startAck && startAck.success === true);

  // Candidate answers correctly
  const { client: cand } = await createClient(
    { query: { candidateId: 'vg-cand', joinToken: 'vg-tok' } }, ['game:state:public']
  );
  await waitForEvent(cand, 'game:state:public', 5000).catch(() => {});
  await emitP(cand, 'candidate:lockAnswer', { candidateId: 'vg-cand', optionKey: 'B' });

  // Wait for the question window, then end timer (before the 8s auto-timer)
  await sleep(1500);
  const endAck = await emitP(admin, 'admin:endTimerNow', {});
  assert('endTimerNow acknowledged', endAck && endAck.success === true);

  // Wait for results to be revealed (gap auto-advances, or skips straight to results)
  const maxWait = gapEnabled ? (gapSeconds + 8) * 1000 : 8000;
  await waitForEvent(display, 'results:revealed', maxWait).catch(() => {});

  // ── Analyze display log ──
  const gapStarted = displayLog.filter((e) => e.ev === 'gap:started');
  const gapTicks = displayLog.filter((e) => e.ev === 'gap:tick');
  const resultsRevealed = displayLog.filter((e) => e.ev === 'results:revealed');
  const timeUp = displayLog.filter((e) => e.ev === 'time:up');

  console.log(`  Display events: time:up=${timeUp.length}, gap:started=${gapStarted.length}, gap:tick=${gapTicks.length}, results:revealed=${resultsRevealed.length}`);
  if (gapTicks.length) {
    console.log(`  gap:tick remaining values: [${gapTicks.map((e) => e.data.remainingSeconds).join(', ')}]`);
  }

  if (gapEnabled) {
    assert('display received gap:started exactly once', gapStarted.length === 1);
    assert('gap:started carried configured gapSeconds', gapStarted[0] && gapStarted[0].data.gapSeconds === gapSeconds);
    assert('display received gap:tick events', gapTicks.length >= 1);
    // Ticks should count down from gapSeconds toward 1
    const firstTick = gapTicks[0]?.data.remainingSeconds;
    const lastTick = gapTicks[gapTicks.length - 1]?.data.remainingSeconds;
    assert('first gap:tick ≈ gapSeconds', firstTick === gapSeconds);
    assert('gap:tick counts downward', lastTick < firstTick);
    assert('display received results:revealed', resultsRevealed.length === 1);
    // Ordering: gap:started before results:revealed
    const idxStart = displayLog.findIndex((e) => e.ev === 'gap:started');
    const idxResults = displayLog.findIndex((e) => e.ev === 'results:revealed');
    assert('gap:started precedes results:revealed', idxStart < idxResults && idxStart >= 0);
  } else {
    assert('display received NO gap:started event', gapStarted.length === 0);
    assert('display received NO gap:tick event', gapTicks.length === 0);
    assert('display received results:revealed', resultsRevealed.length === 1);
    // time:up must precede results:revealed with nothing in between (no gap)
    const idxTimeUp = displayLog.findIndex((e) => e.ev === 'time:up');
    const idxResults = displayLog.findIndex((e) => e.ev === 'results:revealed');
    assert('time:up precedes results:revealed', idxTimeUp >= 0 && idxTimeUp < idxResults);
  }

  admin.disconnect();
  display.disconnect();
  cand.disconnect();
}

// Drain the initial game:state:public so it doesn't pollute the log
async function displayEv_drain(display) {
  await waitForEvent(display, 'game:state:public', 5000).catch(() => {});
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN }),
      });
      if (res.status === 200 || res.status === 401) return; // server is up
    } catch (_) { /* not ready */ }
    await sleep(300);
  }
  throw new Error('Server did not start in time');
}

async function main() {
  console.log('Starting server...');
  const server = spawn('node', ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, ADMIN_PIN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server-err] ${d}`));

  try {
    await waitForServer();
    console.log('Server is up.');

    await runCase('CASE A — gap enabled', 1, 3);
    await runCase('CASE B — gap disabled', 0, 0);
  } finally {
    server.kill('SIGTERM');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('VERIFY ERROR:', err);
  process.exitCode = 1;
});