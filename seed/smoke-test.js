'use strict';

const BASE = process.env.BASE_URL || 'http://localhost:4000';

let pass = 0;
let fail = 0;

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: process.env.ADMIN_PIN }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return (await res.json()).token;
}

async function check(label, method, path, token, expectedStatus, body) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, opts);
  const ok = res.status === expectedStatus;
  if (ok) {
    pass++;
    console.log(`  PASS  ${method.padEnd(6)} ${path.padEnd(45)} → ${res.status}`);
  } else {
    fail++;
    console.log(`  FAIL  ${method.padEnd(6)} ${path.padEnd(45)} → ${res.status} (expected ${expectedStatus})`);
  }
  return res;
}

(async () => {
  console.log('Section 11 Smoke Test\n');

  const token = await login();
  console.log('Logged in.\n');

  // ── ROUNDS ──
  console.log('─── Rounds ───');
  await check('GET /api/rounds (no token)', 'GET', '/api/rounds', null, 401);
  await check('GET /api/rounds (token)', 'GET', '/api/rounds', token, 200);
  await check('POST /api/rounds (no token)', 'POST', '/api/rounds', null, 401);
  await check('POST /api/rounds (token, valid)', 'POST', '/api/rounds', token, 201,
    { name: 'Smoke Test Round', order: 99, answerMode: 'MCQ' });
  await check('POST /api/rounds (token, bad mode)', 'POST', '/api/rounds', token, 400,
    { name: 'Bad', order: 99, answerMode: 'INVALID' });
  await check('PUT /api/rounds/:id (no token)', 'PUT', '/api/rounds/nonexistent', null, 401);
  await check('PUT /api/rounds/:id (token, missing)', 'PUT', '/api/rounds/nonexistent', token, 404);
  await check('DELETE /api/rounds/:id (no token)', 'DELETE', '/api/rounds/nonexistent', null, 401);
  await check('DELETE /api/rounds/:id (token, missing)', 'DELETE', '/api/rounds/nonexistent', token, 404);
  await check('GET /api/rounds/:id/questions (no token)', 'GET', '/api/rounds/nonexistent/questions', null, 401);
  await check('GET /api/rounds/:id/questions (token, missing)', 'GET', '/api/rounds/nonexistent/questions', token, 404);

  // ── QUESTIONS ──
  console.log('\n─── Questions ───');
  await check('POST /api/questions (no token)', 'POST', '/api/questions', null, 401);
  await check('POST /api/questions (token, missing roundId)', 'POST', '/api/questions', token, 404,
    { roundId: 'nonexistent', text: 'Q?', mediaType: 'none', order: 1 });
  await check('PUT /api/questions/:id (no token)', 'PUT', '/api/questions/nonexistent', null, 401);
  await check('PUT /api/questions/:id (token, missing)', 'PUT', '/api/questions/nonexistent', token, 404);
  await check('DELETE /api/questions/:id (no token)', 'DELETE', '/api/questions/nonexistent', null, 401);
  await check('DELETE /api/questions/:id (token, missing)', 'DELETE', '/api/questions/nonexistent', token, 404);
  await check('POST /api/questions/:id/media (no token)', 'POST', '/api/questions/nonexistent/media', null, 401);

  // ── CANDIDATES ──
  console.log('\n─── Candidates ───');
  await check('GET /api/candidates (no token)', 'GET', '/api/candidates', null, 401);
  await check('GET /api/candidates (token)', 'GET', '/api/candidates', token, 200);
  await check('POST /api/candidates (no token)', 'POST', '/api/candidates', null, 401);
  await check('POST /api/candidates (token, valid)', 'POST', '/api/candidates', token, 201,
    { name: 'Smoke Test Candidate' });
  await check('PUT /api/candidates/:id (no token)', 'PUT', '/api/candidates/nonexistent', null, 401);
  await check('PUT /api/candidates/:id (token, missing)', 'PUT', '/api/candidates/nonexistent', token, 404);
  await check('DELETE /api/candidates/:id (no token)', 'DELETE', '/api/candidates/nonexistent', null, 401);
  await check('DELETE /api/candidates/:id (token, missing)', 'DELETE', '/api/candidates/nonexistent', token, 404);
  await check('POST /api/candidates/:id/logo (no token)', 'POST', '/api/candidates/nonexistent/logo', null, 401);

  // ── SCOREBOARD ──
  console.log('\n─── Scoreboard ───');
  await check('GET /api/scoreboard (no token)', 'GET', '/api/scoreboard', null, 200);
  await check('GET /api/scoreboard (token)', 'GET', '/api/scoreboard', token, 200);

  // ── ADMIN LOGIN ──
  console.log('\n─── Admin Login ───');
  await check('POST /api/admin/login (wrong PIN)', 'POST', '/api/admin/login', null, 401);

  // ── EXPORT / IMPORT ──
  console.log('\n─── Export / Import ───');
  await check('GET /api/export (no token)', 'GET', '/api/export', null, 401);
  await check('GET /api/export (token)', 'GET', '/api/export', token, 200);
  await check('POST /api/import (no token)', 'POST', '/api/import', null, 401);
  await check('POST /api/import (token, valid)', 'POST', '/api/import', token, 200,
    { rounds: [], questions: [], candidates: [] });

  // ── PUBLIC SAFETY CHECK ──
  console.log('\n─── Security: Public endpoint joinToken check ───');
  const pubRes = await fetch(`${BASE}/api/candidates/public`);
  const pubBody = await pubRes.json();
  const bodyStr = JSON.stringify(pubBody);
  const hasToken = /joinToken/i.test(bodyStr);
  if (pubRes.status === 200 && !hasToken) {
    pass++;
    console.log('  PASS  GET /api/candidates/public     → 200, no joinToken present');
  } else {
    fail++;
    console.log(`  FAIL  GET /api/candidates/public     → ${pubRes.status}, joinToken present: ${hasToken}`);
  }

  // ── HEALTH ──
  console.log('\n─── Health ───');
  await check('GET /api/health (no token)', 'GET', '/api/health', null, 200);

  // ── SUMMARY ──
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(60)}\n`);

  process.exitCode = fail > 0 ? 1 : 0;
})().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
