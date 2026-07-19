/**
 * Verification for the Display Scoreboard view (Task 4.6 / Section 13).
 *
 * Self-contained: spawns the server on an isolated port and asserts:
 *   1. Admin manual score change (admin:adjustScore, the +/- buttons' handler)
 *      pushes a live `scoreboard:update` to the display with the new total.
 *   2. Reaching QUIZ_ENDED (endQuiz) makes the display render the scoreboard
 *      (phase === 'QUIZ_ENDED') with the highest scorer at rank 1 — which the
 *      view emphasizes as the CHAMPION (gold badge + glow + pulse).
 *
 * Usage: node server/test/verify-scoreboard-view.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3997;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0, fail = 0;
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
      query: opts.query || {}, auth: opts.auth || {},
      reconnection: false, forceNew: true, autoConnect: false, transports: ['websocket'],
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
    for (let i = 0; i < 50; i++) {
      try {
        const r = await fetch(`${BASE}/api/admin/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: ADMIN_PIN }),
        });
        if (r.status === 200 || r.status === 401) break;
      } catch (_) {}
      await sleep(300);
    }
    console.log('Server is up.');

    const token = await adminLogin();
    const C = [
      { id: 'sb-a', name: 'Alice', joinToken: 'sb-tok-a', logoUrl: null },
      { id: 'sb-b', name: 'Bob', joinToken: 'sb-tok-b', logoUrl: null },
      { id: 'sb-c', name: 'Cara', joinToken: 'sb-tok-c', logoUrl: null },
    ];
    await importSeed(token, {
      rounds: [{
        id: 'sb-r', name: 'SB Round', order: 1, answerMode: 'MCQ',
        pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '',
      }],
      questions: [{
        id: 'sb-q', roundId: 'sb-r', order: 1, text: '2+2=?',
        mediaType: 'none', mediaUrl: null,
        options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }, { key: 'C', text: '5' }],
        correctOptionKey: 'B', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      }],
      candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })),
    });

    const { client: admin, events: adminEv } = await createClient({ auth: { token } }, ['game:state', 'scoreboard:update']);
    await adminEv['game:state'];

    const { client: display, events: displayEv } = await createClient(
      { query: { role: 'display' } }, ['game:state:public', 'scoreboard:update']
    );
    await displayEv['game:state:public'];
    // Drain the initial scoreboard:update so the next one we await is post-change.
    await displayEv['scoreboard:update'].catch(() => {});

    // Start the quiz so endQuiz is a legal transition (IDLE -> startQuiz -> ... -> endQuiz).
    const startAck = await emitP(admin, 'admin:startQuiz', {});
    assert('startQuiz acknowledged', startAck && startAck.success === true);

    // ── 1. Live admin score change ──
    // Give Alice +10 directly (simulates the Admin +/- buttons → admin:adjustScore)
    const adjAck = await emitP(admin, 'admin:adjustScore', { candidateId: 'sb-a', delta: 10, reason: 'manual' });
    assert('admin:adjustScore acknowledged', adjAck && adjAck.success === true);

    // Display should receive a live scoreboard:update reflecting Alice=10
    const sb1 = await waitForEvent(display, 'scoreboard:update', 8000);
    console.log('  scoreboard after +10 to Alice:', sb1.map((c) => `${c.name}:${c.score}`).join(', '));
    const alice1 = sb1.find((c) => c.id === 'sb-a');
    assert('display received live scoreboard:update', Array.isArray(sb1) && sb1.length === 3);
    assert('Alice score updated live to 10', alice1 && alice1.score === 10);
    assert('others still 0', sb1.filter((c) => c.id !== 'sb-a').every((c) => c.score === 0));

    // Another change: Bob +5
    await emitP(admin, 'admin:adjustScore', { candidateId: 'sb-b', delta: 5, reason: 'manual' });
    const sb2 = await waitForEvent(display, 'scoreboard:update', 8000);
    console.log('  scoreboard after +5 to Bob:', sb2.map((c) => `${c.name}:${c.score}`).join(', '));
    const bob2 = sb2.find((c) => c.id === 'sb-b');
    assert('Bob score updated live to 5', bob2 && bob2.score === 5);
    assert('Alice still 10', sb2.find((c) => c.id === 'sb-a').score === 10);

    // ── 2. QUIZ_ENDED rendering ──
    const endAck = await emitP(admin, 'admin:endQuiz', {});
    assert('admin:endQuiz acknowledged', endAck && endAck.success === true);

    // Display phase should now be QUIZ_ENDED (ScoreboardView renders it)
    const finalState = await waitForEvent(display, 'game:state:public', 8000);
    console.log(`  Display phase after endQuiz: ${finalState.phase}`);
    assert('display phase is QUIZ_ENDED', finalState.phase === 'QUIZ_ENDED');

    // Final scoreboard: sorted descending, winner (Alice=10) at rank 1
    const finalSb = await waitForEvent(display, 'scoreboard:update', 8000);
    console.log('  final scoreboard:', finalSb.map((c) => `${c.name}:${c.score}`).join(', '));
    const sortedDesc = finalSb.every((c, i) => i === 0 || finalSb[i - 1].score >= c.score);
    assert('scoreboard sorted descending (winner first)', sortedDesc);
    assert('rank 1 is the highest scorer (Alice=10)', finalSb[0].id === 'sb-a' && finalSb[0].score === 10);
    assert('winner is uniquely highest (emphasized as CHAMPION in view)',
      finalSb[0].score > (finalSb[1]?.score ?? -1));

    admin.disconnect();
    display.disconnect();
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