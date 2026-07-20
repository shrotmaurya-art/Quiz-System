/**
 * Verification for match isolation, single-in-progress enforcement,
 * scoreboard public-safety (no joinToken), and admin-only judging payload
 * now including elapsed times (Task: match isolation verification).
 *
 * Self-contained: spawns the server on an isolated port and asserts:
 *   1. Two matches with different candidate subsets exist (GET /api/matches).
 *   2. Start Match 1, run one OPEN question through to reveal.
 *      - match_scores updates for Match 1 only (C1 scores points).
 *      - GET /api/matches/2/scoreboard shows all zeros (untouched).
 *   3. admin:startMatch for Match 2 while Match 1 is in_progress is rejected.
 *   4. End Match 1: winnerCandidateId set correctly; game_state.matchId resets to null.
 *   5. GET /api/matches/:id/scoreboard never returns joinToken.
 *   6. Judging panel's admin-only payload includes elapsed times
 *      (judging:started -> rankedCandidates[].elapsedMs is a number).
 *
 * The "grep display/candidate folders for the elapsed-time field -> zero matches"
 * check is performed separately with the search_files tool, since it inspects
 * the client source tree rather than runtime state.
 *
 * Usage: node server/test/verify-match-isolation.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3999;
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

    // ── Seed document: 7 candidates, 2 matches, OPEN round for M1, round for M2 ──
    const C = [
      { id: 'm-c1', name: 'C1', joinToken: 'tok-c1', logoUrl: null },
      { id: 'm-c2', name: 'C2', joinToken: 'tok-c2', logoUrl: null },
      { id: 'm-c3', name: 'C3', joinToken: 'tok-c3', logoUrl: null },
      { id: 'm-c4', name: 'C4', joinToken: 'tok-c4', logoUrl: null },
      { id: 'm-c5', name: 'C5', joinToken: 'tok-c5', logoUrl: null },
      { id: 'm-c6', name: 'C6', joinToken: 'tok-c6', logoUrl: null },
      { id: 'm-c7', name: 'C7', joinToken: 'tok-c7', logoUrl: null },
    ];

    const matches = [
      { id: 'm-match1', name: 'Match 1', order: 1, candidateIds: ['m-c1', 'm-c2', 'm-c3', 'm-c4'], status: 'not_started', winnerCandidateId: null },
      { id: 'm-match2', name: 'Match 2', order: 2, candidateIds: ['m-c5', 'm-c6', 'm-c7'], status: 'not_started', winnerCandidateId: null },
    ];

    const r1Id = 'm-round1', r2Id = 'm-round2';
    const rounds = [
      { id: r1Id, name: 'Round 1', order: 1, answerMode: 'OPEN', pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '', matchId: 'm-match1' },
      { id: r2Id, name: 'Round 2', order: 1, answerMode: 'OPEN', pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '', matchId: 'm-match2' },
    ];
    const questions = [
      {
        id: 'm-q1', roundId: r1Id, order: 1, text: 'What is 2+2?',
        mediaType: 'none', mediaUrl: null,
        options: [], correctOptionKey: 'four', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      },
      {
        id: 'm-q2', roundId: r2Id, order: 1, text: 'What is 3+3?',
        mediaType: 'none', mediaUrl: null,
        options: [], correctOptionKey: 'six', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      },
    ];

    const matchScores = [
      ...['m-c1', 'm-c2', 'm-c3', 'm-c4'].map((cid) => ({ matchId: 'm-match1', candidateId: cid, score: 0 })),
      ...['m-c5', 'm-c6', 'm-c7'].map((cid) => ({ matchId: 'm-match2', candidateId: cid, score: 0 })),
    ];

    const importRes = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matches, rounds, questions, match_scores: matchScores, candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })) }),
    });
    if (!importRes.ok) throw new Error(`Import failed (${importRes.status}): ${await importRes.text()}`);

    // ── 1. Both matches exist with correct candidate subsets ──
    const matchesRes = await fetch(`${BASE}/api/matches`, { headers: { Authorization: `Bearer ${token}` } });
    const allMatches = await matchesRes.json();
    assert('GET /api/matches returns 2 matches', Array.isArray(allMatches) && allMatches.length === 2);
    const m1 = allMatches.find((m) => m.id === 'm-match1');
    const m2 = allMatches.find((m) => m.id === 'm-match2');
    assert('Match 1 candidateIds = [C1,C2,C3,C4]',
      m1 && JSON.stringify(m1.candidateIds) === JSON.stringify(['m-c1', 'm-c2', 'm-c3', 'm-c4']));
    assert('Match 2 candidateIds = [C5,C6,C7]',
      m2 && JSON.stringify(m2.candidateIds) === JSON.stringify(['m-c5', 'm-c6', 'm-c7']));

    // ── Set up sockets ──
    const { client: admin, events: adminEv } = await createClient(
      { auth: { token } }, ['game:state', 'judging:started', 'scoreboard:update']
    );
    await adminEv['game:state'];

    const { client: c1 } = await createClient(
      { query: { role: 'candidate', candidateId: 'm-c1', joinToken: 'tok-c1' } },
      ['game:state:public']
    );
    await c1.emit('candidate:requestState', { candidateId: 'm-c1' });

    // ── 2. Start Match 1 ──
    const startAck = await emitP(admin, 'admin:startMatch', { matchId: 'm-match1' });
    assert('admin:startMatch(M1) acknowledged', startAck && startAck.success === true);

    // C1 locks in an answer
    const lockAck = await emitP(c1, 'candidate:lockAnswer', { candidateId: 'm-c1', optionKey: 'four' });
    assert('candidate C1 lockAnswer acknowledged', lockAck && lockAck.success === true);

    // End timer -> JUDGING, judging:started emitted with elapsedMs
    const judgingP = waitForEvent(admin, 'judging:started', 8000);
    const endTimerAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('admin:endTimerNow acknowledged', endTimerAck && endTimerAck.success === true);

    const judging = await judgingP;
    console.log('  judging:started payload:', JSON.stringify(judging));
    assert('judging:started has rankedCandidates', judging && Array.isArray(judging.rankedCandidates));
    const c1Rank = judging && judging.rankedCandidates.find((r) => r.candidateId === 'm-c1');
    assert('judging payload includes elapsedMs for C1', c1Rank && typeof c1Rank.elapsedMs === 'number' && c1Rank.elapsedMs !== null);
    assert('judging payload elapsedMs is >= 0', c1Rank && c1Rank.elapsedMs >= 0);

    // Submit judgement (correct) then reveal results
    const judgeAck = await emitP(admin, 'admin:submitJudgement', { candidateId: 'm-c1', isCorrect: true });
    assert('admin:submitJudgement acknowledged', judgeAck && judgeAck.success === true);

    const resultsP = waitForEvent(admin, 'game:state', 8000);
    const advanceAck = await emitP(admin, 'admin:advanceFromGap', {});
    assert('admin:advanceFromGap acknowledged', advanceAck && advanceAck.success === true);
    await resultsP;

    // ── 2b. Match 1 scoreboard: C1 scored, others 0; no joinToken ──
    const sb1Res = await fetch(`${BASE}/api/matches/m-match1/scoreboard`);
    const sb1 = await sb1Res.json();
    assert('GET /api/matches/1/scoreboard returns 4 rows', Array.isArray(sb1) && sb1.length === 4);
    const c1Score = sb1.find((r) => r.id === 'm-c1');
    assert('Match 1 C1 has points (>0) after reveal', c1Score && c1Score.score > 0);
    assert('Match 1 other candidates still 0', sb1.filter((r) => r.id !== 'm-c1').every((r) => r.score === 0));
    assert('Match 1 scoreboard never returns joinToken', sb1.every((r) => !('joinToken' in r)));

    // ── 2c. Match 2 scoreboard untouched (all zeros); no joinToken ──
    const sb2Res = await fetch(`${BASE}/api/matches/m-match2/scoreboard`);
    const sb2 = await sb2Res.json();
    assert('GET /api/matches/2/scoreboard returns 3 rows', Array.isArray(sb2) && sb2.length === 3);
    assert('Match 2 scoreboard all zeros (untouched)', sb2.every((r) => r.score === 0));
    assert('Match 2 scoreboard never returns joinToken', sb2.every((r) => !('joinToken' in r)));

    // ── 3. Try admin:startMatch for Match 2 while Match 1 in_progress -> rejected ──
    const startM2Ack = await emitP(admin, 'admin:startMatch', { matchId: 'm-match2' });
    assert('admin:startMatch(M2) rejected while M1 in_progress',
      startM2Ack && startM2Ack.success !== true && !!startM2Ack.error);
    console.log('  rejection message:', startM2Ack && startM2Ack.error);

    // ── 4. End Match 1: winner set, game_state.matchId resets to null ──
    const endMatchAck = await emitP(admin, 'admin:endMatch', { matchId: 'm-match1' });
    assert('admin:endMatch(M1) acknowledged', endMatchAck && endMatchAck.success === true);
    assert('endMatch ack reports winnerCandidateId = C1', endMatchAck && endMatchAck.winnerCandidateId === 'm-c1');

    const m1AfterRes = await fetch(`${BASE}/api/matches/m-match1/scoreboard`).then((r) => r); // ensure route exists
    const m1StatusRes = await fetch(`${BASE}/api/matches`, { headers: { Authorization: `Bearer ${token}` } });
    const m1After = (await m1StatusRes.json()).find((m) => m.id === 'm-match1');
    assert('Match 1 status is completed after endMatch', m1After && m1After.status === 'completed');
    assert('Match 1 winnerCandidateId persisted = C1', m1After && m1After.winnerCandidateId === 'm-c1');

    // game_state.matchId resets to null — request fresh state from admin
    const gsP = waitForEvent(admin, 'game:state', 8000);
    admin.emit('admin:requestState');
    const gs = await gsP;
    console.log('  game_state after endMatch: matchId =', gs && gs.matchId);
    assert('game_state.matchId reset to null after endMatch', gs && gs.matchId === null);

    admin.disconnect();
    c1.disconnect();
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