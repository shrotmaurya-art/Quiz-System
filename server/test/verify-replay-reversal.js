/**
 * Verification for replay scoring reversal:
 * 1. Score Q1 -> C1 gets +10 points (timed_ranking_win).
 * 2. Advance to Q2 -> scoreboard remains.
 * 3. Rewind to Q1 -> C1 points reversed (-10, reason 'question_replay_reversal').
 * 4. Verify original log remains, new log created, scoreboard broadcast fired, and GET matches scoreboard matches.
 * 5. Verify manual_adjustment logs are untouched.
 *
 * Usage: node server/test/verify-replay-reversal.js
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

    // ── Seed: 2 candidates, 1 match, OPEN round with 2 questions ──
    const C = [
      { id: 'c1', name: 'C1', joinToken: 'tok-c1', logoUrl: null },
      { id: 'c2', name: 'C2', joinToken: 'tok-c2', logoUrl: null },
    ];
    const matches = [
      { id: 'match1', name: 'Match 1', order: 1, candidateIds: ['c1', 'c2'], status: 'not_started', winnerCandidateId: null },
    ];
    const r1Id = 'round1';
    const rounds = [
      { id: r1Id, name: 'Round 1', order: 1, answerMode: 'OPEN', pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '', matchId: 'match1' },
    ];
    const questions = [
      {
        id: 'q1', roundId: r1Id, order: 1, text: 'Q1 Text?',
        mediaType: 'none', mediaUrl: null,
        options: [], correctOptionKey: 'ans1', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      },
      {
        id: 'q2', roundId: r1Id, order: 2, text: 'Q2 Text?',
        mediaType: 'none', mediaUrl: null,
        options: [], correctOptionKey: 'ans2', pointsOverride: null,
        timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
      },
    ];
    const matchScores = [
      { matchId: 'match1', candidateId: 'c1', score: 0 },
      { matchId: 'match1', candidateId: 'c2', score: 0 },
    ];

    const importRes = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matches, rounds, questions, match_scores: matchScores, candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })) }),
    });
    if (!importRes.ok) throw new Error(`Import failed (${importRes.status}): ${await importRes.text()}`);

    // Set up sockets
    const { client: admin, events: adminEv } = await createClient(
      { auth: { token } }, ['game:state', 'judging:started', 'scoreboard:update']
    );
    await adminEv['game:state'];

    const { client: c1 } = await createClient(
      { query: { role: 'candidate', candidateId: 'c1', joinToken: 'tok-c1' } },
      ['game:state:public']
    );
    await c1.emit('candidate:requestState', { candidateId: 'c1' });

    // Start match
    const startAck = await emitP(admin, 'admin:startMatch', { matchId: 'match1' });
    assert('admin:startMatch acknowledged', startAck && startAck.success === true);

    // C1 locks answer
    const lockAck = await emitP(c1, 'candidate:lockAnswer', { candidateId: 'c1' });
    assert('candidate lockAnswer acknowledged', lockAck && lockAck.success === true);

    // End timer
    const judgingP = waitForEvent(admin, 'judging:started', 8000);
    const endTimerAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('admin:endTimerNow acknowledged', endTimerAck && endTimerAck.success === true);
    await judgingP;

    // Submit correct judgement -> C1 scored +10
    const judgeAck = await emitP(admin, 'admin:submitJudgement', { candidateId: 'c1', isCorrect: true });
    assert('admin:submitJudgement correct acknowledged', judgeAck && judgeAck.success === true);

    // Reveal results
    const resultsP = waitForEvent(admin, 'game:state', 8000);
    const advanceAck = await emitP(admin, 'admin:advanceFromGap', {});
    assert('admin:advanceFromGap acknowledged', advanceAck && advanceAck.success === true);
    await resultsP;

    // Verify scoreboard has C1 with 10 points
    let sbRes = await fetch(`${BASE}/api/matches/match1/scoreboard`);
    let sb = await sbRes.json();
    assert('Match 1 C1 has 10 points', sb.find((r) => r.id === 'c1').score === 10);

    // ── Transition to Q2 ──
    const nextQStateP = waitForEvent(admin, 'game:state', 8000);
    const nextAck = await emitP(admin, 'admin:nextQuestion', {});
    assert('admin:nextQuestion to Q2 acknowledged', nextAck && nextAck.success === true);
    const q2State = await nextQStateP;
    assert('Current question is now Q2', q2State && q2State.currentQuestionId === 'q2');

    // Scoreboard should still show C1 has 10 points (going to Q2 doesn't reverse Q1 yet)
    sbRes = await fetch(`${BASE}/api/matches/match1/scoreboard`);
    sb = await sbRes.json();
    assert('Match 1 C1 still has 10 points on Q2', sb.find((r) => r.id === 'c1').score === 10);

    // ── Rewind to Q1 ──
    const prevQStateP = waitForEvent(admin, 'game:state', 8000);
    const scoreboardUpdateP = waitForEvent(admin, 'scoreboard:update', 8000);

    const prevAck = await emitP(admin, 'admin:prevQuestion', {});
    assert('admin:prevQuestion to Q1 acknowledged', prevAck && prevAck.success === true);
    const q1State = await prevQStateP;
    assert('Current question is now Q1', q1State && q1State.currentQuestionId === 'q1');

    // Verify scoreboard:update broadcast was received immediately
    const sbBroadcast = await scoreboardUpdateP;
    assert('scoreboard:update broadcast received immediately', !!sbBroadcast);
    assert('scoreboard:update broadcast has C1 with 0 points', sbBroadcast.find((r) => r.id === 'c1').score === 0);

    // Verify GET /api/matches/:id/scoreboard reflects 0 immediately
    sbRes = await fetch(`${BASE}/api/matches/match1/scoreboard`);
    sb = await sbRes.json();
    assert('GET scoreboard reflects 0 score immediately', sb.find((r) => r.id === 'c1').score === 0);

    // ── Verify score_log state ──
    // Open DB directly to inspect score_logs (WAL mode allows concurrent reads)
    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'));

    const q1Logs = db.prepare("SELECT * FROM score_log WHERE questionId = 'q1' AND matchId = 'match1'").all();
    assert('2 logs exist for q1 + match1', q1Logs.length === 2);

    const winLog = q1Logs.find((l) => l.reason === 'timed_ranking_win');
    assert('timed_ranking_win log still exists', !!winLog);
    assert('win pointsChange was 10', winLog.pointsChange === 10);

    const reversalLog = q1Logs.find((l) => l.reason === 'question_replay_reversal');
    assert('question_replay_reversal log exists', !!reversalLog);
    assert('reversal pointsChange is -10', reversalLog.pointsChange === -10);
    assert('reversal log is for c1', reversalLog.candidateId === 'c1');

    // ── Verify manual_adjustment are untouched ──
    const adjustAck = await emitP(admin, 'admin:adjustScore', { candidateId: 'c1', delta: 5, reason: 'manual test adjustment' });
    assert('admin:adjustScore delta=5 acknowledged', adjustAck && adjustAck.success === true);

    const manualLog = db.prepare("SELECT * FROM score_log WHERE reason = 'manual_adjustment'").get();
    assert('manual_adjustment log exists', !!manualLog);
    assert('manual pointsChange is 5', manualLog.pointsChange === 5);

    // Rewind back to Q1 again (simulates another entry to Q1)
    await emitP(admin, 'admin:nextQuestion', {});
    await emitP(admin, 'admin:prevQuestion', {});

    // Ensure manual score log has NOT been altered or reversed
    const manualLogs = db.prepare("SELECT * FROM score_log WHERE reason = 'manual_adjustment'").all();
    assert('Exactly 1 manual_adjustment log exists (untouched)', manualLogs.length === 1);
    assert('Manual adjustment value remains 5', manualLogs[0].pointsChange === 5);

    const finalSbRes = await fetch(`${BASE}/api/matches/match1/scoreboard`);
    const finalSb = await finalSbRes.json();
    assert('C1 score includes the manual adjustment (5 points)', finalSb.find((r) => r.id === 'c1').score === 5);

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
