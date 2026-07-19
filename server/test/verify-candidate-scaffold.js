/**
 * Verification for the Candidate tablet scaffold (Phase 5.1).
 *
 * Proves the token-validation contract the CandidateTablet component relies on:
 *   - a valid candidateId + joinToken pair CONNECTS (the screen proceeds)
 *   - a wrong token is REJECTED by the server (the screen shows InvalidLinkScreen)
 *   - a non-existent candidateId is REJECTED
 *   - an empty/missing token is REJECTED (defense-in-depth; the client also
 *     short-circuits before connecting)
 *
 * The client delegates validation entirely to the Socket.IO `io.use` middleware
 * (Section 15 / Task 2.5) — there is NO second REST call. This test exercises
 * exactly that middleware, which is what CandidateTablet's `connect` /
 * `connect_error` handlers observe.
 *
 * Usage: node server/test/verify-candidate-scaffold.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');
const { get } = require('../src/db/db');

const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3996;
const BASE = `http://localhost:${PORT}`;

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.error(`  FAIL  ${label}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve to either 'connect' or 'connect_error' (whichever fires first).
function connectOutcome(opts) {
  return new Promise((resolve) => {
    const socket = Client(BASE, {
      query: opts.query || {},
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
    });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.close();
      resolve(result);
    };
    socket.on('connect', () => finish('connect'));
    socket.on('connect_error', () => finish('connect_error'));
  });
}

async function main() {
  // Boot the server on an isolated port.
  const server = spawn('node', ['src/index.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, ADMIN_PIN: process.env.ADMIN_PIN || 'SGBS123', PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  // Wait for the server to be listening (poll the admin login endpoint, which
  // responds 200/401 as soon as the HTTP server is up).
  let started = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: 'SGBS123' }),
      });
      if (r.status === 200 || r.status === 401) { started = true; break; }
    } catch (_) {}
    await sleep(300);
  }
  if (!started) throw new Error('Server did not start in time');

  // Read a real active candidate (id + joinToken) from the DB.
  const candidate = get(
    'SELECT id, joinToken FROM candidates WHERE isActive = 1 LIMIT 1'
  );
  assert('a real active candidate exists in the DB to test with', !!candidate);

  if (candidate) {
    const valid = await connectOutcome({
      query: { role: 'candidate', candidateId: candidate.id, joinToken: candidate.joinToken },
    });
    assert(`valid candidateId+token CONNECTS (screen proceeds) — got "${valid}"`, valid === 'connect');

    const wrongToken = await connectOutcome({
      query: { role: 'candidate', candidateId: candidate.id, joinToken: 'definitely-not-the-real-token' },
    });
    assert(`wrong token is REJECTED (screen shows error) — got "${wrongToken}"`, wrongToken === 'connect_error');

    const missingToken = await connectOutcome({
      query: { role: 'candidate', candidateId: candidate.id },
    });
    assert(`missing token is REJECTED (defense-in-depth) — got "${missingToken}"`, missingToken === 'connect_error');
  }

  const ghost = await connectOutcome({
    query: { role: 'candidate', candidateId: 'candidate:does-not-exist', joinToken: 'whatever' },
  });
  assert(`non-existent candidateId is REJECTED — got "${ghost}"`, ghost === 'connect_error');

  server.kill();
  await sleep(200);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});