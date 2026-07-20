/**
 * Verification for the Display Results view (Section 13 / Task 4.5).
 *
 * Self-contained: spawns the server on an isolated port, seeds 4 candidates
 * with one MCQ question (gapEnabled=false so it goes straight to results),
 * drives staggered answers, and asserts the DISPLAY room receives a correct
 * `results:revealed` payload plus `candidates:public-updated` (logo + name)
 * so the view can join rankings -> names/logos.
 *
 * Usage: node server/test/verify-results-view.js
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
  return res.json();
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
    // wait for server
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
      { id: 'rs-alice', name: 'Alice', joinToken: 'rs-tok-alice', logoUrl: 'https://example.com/a.png' },
      { id: 'rs-bob', name: 'Bob', joinToken: 'rs-tok-bob', logoUrl: null },
      { id: 'rs-cara', name: 'Cara', joinToken: 'rs-tok-cara', logoUrl: 'https://example.com/c.png' },
      { id: 'rs-dev', name: 'Dev', joinToken: 'rs-tok-dev', logoUrl: null },
    ];
    const importRes = await importSeed(token, {
      rounds: [{
        id: 'rs-r', name: 'Results Round', order: 1, answerMode: 'MCQ',
        pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '',
      }],
      questions: [{
        id: 'rs-q', roundId: 'rs-r', order: 1, text: '5 x 4 = ?',
        mediaType: 'none', mediaUrl: null,
        options: [
          { key: 'A', text: '18' }, { key: 'B', text: '20' },
          { key: 'C', text: '22' }, { key: 'D', text: '25' },
        ],
        correctOptionKey: 'B', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      }],
      candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })),
    });

    const matchId = importRes.matches[0].id;

    const { client: admin, events: adminEv } = await createClient({ auth: { token } }, ['game:state']);
    await adminEv['game:state'];

    const { client: display, events: displayEv } = await createClient(
      { query: { role: 'display' } }, ['game:state:public', 'candidates:public-updated', 'results:revealed']
    );
    await displayEv['game:state:public'];
    const publicCands = await displayEv['candidates:public-updated'];
    console.log('  Display received candidates:public-updated:', publicCands.map((c) => c.name).join(', '));

    const startAck = await emitP(admin, 'admin:startMatch', { matchId });
    assert('startMatch acknowledged', startAck && startAck.success === true);

    // Staggered answers: Alice B (correct, fastest), Cara B (correct, slower), Bob A (wrong), Dev none
    const candCli = {};
    for (const c of C) {
      const { client } = await createClient(
        { query: { candidateId: c.id, joinToken: c.joinToken } }, ['game:state:public']
      );
      candCli[c.id] = client;
    }
    setTimeout(() => emitP(candCli['rs-alice'], 'candidate:lockAnswer', { candidateId: 'rs-alice', optionKey: 'B' }), 300);
    setTimeout(() => emitP(candCli['rs-cara'], 'candidate:lockAnswer', { candidateId: 'rs-cara', optionKey: 'B' }), 900);
    setTimeout(() => emitP(candCli['rs-bob'], 'candidate:lockAnswer', { candidateId: 'rs-bob', optionKey: 'A' }), 1300);

    await sleep(2000);
    const endAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('endTimerNow acknowledged', endAck && endAck.success === true);

    const results = await displayEv['results:revealed'];
    console.log('  results:revealed received:');
    console.log(`    correctOptionKey: ${results.correctOptionKey}`);
    console.log(`    winnerCandidateId: ${results.winnerCandidateId}`);
    console.log('    rankings:');
    for (const r of results.rankings) {
      console.log(`      ${r.candidateId}: status=${r.status}, elapsedMs=${r.elapsedMs}`);
    }

    // ── Assertions on payload ──
    assert('correctOptionKey is B', results.correctOptionKey === 'B');
    assert('all 4 candidates in rankings', results.rankings.length === 4);
    const alice = results.rankings.find((r) => r.candidateId === 'rs-alice');
    const bob = results.rankings.find((r) => r.candidateId === 'rs-bob');
    const cara = results.rankings.find((r) => r.candidateId === 'rs-cara');
    const dev = results.rankings.find((r) => r.candidateId === 'rs-dev');
    assert('Alice correct', alice && alice.status === 'correct');
    assert('Cara correct', cara && cara.status === 'correct');
    assert('Bob incorrect', bob && bob.status === 'incorrect');
    assert('Dev no_answer', dev && dev.status === 'no_answer');
    assert('Alice fastest correct → winner', results.winnerCandidateId === 'rs-alice');
    assert('Alice faster than Cara', alice.elapsedMs < cara.elapsedMs);
    assert('winner has elapsedMs (not null)', alice.elapsedMs != null);

    // ── Simulate the view's join: candidates(public) + rankings ──
    const candMap = Object.fromEntries(publicCands.map((c) => [c.id, c]));
    const joined = results.rankings.map((r) => ({ ...r, name: candMap[r.candidateId]?.name, logo: candMap[r.candidateId]?.logoUrl }));
    console.log('  Joined rows (as the view renders them):');
    for (const r of joined) {
      console.log(`    ${r.name} (logo:${r.logo ? 'yes' : 'no'}) — ${r.status} — ${r.elapsedMs == null ? 'No Answer' : (r.elapsedMs / 1000).toFixed(2) + 's'}`);
    }
    assert('every ranking row joins to a candidate name', joined.every((r) => !!r.name));
    assert('Alice row has logo url', !!joined.find((r) => r.candidateId === 'rs-alice')?.logo);
    assert('Bob row falls back to no logo (person icon)', joined.find((r) => r.candidateId === 'rs-bob')?.logo == null);

    admin.disconnect();
    display.disconnect();
    for (const id in candCli) candCli[id].disconnect();
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