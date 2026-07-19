/**
 * Verification for candidate tablet network-drop / reconnect resilience (NFR5 / Section 15).
 *
 * Simulates a ~5s Wi-Fi drop by disconnecting the candidate's Socket.IO client
 * and reconnecting it (the exact code path a real network blip triggers: the
 * client's `connect` listener fires again on reconnect). Proves the tablet
 * resumes correctly:
 *   - NOT locked in yet  -> reconnect shows the live question + a fresh
 *     timer:tick (countdown), locks[candidateId].answered === false.
 *   - ALREADY locked in  -> reconnect shows the question + locks[candidateId]
 *     .answered === true (server rejects a 2nd lockAnswer), NOT a re-answer.
 *
 * Also asserts the server re-sends game:state:public on the candidate's
 * reconnect (via candidate:requestState) so local state is never trusted stale.
 *
 * Usage: node server/test/verify-candidate-reconnect.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');
const { get } = require('../src/db/db');

const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3995;
const BASE = `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || 'SGBS123';

let pass = 0, fail = 0;
const assert = (l, c) => { if (c) { pass++; console.log(`  PASS  ${l}`); } else { fail++; console.error(`  FAIL  ${l}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Create a candidate client that stores the latest game:state:public and the
// last timer:tick, so we never race on once() listeners.
function makeCandidate(cand) {
  const store = { state: null, tick: null, connected: false };
  const c = Client(BASE, {
    query: { role: 'candidate', candidateId: cand.id, joinToken: cand.joinToken },
    transports: ['websocket'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 500,
    autoConnect: false,
  });
  c.on('game:state:public', (s) => { store.state = s; });
  c.on('timer:tick', (t) => { store.tick = t; });
  c.on('connect', () => { store.connected = true; });
  c.connect();
  return { c, store };
}
const waitState = async (store, timeout = 8000) => {
  const t0 = Date.now();
  while (!store.state && Date.now() - t0 < timeout) await sleep(50);
  if (!store.state) throw new Error('timeout waiting for game:state:public');
  return store.state;
};
const waitTick = async (store, timeout = 8000) => {
  const t0 = Date.now();
  while (!store.tick && Date.now() - t0 < timeout) await sleep(50);
  if (!store.tick) throw new Error('timeout waiting for timer:tick');
  return store.tick;
};

async function main() {
  const server = spawn('node', ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, ADMIN_PIN, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  let up = false;
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: ADMIN_PIN }) }); if (r.status === 200 || r.status === 401) { up = true; break; } } catch (_) {}
    await sleep(300);
  }
  if (!up) throw new Error('server did not start');

  const loginRes = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: ADMIN_PIN }) });
  const { token } = await loginRes.json();
  const seed = {
    rounds: [{ id: 'rc-r', name: 'R1', order: 1, answerMode: 'MCQ', pointsPerQuestion: 10, timeLimitSeconds: 30, gapEnabled: 0, gapSeconds: 0, instructions: '' }],
    questions: [{ id: 'rc-q', roundId: 'rc-r', order: 1, text: '2+2 = ?', mediaType: 'none', mediaUrl: null, options: [{ key: 'A', text: '4' }, { key: 'B', text: '5' }], correctOptionKey: 'A', pointsOverride: null, timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null }],
    candidates: [{ id: 'rc-c', name: 'ReconnectTest', joinToken: 'rc-tok', logoUrl: null, score: 0, isActive: 1 }],
  };
  const imp = await fetch(`${BASE}/api/import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(seed) });
  if (!imp.ok) throw new Error(`seed failed ${imp.status}`);

  const cand = get('SELECT id, joinToken FROM candidates WHERE isActive = 1 LIMIT 1');
  assert('seeded an active candidate', !!cand);

  const admin = Client(BASE, { query: { role: 'admin', adminToken: token }, transports: ['websocket'], reconnection: false });
  await new Promise((res) => admin.on('connect', res));
  await new Promise((res, rej) => admin.emit('admin:startQuiz', {}, (a) => (a && a.error ? rej(new Error(a.error)) : res(a))));

  // ── Scenario A: NOT locked in, drop Wi-Fi, reconnect ──
  const a = makeCandidate(cand);
  const stateA = await waitState(a.store);
  assert('A: initial state has the live question', !!stateA.question && stateA.phase === 'QUESTION_SHOWN');
  const tickA1 = await waitTick(a.store);
  assert('A: initial timer:tick present (countdown running)', typeof tickA1.remainingSeconds === 'number');

  a.c.disconnect();
  await sleep(5000);
  a.c.connect();
  await sleep(800);
  const reStateA = a.store.state;
  const tickA2 = await waitTick(a.store);
  assert('A: after reconnect, server re-sent game:state:public', !!reStateA);
  assert('A: reconnect shows the SAME live question (not frozen/blank)', reStateA && reStateA.question && reStateA.question.text === stateA.question.text);
  assert('A: reconnect countdown resumed (remaining > 0)', tickA2.remainingSeconds > 0);
  assert('A: this candidate NOT locked in yet', reStateA && reStateA.locks[cand.id] && reStateA.locks[cand.id].answered === false);
  a.c.close();

  // ── Scenario B: lock in, THEN drop Wi-Fi, reconnect ──
  const b = makeCandidate(cand);
  const stateB = await waitState(b.store);
  await new Promise((res, rej) => b.c.emit('candidate:lockAnswer', { candidateId: cand.id, optionKey: 'A' }, (ack) => (ack && ack.error ? rej(new Error(ack.error)) : res(ack))));
  await sleep(300);
  await waitState(b.store); // let the post-lock broadcast arrive
  assert('B: after lock, server marks this candidate answered', b.store.state.locks[cand.id].answered === true);

  b.c.disconnect();
  await sleep(5000);
  b.c.connect();
  await sleep(800);
  const reStateB = b.store.state;
  assert('B: after reconnect, server re-sent game:state:public', !!reStateB);
  assert('B: reconnect shows question (not blank)', reStateB && !!reStateB.question);
  assert('B: reconnect correctly shows ALREADY LOCKED (answered === true)', reStateB && reStateB.locks[cand.id].answered === true);

  const secondLock = await new Promise((res) => b.c.emit('candidate:lockAnswer', { candidateId: cand.id, optionKey: 'B' }, (ack) => res(ack)));
  assert('B: server REJECTS a 2nd lockAnswer after reconnect (no re-answer)', secondLock && !!secondLock.error);
  b.c.close();

  admin.close();
  server.kill();
  await sleep(200);

  console.log(`\n${'='.repeat(50)}\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}\n${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });