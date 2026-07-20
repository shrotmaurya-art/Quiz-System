/**
 * Verification for timer-resume crash recovery (Task 5.1 / Section 15).
 *
 * Tests that after a server crash mid-question and restart, the timer:
 *   A. Resumes at the correct remaining time (not fresh, not crashed).
 *   B. Jumps to TIME_UP when downtime exceeded the timer.
 *   C. Same for GAP phase resume.
 *   D. Same for GAP phase expiry (auto-reveals results).
 *   E. Candidate tablet reconnects and gets the correct resumed state.
 *
 * Usage: node server/test/verify-timer-resume.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3998;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.error(`  FAIL  ${label}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function emitP(socket, event, data) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    socket.emit(event, data, (ack) => finish(ack));
    setTimeout(() => finish(null), 10000);
  });
}

function waitForEvent(socket, event, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

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
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: ADMIN_PIN }),
      });
      if (r.status === 200 || r.status === 401) return;
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('Server never became ready');
}

function killServer(server) {
  return new Promise((resolve) => {
    server.on('exit', resolve);
    server.kill('SIGTERM');
    setTimeout(() => { try { server.kill('SIGKILL'); } catch (_) {} }, 5000);
  });
}

async function adminLogin() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: ADMIN_PIN }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  return (await res.json()).token;
}

async function importSeed(token, seed) {
  const res = await fetch(`${BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(seed),
  });
  if (!res.ok) throw new Error(`Import failed: ${await res.text()}`);
  return res.json();
}

// ── Seed data generators ──

function makeSeed({ timerSec, gapEnabled, gapSec }) {
  const MATCH_ID = `tr-match-${Date.now()}`;
  return {
    matchId: MATCH_ID,
    document: {
      matches: [{ id: MATCH_ID, name: 'Timer Resume Match', order: 1, candidateIds: ['tr-alice', 'tr-bob'], status: 'not_started' }],
      match_scores: [
        { matchId: MATCH_ID, candidateId: 'tr-alice', score: 0 },
        { matchId: MATCH_ID, candidateId: 'tr-bob', score: 0 },
      ],
      rounds: [{
        id: 'tr-r1', name: 'MCQ Round', order: 1, answerMode: 'MCQ',
        pointsPerQuestion: 10, timeLimitSeconds: timerSec,
        gapEnabled: gapEnabled ? 1 : 0, gapSeconds: gapSec || 0,
        instructions: 'Timer resume test', matchId: MATCH_ID,
      }],
      questions: [{
        id: 'tr-q1', roundId: 'tr-r1', order: 1, text: 'What is 2+2?',
        mediaType: 'none', mediaUrl: null,
        options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }, { key: 'C', text: '5' }, { key: 'D', text: '6' }],
        correctOptionKey: 'B', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      }],
      candidates: [
        { id: 'tr-alice', name: 'Alice', joinToken: 'tr-tok-alice', logoUrl: null, score: 0, isActive: 1 },
        { id: 'tr-bob', name: 'Bob', joinToken: 'tr-tok-bob', logoUrl: null, score: 0, isActive: 1 },
      ],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test runner
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO A: Timer resume — kill server ~5s into 30s timer, wait ~10s
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SCENARIO A: Timer resume after short downtime ===');

  const seedA = makeSeed({ timerSec: 30, gapEnabled: false });
  let server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server up.');

    const token = await adminLogin();
    const importRes = await importSeed(token, seedA.document);
    const matchId = seedA.matchId;

    const { io: Client } = require('socket.io-client');
    const admin = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));
    await waitForEvent(admin, 'game:state');

    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('A: startMatch acknowledged', startAck && startAck.success === true);
    console.log('  Match started — 30s timer running.');

    // Wait ~5 seconds
    await sleep(5000);

    // Disconnect admin before killing
    admin.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server killed after ~5s.');
  }

  // Wait ~10 seconds (simulating downtime)
  console.log('  Waiting 10s (simulating downtime)...');
  await sleep(10000);

  // Restart
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server restarted.');

    // Wait for boot recovery
    await sleep(1500);

    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'), { readonly: true });
    const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    db.close();

    assert('A: phase is still QUESTION_SHOWN', state && state.phase === 'QUESTION_SHOWN');
    assert('A: timerStartedAt is preserved (not reset)', state && state.timerStartedAt !== null);

    // Check remaining time via admin socket
    const token2 = await adminLogin();
    const admin2 = Client(BASE, { auth: { token: token2 }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin2.on('connect', res));
    const freshState = await waitForEvent(admin2, 'game:state');

    const elapsedMs = Date.now() - freshState.timerStartedAt;
    const remainingSec = freshState.timeLimitSeconds - (elapsedMs / 1000);

    console.log(`  Time limit: ${freshState.timeLimitSeconds}s, elapsed: ${(elapsedMs/1000).toFixed(1)}s, remaining: ~${remainingSec.toFixed(1)}s`);
    assert('A: remaining time is roughly 15s (between 10s and 20s)', remainingSec >= 10 && remainingSec <= 20);
    assert('A: remaining time is NOT a fresh 30s', remainingSec < 25);

    // Verify timer:tick fires with correct countdown
    const tickP = new Promise((resolve) => {
      admin2.once('timer:tick', resolve);
      setTimeout(() => resolve(null), 5000);
    });
    const tick = await tickP;
    assert('A: timer:tick event received after restart', tick !== null);
    if (tick) {
      assert('A: tick remainingSeconds is reasonable', tick.remainingSeconds >= 10 && tick.remainingSeconds <= 20);
      console.log(`  First timer:tick remaining: ${tick.remainingSeconds}s`);
    }

    // Let timer expire normally to clean up
    console.log('  Waiting for timer to expire naturally...');
    const timeUpP = new Promise((resolve) => {
      admin2.once('time:up', resolve);
      setTimeout(() => resolve(null), 30000);
    });
    const timeUp = await timeUpP;
    assert('A: time:up fires after resumed timer expires', timeUp !== null);

    admin2.close();
  } finally {
    await killServer(server);
    console.log('  Server killed (scenario A done).');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO B: Timer expired — kill server, wait >30s, restart → TIME_UP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SCENARIO B: Timer expired during downtime → TIME_UP ===');

  const seedB = makeSeed({ timerSec: 30, gapEnabled: false });
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server up.');

    const token = await adminLogin();
    const importRes = await importSeed(token, seedB.document);
    const matchId = seedB.matchId;

    const admin = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));
    await waitForEvent(admin, 'game:state');

    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('B: startMatch acknowledged', startAck && startAck.success === true);
    console.log('  Match started — 30s timer running.');

    // Wait ~5 seconds
    await sleep(5000);
    admin.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server killed after ~5s.');
  }

  // Wait >30 seconds (timer expired during downtime)
  console.log('  Waiting 35s (timer expires during downtime)...');
  await sleep(35000);

  // Restart
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server restarted.');

    await sleep(2000);

    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'), { readonly: true });
    const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    db.close();

    assert('B: phase is NO LONGER QUESTION_SHOWN', state && state.phase !== 'QUESTION_SHOWN');
    console.log(`  Phase after recovery: ${state && state.phase}`);

    // Since no one answered (no candidate locked in), it should go to RESULTS
    // (MCQ with no gap: TIME_UP → enterGap → revealResults → RESULTS)
    assert('B: phase resolved to RESULTS (or at least past QUESTION_SHOWN)',
      state && ['TIME_UP', 'RESULTS'].includes(state.phase));

    // Check that candidates have no_answer status
    const token2 = await adminLogin();
    const admin2 = Client(BASE, { auth: { token: token2 }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin2.on('connect', res));
    const freshState = await waitForEvent(admin2, 'game:state');

    const aliceLock = freshState.locks && freshState.locks['tr-alice'];
    const bobLock = freshState.locks && freshState.locks['tr-bob'];
    assert('B: Alice has no answer (answered=false)', aliceLock && aliceLock.answered === false);
    assert('B: Bob has no answer (answered=false)', bobLock && bobLock.answered === false);

    // If results were revealed, verify no_answer status is visible
    if (freshState.resultsRevealed) {
      const { io: Client2 } = require('socket.io-client');
      const candidate = Client2(BASE, {
        query: { candidateId: 'tr-alice', joinToken: 'tr-tok-alice' },
        transports: ['websocket'], reconnection: false,
      });
      await new Promise((res) => candidate.on('connect', res));
      const candState = await waitForEvent(candidate, 'game:state:public');

      const myLock = candState.locks && candState.locks['tr-alice'];
      assert('B: candidate sees no_answer status', myLock && myLock.status === 'no_answer');
      candidate.close();
    }

    admin2.close();
  } finally {
    await killServer(server);
    console.log('  Server killed (scenario B done).');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO C: GAP timer resume — kill during GAP, restart, gap resumes
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SCENARIO C: GAP timer resume after short downtime ===');

  const seedC = makeSeed({ timerSec: 8, gapEnabled: true, gapSec: 15 });
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server up.');

    const token = await adminLogin();
    await importSeed(token, seedC.document);
    const matchId = seedC.matchId;

    const admin = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));
    await waitForEvent(admin, 'game:state');

    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('C: startMatch acknowledged', startAck && startAck.success === true);
    console.log('  Match started — 8s question timer, 15s gap enabled.');

    // Wait for the question timer to expire and enter GAP
    console.log('  Waiting ~10s for question timer to expire + GAP to start...');
    const gapStartedP = new Promise((resolve) => {
      admin.once('gap:started', resolve);
      setTimeout(() => resolve(null), 15000);
    });
    const gapStarted = await gapStartedP;
    assert('C: gap:started event received', gapStarted !== null);
    console.log(`  GAP phase started (gapSeconds: ${gapStarted?.gapSeconds}).`);

    // Wait ~3s into the gap, then kill
    await sleep(3000);
    admin.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server killed during GAP.');
  }

  // Wait ~5 seconds (gap should still have ~7s remaining)
  console.log('  Waiting 5s (simulating downtime during GAP)...');
  await sleep(5000);

  // Restart
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server restarted.');

    await sleep(1500);

    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'), { readonly: true });
    const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    db.close();

    assert('C: phase is still GAP', state && state.phase === 'GAP');
    console.log(`  Phase after recovery: ${state && state.phase}`);

    // Verify gap timer resumes via admin socket
    const token2 = await adminLogin();
    const admin2 = Client(BASE, { auth: { token: token2 }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin2.on('connect', res));
    await waitForEvent(admin2, 'game:state');

    // Wait for a gap:tick to arrive
    const tickP = new Promise((resolve) => {
      admin2.once('gap:tick', resolve);
      setTimeout(() => resolve(null), 5000);
    });
    const tick = await tickP;
    assert('C: gap:tick event received after restart', tick !== null);
    if (tick) {
      assert('C: gap tick remainingSeconds is reasonable (2-12)', tick.remainingSeconds >= 2 && tick.remainingSeconds <= 12);
      console.log(`  First gap:tick remaining: ${tick.remainingSeconds}s`);
    }

    // Let the gap finish naturally
    console.log('  Waiting for gap to finish and results to reveal...');
    const resultsP = new Promise((resolve) => {
      admin2.once('results:revealed', resolve);
      setTimeout(() => resolve(null), 20000);
    });
    const results = await resultsP;
    assert('C: results:revealed fires after resumed gap expires', results !== null);

    admin2.close();
  } finally {
    await killServer(server);
    console.log('  Server killed (scenario C done).');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO D: GAP expired during downtime → auto-reveal results
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SCENARIO D: GAP expired during downtime → auto-reveal ===');

  const seedD = makeSeed({ timerSec: 8, gapEnabled: true, gapSec: 10 });
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server up.');

    const token = await adminLogin();
    await importSeed(token, seedD.document);
    const matchId = seedD.matchId;

    const admin = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));
    await waitForEvent(admin, 'game:state');

    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('D: startMatch acknowledged', startAck && startAck.success === true);
    console.log('  Match started — 8s question timer, 10s gap.');

    // Wait for GAP
    console.log('  Waiting ~10s for GAP...');
    const gapStartedP = new Promise((resolve) => {
      admin.once('gap:started', resolve);
      setTimeout(() => resolve(null), 15000);
    });
    const gapStarted = await gapStartedP;
    assert('D: gap:started event received', gapStarted !== null);

    // Wait ~3s into gap, then kill
    await sleep(3000);
    admin.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server killed during GAP.');
  }

  // Wait > gap remaining (gap was ~7s when killed, wait 15s)
  console.log('  Waiting 15s (gap expires during downtime)...');
  await sleep(15000);

  // Restart
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server restarted.');

    await sleep(2000);

    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'), { readonly: true });
    const state = db.prepare('SELECT * FROM game_state WHERE id = 1').get();
    db.close();

    assert('D: phase resolved to RESULTS (gap expired)', state && state.phase === 'RESULTS');
    assert('D: resultsRevealed is true', state && Boolean(state.resultsRevealed));
    console.log(`  Phase after recovery: ${state && state.phase}, resultsRevealed: ${state && state.resultsRevealed}`);

    // Verify scoreboard was broadcast
    const token2 = await adminLogin();
    const admin2 = Client(BASE, { auth: { token: token2 }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin2.on('connect', res));
    const resultsState = await waitForEvent(admin2, 'game:state');

    assert('D: no winner (nobody answered)', resultsState.winnerCandidateId === null);
    const aliceLock = resultsState.locks['tr-alice'];
    const bobLock = resultsState.locks['tr-bob'];
    assert('D: Alice answered=false', aliceLock && aliceLock.answered === false);
    assert('D: Bob answered=false', bobLock && bobLock.answered === false);

    admin2.close();
  } finally {
    await killServer(server);
    console.log('  Server killed (scenario D done).');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO E: Candidate reconnect after server restart shows correct state
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== SCENARIO E: Candidate reconnect after restart ===');

  const seedE = makeSeed({ timerSec: 30, gapEnabled: false });
  let candidateState = null;
  let questionText = null;
  let candidate;

  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server up.');

    const token = await adminLogin();
    await importSeed(token, seedE.document);
    const matchId = seedE.matchId;

    // Connect admin
    const admin = Client(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    await new Promise((res) => admin.on('connect', res));
    await waitForEvent(admin, 'game:state');

    // Connect candidate (with reconnection enabled)
    candidateState = null;
    candidate = Client(BASE, {
      query: { candidateId: 'tr-alice', joinToken: 'tr-tok-alice' },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });
    candidate.on('game:state:public', (s) => { candidateState = s; });
    await new Promise((res) => candidate.on('connect', res));
    console.log('  Candidate connected.');

    // Start match
    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('E: startMatch acknowledged', startAck && startAck.success === true);

    // Wait for candidate to receive the QUESTION_SHOWN state
    await sleep(1000);
    assert('E: candidate received initial QUESTION_SHOWN state', candidateState && candidateState.phase === 'QUESTION_SHOWN');
    questionText = candidateState.question && candidateState.question.text;
    assert('E: candidate sees the question text', !!questionText);
    console.log(`  Candidate sees question: "${questionText}"`);

    // Wait ~3s into the timer
    await sleep(3000);

    // Kill server
    candidate.disconnect();
    admin.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server killed with candidate connected.');
  }

  // Wait ~5s
  console.log('  Waiting 5s (simulating downtime)...');
  await sleep(5000);

  // Restart server
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server restarted.');

    // Wait for boot recovery
    await sleep(1500);

    // Candidate should auto-reconnect (reconnection: true)
    let reconnectSucceeded = false;
    const reconnectedP = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 15000);
      candidate.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });

    candidate.connect();
    reconnectSucceeded = await reconnectedP;
    assert('E: candidate reconnected after server restart', reconnectSucceeded);

    // Wait for state to arrive
    await sleep(2000);

    // The candidate should have received game:state:public on reconnect
    assert('E: candidate received state after reconnect', candidateState !== null);
    assert('E: phase is QUESTION_SHOWN', candidateState && candidateState.phase === 'QUESTION_SHOWN');
    assert('E: same question text after reconnect', candidateState && candidateState.question && candidateState.question.text === questionText);

    // Verify the candidate is NOT locked in (they hadn't answered before kill)
    const myLock = candidateState && candidateState.locks && candidateState.locks['tr-alice'];
    assert('E: candidate not locked in after reconnect', myLock && myLock.answered === false);

    // Verify timer:tick is flowing
    let tickReceived = false;
    const tickP = new Promise((resolve) => {
      candidate.once('timer:tick', (t) => { tickReceived = true; resolve(t); });
      setTimeout(() => resolve(null), 5000);
    });
    const tick = await tickP;
    assert('E: timer:tick flowing after reconnect', tickReceived);
    if (tick) {
      assert('E: tick remaining > 0', tick.remainingSeconds > 0);
      console.log(`  Candidate timer:tick remaining: ${tick.remainingSeconds}s`);
    }

    // Verify candidate can still lock in an answer
    const lockAck = await emitP(candidate, 'candidate:lockAnswer', { candidateId: 'tr-alice', optionKey: 'B' });
    assert('E: candidate can lock in answer after reconnect', lockAck && lockAck.success === true);

    candidate.close();
  } finally {
    await killServer(server);
    console.log('  Server killed (scenario E done).');
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  RESULTS: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(60)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('VERIFY ERROR:', err);
  process.exitCode = 1;
});
