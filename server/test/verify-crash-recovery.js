/**
 * Verification for crash recovery: timer & gap resume on server restart.
 *
 * Test scenarios:
 *   1. Server crashes mid-QUESTION_SHOWN with timer expired → boot resumes to
 *      TIME_UP/GAP/RESULTS and scoring happens exactly once.
 *   2. Server crashes mid-GAP with gap expired → boot resumes to RESULTS.
 *   3. Server crashes after RESULTS (already scored) → boot does NOT
 *      double-score the same question.
 *
 * Usage: node server/test/verify-crash-recovery.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(SERVER_DIR, 'src', 'db', 'quiz.sqlite');
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
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    // Force kill after 3 seconds if SIGTERM didn't work
    setTimeout(() => { try { server.kill('SIGKILL'); } catch (_) {} }, 3000);
  });
}

// ── Seed data ──
const CANDIDATES = [
  { id: 'cr-alice', name: 'Alice', joinToken: 'cr-tok-alice', logoUrl: null },
  { id: 'cr-bob',   name: 'Bob',   joinToken: 'cr-tok-bob',   logoUrl: null },
];
const MATCH_ID = 'cr-match-1';

const SEED_DOCUMENT = {
  matches: [
    { id: MATCH_ID, name: 'Crash Recovery Match', order: 1, candidateIds: ['cr-alice', 'cr-bob'], status: 'not_started' },
  ],
  match_scores: [
    { matchId: MATCH_ID, candidateId: 'cr-alice', score: 0 },
    { matchId: MATCH_ID, candidateId: 'cr-bob', score: 0 },
  ],
  rounds: [
    {
      id: 'cr-r1', name: 'MCQ Round', order: 1, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 8, gapEnabled: 0, gapSeconds: 0,
      instructions: 'Crash recovery MCQ', matchId: MATCH_ID,
    },
  ],
  questions: [
    {
      id: 'cr-q1', roundId: 'cr-r1', order: 1, text: 'What is 2+2?',
      mediaType: 'none', mediaUrl: null,
      options: [
        { key: 'A', text: '3' }, { key: 'B', text: '4' },
        { key: 'C', text: '5' }, { key: 'D', text: '6' },
      ],
      correctOptionKey: 'B', pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    },
  ],
  candidates: CANDIDATES.map(c => ({ ...c, score: 0, isActive: 1 })),
};

async function main() {
  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Start server, seed data, play question to RESULTS, kill server
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 1: Play question to RESULTS then kill server ===');
  let server = spawnServer();

  try {
    await waitForServerReady();
    console.log('  Server #1 is up.');

    const token = await adminLogin();
    const importRes = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(SEED_DOCUMENT),
    });
    if (!importRes.ok) throw new Error(`Import failed: ${await importRes.text()}`);
    console.log('  Seed data imported.');

    // Connect admin + candidates
    const { client: admin, events: adminEv } = await createClient(
      { auth: { token } }, ['game:state', 'scoreboard:update', 'results:revealed']
    );
    await adminEv['game:state'];

    const { client: alice } = await createClient(
      { query: { candidateId: 'cr-alice', joinToken: 'cr-tok-alice' } },
      ['game:state:public']
    );
    const { client: bob } = await createClient(
      { query: { candidateId: 'cr-bob', joinToken: 'cr-tok-bob' } },
      ['game:state:public']
    );

    // Start match
    const startAck = await emitP(admin, 'admin:startMatch', { matchId: MATCH_ID });
    assert('startMatch acknowledged', startAck && startAck.success === true);

    // Alice locks correct answer (B)
    await sleep(300);
    const lockAck = await emitP(alice, 'candidate:lockAnswer', { candidateId: 'cr-alice', optionKey: 'B' });
    assert('Alice lockAnswer acknowledged', lockAck && lockAck.success === true);

    // End timer → MCQ auto-resolves → RESULTS (gap disabled)
    const resultsP = waitForEvent(admin, 'results:revealed', 15000);
    const scoreP = waitForEvent(admin, 'scoreboard:update', 15000);

    const endAck = await emitP(admin, 'admin:endTimerNow', {});
    assert('endTimerNow acknowledged', endAck && endAck.success === true);

    const results = await resultsP;
    assert('Results revealed - Alice is winner', results.winnerCandidateId === 'cr-alice');

    const scoreboard = await scoreP;
    const aliceScore = scoreboard.find(c => c.id === 'cr-alice');
    assert('Alice has 10 pts after Q1', aliceScore && aliceScore.score === 10);

    console.log('  Question played to RESULTS. Alice has 10 pts.');

    // Disconnect clients before killing
    admin.disconnect();
    alice.disconnect();
    bob.disconnect();
  } finally {
    await killServer(server);
    console.log('  Server #1 killed.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: Scoring Safety — restart server with state still at RESULTS.
  //   resumeGameStateOnBoot should NOT re-score the question.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 2: Restart server — verify no double-scoring in RESULTS phase ===');

  // Read score before restart
  const Database = require('better-sqlite3');
  let db = new Database(DB_PATH, { readonly: true });
  const scoreBefore = db.prepare(
    "SELECT score FROM match_scores WHERE matchId = ? AND candidateId = ?"
  ).get(MATCH_ID, 'cr-alice');
  const logCountBefore = db.prepare(
    "SELECT COUNT(*) AS cnt FROM score_log WHERE matchId = ? AND questionId = 'cr-q1'"
  ).get(MATCH_ID);
  db.close();

  assert('Alice score before restart is 10', scoreBefore && scoreBefore.score === 10);
  console.log(`  score_log rows for cr-q1 before restart: ${logCountBefore.cnt}`);

  // Restart server — resumeGameStateOnBoot fires on boot
  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server #2 is up (RESULTS phase recovery).');

    // Give boot recovery a moment to run
    await sleep(1000);

    // Check scores via API
    const token2 = await adminLogin();
    const sbRes = await fetch(`${BASE}/api/matches/${MATCH_ID}/scoreboard`);
    const sb = await sbRes.json();
    const aliceAfter = sb.find(c => c.id === 'cr-alice');
    assert('Alice score UNCHANGED after restart (still 10)', aliceAfter && aliceAfter.score === 10);

    // Check score_log count via direct DB access
    db = new Database(DB_PATH, { readonly: true });
    const logCountAfter = db.prepare(
      "SELECT COUNT(*) AS cnt FROM score_log WHERE matchId = ? AND questionId = 'cr-q1'"
    ).get(MATCH_ID);
    db.close();

    assert('score_log row count unchanged after restart', logCountAfter.cnt === logCountBefore.cnt);
    console.log(`  score_log rows for cr-q1 after restart: ${logCountAfter.cnt}`);

  } finally {
    await killServer(server);
    console.log('  Server #2 killed.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Timer Recovery — manually set game_state to QUESTION_SHOWN with
  //   an expired timerStartedAt, restart server, verify it auto-resolves.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 3: Timer expired during crash — verify auto-resolve on boot ===');

  // Tamper with DB: set phase to QUESTION_SHOWN with a timerStartedAt far in the past
  db = new Database(DB_PATH);
  const expiredTimerStartedAt = Date.now() - 60000; // 60 seconds ago (timer is 8s)
  db.prepare(
    `UPDATE game_state SET phase = 'QUESTION_SHOWN', timerStartedAt = ?, resultsRevealed = 0,
     winnerCandidateId = NULL WHERE id = 1`
  ).run(expiredTimerStartedAt);
  db.close();
  console.log('  DB tampered: phase=QUESTION_SHOWN, timerStartedAt=60s ago');

  // Also reset scores so we can detect if scoring runs on recovery
  db = new Database(DB_PATH);
  // Delete old score_logs for cr-q1 and reset match_scores to 0 to test fresh
  db.prepare("DELETE FROM score_log WHERE matchId = ? AND questionId = 'cr-q1'").run(MATCH_ID);
  db.prepare("UPDATE match_scores SET score = 0 WHERE matchId = ?").run(MATCH_ID);
  db.close();
  console.log('  Scores reset to 0, score_logs cleared for cr-q1.');

  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server #3 is up (expired timer recovery).');

    // resumeGameStateOnBoot should have fired handleTimeUp → enterGap/revealResults
    await sleep(2000);

    // Check the game state — it should no longer be QUESTION_SHOWN
    db = new Database(DB_PATH, { readonly: true });
    const stateRow = db.prepare("SELECT phase FROM game_state WHERE id = 1").get();
    db.close();

    assert('Phase is no longer QUESTION_SHOWN after boot',
      stateRow && stateRow.phase !== 'QUESTION_SHOWN');
    console.log(`  Phase after boot recovery: ${stateRow && stateRow.phase}`);

    // Check that scoring happened (Alice locked correct answer B, she should have points)
    const token3 = await adminLogin();
    const sbRes3 = await fetch(`${BASE}/api/matches/${MATCH_ID}/scoreboard`);
    const sb3 = await sbRes3.json();
    const aliceRecovered = sb3.find(c => c.id === 'cr-alice');
    assert('Alice scored after timer-expired recovery', aliceRecovered && aliceRecovered.score === 10);
    console.log(`  Alice score after recovery: ${aliceRecovered && aliceRecovered.score}`);

    // Verify exactly 1 timed_ranking_win log
    db = new Database(DB_PATH, { readonly: true });
    const winLogs = db.prepare(
      "SELECT * FROM score_log WHERE matchId = ? AND questionId = 'cr-q1' AND reason = 'timed_ranking_win'"
    ).all(MATCH_ID);
    db.close();
    assert('Exactly 1 timed_ranking_win log entry', winLogs.length === 1);

  } finally {
    await killServer(server);
    console.log('  Server #3 killed.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: GAP Recovery — set phase to GAP with expired gapStartedAt,
  //   restart, verify it auto-reveals results.
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== PHASE 4: Gap expired during crash — verify auto-resolve on boot ===');

  // Tamper DB: set phase to GAP with expired gapStartedAt
  db = new Database(DB_PATH);
  // Reset scores and logs first
  db.prepare("DELETE FROM score_log WHERE matchId = ? AND questionId = 'cr-q1'").run(MATCH_ID);
  db.prepare("UPDATE match_scores SET score = 0 WHERE matchId = ?").run(MATCH_ID);

  const expiredGapStartedAt = Date.now() - 60000; // 60 seconds ago (gap is 10s or whatever)
  db.prepare(
    `UPDATE game_state SET phase = 'GAP', gapStartedAt = ?, timerStartedAt = NULL,
     resultsRevealed = 0, winnerCandidateId = NULL WHERE id = 1`
  ).run(expiredGapStartedAt);
  db.close();
  console.log('  DB tampered: phase=GAP, gapStartedAt=60s ago');

  server = spawnServer();
  try {
    await waitForServerReady();
    console.log('  Server #4 is up (expired gap recovery).');

    await sleep(2000);

    // Phase should have moved to RESULTS
    db = new Database(DB_PATH, { readonly: true });
    const stateRow4 = db.prepare("SELECT phase, resultsRevealed FROM game_state WHERE id = 1").get();
    db.close();

    assert('Phase is RESULTS after gap-expired recovery', stateRow4 && stateRow4.phase === 'RESULTS');
    assert('resultsRevealed is true', stateRow4 && Boolean(stateRow4.resultsRevealed));
    console.log(`  Phase after gap recovery: ${stateRow4 && stateRow4.phase}`);

  } finally {
    await killServer(server);
    console.log('  Server #4 killed.');
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('VERIFY ERROR:', err);
  process.exitCode = 1;
});
