'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname);
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

    const match1Id = 'replay-m1';
    const match2Id = 'replay-m2';
    const r1Id = 'replay-r1';
    const r2Id = 'replay-r2';

    const C = [
      { id: 'r-c1', name: 'Alice', joinToken: 'tok-r-c1', logoUrl: null },
      { id: 'r-c2', name: 'Bob',   joinToken: 'tok-r-c2', logoUrl: null },
      { id: 'r-c3', name: 'Carol', joinToken: 'tok-r-c3', logoUrl: null },
      { id: 'r-d1', name: 'Diana', joinToken: 'tok-r-d1', logoUrl: null },
      { id: 'r-d2', name: 'Eve',   joinToken: 'tok-r-d2', logoUrl: null },
      { id: 'r-d3', name: 'Frank', joinToken: 'tok-r-d3', logoUrl: null },
    ];

    const matches = [
      { id: match1Id, name: 'Replay Match 1', order: 1, candidateIds: ['r-c1', 'r-c2', 'r-c3'], status: 'not_started', winnerCandidateId: null },
      { id: match2Id, name: 'Replay Match 2', order: 2, candidateIds: ['r-d1', 'r-d2', 'r-d3'], status: 'not_started', winnerCandidateId: null },
    ];

    const rounds = [
      { id: r1Id, name: 'Round 1', order: 1, answerMode: 'MCQ', pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '', matchId: match1Id },
      { id: r2Id, name: 'Round 2', order: 1, answerMode: 'MCQ', pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0, instructions: '', matchId: match2Id },
    ];

    const questions = [
      { id: 'r-q1', roundId: r1Id, order: 1, text: 'What is 2+2?', mediaType: 'none', mediaUrl: null, options: [{"key":"A","text":"3"},{"key":"B","text":"4"},{"key":"C","text":"5"},{"key":"D","text":"6"}], correctOptionKey: 'B', pointsOverride: null, timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null },
      { id: 'r-q2', roundId: r1Id, order: 2, text: 'What is 3+3?', mediaType: 'none', mediaUrl: null, options: [{"key":"A","text":"5"},{"key":"B","text":"6"},{"key":"C","text":"7"},{"key":"D","text":"8"}], correctOptionKey: 'B', pointsOverride: null, timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null },
      { id: 'r-q3', roundId: r2Id, order: 1, text: 'What is 1+1?', mediaType: 'none', mediaUrl: null, options: [{"key":"A","text":"1"},{"key":"B","text":"2"},{"key":"C","text":"3"},{"key":"D","text":"4"}], correctOptionKey: 'B', pointsOverride: null, timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null },
    ];

    const matchScores = [
      { matchId: match1Id, candidateId: 'r-c1', score: 0 },
      { matchId: match1Id, candidateId: 'r-c2', score: 0 },
      { matchId: match1Id, candidateId: 'r-c3', score: 0 },
      { matchId: match2Id, candidateId: 'r-d1', score: 0 },
      { matchId: match2Id, candidateId: 'r-d2', score: 0 },
      { matchId: match2Id, candidateId: 'r-d3', score: 0 },
    ];

    const importRes = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matches, rounds, questions, match_scores: matchScores, candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })) }),
    });
    if (!importRes.ok) throw new Error(`Import failed (${importRes.status}): ${await importRes.text()}`);
    console.log('Seed data imported.\n');

    const { client: admin, events: adminEv } = await createClient(
      { auth: { token } }, ['game:state', 'scoreboard:update']
    );
    await adminEv['game:state'];

    const { client: cAlice } = await createClient(
      { query: { role: 'candidate', candidateId: 'r-c1', joinToken: 'tok-r-c1' } },
      ['game:state:public']
    );
    await cAlice.emit('candidate:requestState', { candidateId: 'r-c1' });

    const { client: cBob } = await createClient(
      { query: { role: 'candidate', candidateId: 'r-c2', joinToken: 'tok-r-c2' } },
      ['game:state:public']
    );
    await cBob.emit('candidate:requestState', { candidateId: 'r-c2' });

    // ══════════════════════════════════════════════════════════════
    //  STEP 1: Start Match 1. Alice wins Q1 (+10).
    // ══════════════════════════════════════════════════════════════
    console.log('─── STEP 1: Start Match 1, Alice wins Q1 (+10) ───');
    let startAck = await emitP(admin, 'admin:startMatch', { matchId: match1Id });
    assert('admin:startMatch(M1) acknowledged', startAck && startAck.success === true);

    let lockAck = await emitP(cAlice, 'candidate:lockAnswer', { candidateId: 'r-c1', optionKey: 'B' });
    assert('Alice (r-c1) lockAnswer: correct', lockAck && lockAck.success === true);

    await sleep(100);
    lockAck = await emitP(cBob, 'candidate:lockAnswer', { candidateId: 'r-c2', optionKey: 'B' });
    assert('Bob (r-c2) lockAnswer: correct but slower', lockAck && lockAck.success === true);

    let endAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('admin:endTimerNow acknowledged', endAck && endAck.success === true);
    await sleep(500);

    let sbRes = await fetch(`${BASE}/api/matches/${match1Id}/scoreboard`);
    let sb = await sbRes.json();
    assert('Alice = 10', sb.find((r) => r.id === 'r-c1').score === 10);
    assert('Bob = 0', sb.find((r) => r.id === 'r-c2').score === 0);
    assert('Carol = 0', sb.find((r) => r.id === 'r-c3').score === 0);

    // ══════════════════════════════════════════════════════════════
    //  STEP 2: Confirm GET shows +10 for Alice.
    // ══════════════════════════════════════════════════════════════
    console.log('\n─── STEP 2: Confirm scoreboard shows +10 for Alice ───');
    assert('GET confirms Alice=10', sb.find((r) => r.id === 'r-c1').score === 10);

    // Advance to Q2 so we can rewind back to Q1.
    console.log('\n─── Advance to Q2 ───');
    let nextAck = await emitP(admin, 'admin:nextQuestion', {});
    assert('admin:nextQuestion to Q2 ok', nextAck && nextAck.success === true);
    await sleep(300);

    sbRes = await fetch(`${BASE}/api/matches/${match1Id}/scoreboard`);
    sb = await sbRes.json();
    assert('Alice still 10 on Q2', sb.find((r) => r.id === 'r-c1').score === 10);

    // ══════════════════════════════════════════════════════════════
    //  STEP 3: Previous Question back to Q1 — +10 reversed.
    // ══════════════════════════════════════════════════════════════
    console.log('\n─── STEP 3: Previous Question back to Q1, reversal ───');
    let sbP = waitForEvent(admin, 'scoreboard:update', 8000);

    let prevAck = await emitP(admin, 'admin:prevQuestion', {});
    assert('admin:prevQuestion ok', prevAck && prevAck.success === true);

    let sbUpd = await sbP;
    assert('scoreboard:update shows Alice=0', sbUpd.find((r) => r.id === 'r-c1').score === 0);

    sbRes = await fetch(`${BASE}/api/matches/${match1Id}/scoreboard`);
    sb = await sbRes.json();
    assert('GET scoreboard: Alice=0 after reversal', sb.find((r) => r.id === 'r-c1').score === 0);

    // ══════════════════════════════════════════════════════════════
    //  STEP 4: Re-answer Q1 — Bob wins. Only Bob has +10.
    // ══════════════════════════════════════════════════════════════
    console.log('\n─── STEP 4: Re-answer Q1, Bob wins ───');
    lockAck = await emitP(cAlice, 'candidate:lockAnswer', { candidateId: 'r-c1', optionKey: 'A' });
    assert('Alice locks wrong A', lockAck && lockAck.success === true);

    await sleep(50);
    lockAck = await emitP(cBob, 'candidate:lockAnswer', { candidateId: 'r-c2', optionKey: 'B' });
    assert('Bob locks correct B', lockAck && lockAck.success === true);

    endAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('admin:endTimerNow (2nd) ok', endAck && endAck.success === true);
    await sleep(500);

    sbRes = await fetch(`${BASE}/api/matches/${match1Id}/scoreboard`);
    sb = await sbRes.json();
    assert('Bob = +10', sb.find((r) => r.id === 'r-c2').score === 10);
    assert('Alice = 0', sb.find((r) => r.id === 'r-c1').score === 0);
    assert('Carol = 0', sb.find((r) => r.id === 'r-c3').score === 0);

    // ══════════════════════════════════════════════════════════════
    //  STEP 5: Check score_log for r-q1 + match1Id.
    // ══════════════════════════════════════════════════════════════
    console.log('\n─── STEP 5: Inspect score_log for Q1 ───');
    const Database = require('better-sqlite3');
    const db = new Database(path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite'));

    const q1Logs = db.prepare("SELECT * FROM score_log WHERE questionId = 'r-q1' AND matchId = 'replay-m1' ORDER BY timestamp ASC").all();
    console.log(`  ${q1Logs.length} logs for Q1:`);
    for (const l of q1Logs) {
      console.log(`    ${String(l.reason).padEnd(28)} ${l.candidateId}  pointsChange=${l.pointsChange}`);
    }

    assert('Exactly 3 logs for Q1', q1Logs.length === 3);
    assert('Log[0] = Alice win +10', q1Logs[0].reason === 'timed_ranking_win' && q1Logs[0].candidateId === 'r-c1' && q1Logs[0].pointsChange === 10);
    assert('Log[1] = Alice reversal -10', q1Logs[1].reason === 'question_replay_reversal' && q1Logs[1].candidateId === 'r-c1' && q1Logs[1].pointsChange === -10);
    assert('Log[2] = Bob win +10', q1Logs[2].reason === 'timed_ranking_win' && q1Logs[2].candidateId === 'r-c2' && q1Logs[2].pointsChange === 10);

    const sumQ1 = q1Logs.reduce((s, l) => s + l.pointsChange, 0);
    assert('Net sum for Q1 = 10 (Bob wins)', sumQ1 === 10);

    // ══════════════════════════════════════════════════════════════
    //  STEP 6: Confirm Match 2 scores unaffected.
    // ══════════════════════════════════════════════════════════════
    console.log('\n─── STEP 6: Confirm Match 2 scores unaffected ───');
    const sb2Res = await fetch(`${BASE}/api/matches/${match2Id}/scoreboard`);
    const sb2 = await sb2Res.json();
    assert('Match 2 has 3 entries', sb2.length === 3);
    assert('Match 2 all zero', sb2.every((r) => r.score === 0));

    const m2Logs = db.prepare("SELECT * FROM score_log WHERE matchId = 'replay-m2'").all();
    assert('No score_log for Match 2', m2Logs.length === 0);

    const m2Ms = db.prepare("SELECT * FROM match_scores WHERE matchId = 'replay-m2'").all();
    assert('Match 2 match_scores all zero', m2Ms.every((r) => r.score === 0));

    admin.disconnect();
    cAlice.disconnect();
    cBob.disconnect();
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
