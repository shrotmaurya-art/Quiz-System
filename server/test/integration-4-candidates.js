'use strict';

/**
 * Integration test: 4 candidates, MCQ + OPEN questions, staggered lock-ins.
 * Runs against a RUNNING dev server (npm run dev).
 *
 * Usage:
 *   node server/test/integration-4-candidates.js
 *
 * The test seeds its own data via POST /api/import, so it's self-contained.
 */

const { io: Client } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:4000';

let pass = 0;
let fail = 0;

function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.error(`  FAIL  ${label}`); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitForEvent(socket, event, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

function emitP(socket, event, data) {
  return new Promise((resolve) => {
    socket.emit(event, data, (ack) => resolve(ack));
    setTimeout(() => resolve(null), 5000);
  });
}

function createClient(opts, eventsToListen) {
  return new Promise((resolve, reject) => {
    const client = Client(BASE, {
      query: opts.query || {},
      auth: opts.auth || {},
      reconnection: false,
      forceNew: true,
      autoConnect: false,
      transports: ['websocket']
    });
    const promises = {};
    for (const event of eventsToListen) {
      promises[event] = waitForEvent(client, event, 30000);
    }
    const connectP = new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('connect timeout')), 5000);
      client.on('connect', () => { clearTimeout(t); res(); });
      client.on('connect_error', (err) => { clearTimeout(t); rej(err); });
    });
    client.connect();
    connectP.then(() => resolve({ client, events: promises })).catch(reject);
  });
}

// ── Seed data ──
const CANDIDATES = [
  { id: 'int-alice',   name: 'Alice',   joinToken: 'int-tok-alice' },
  { id: 'int-bob',     name: 'Bob',     joinToken: 'int-tok-bob' },
  { id: 'int-charlie', name: 'Charlie', joinToken: 'int-tok-charlie' },
  { id: 'int-dana',    name: 'Dana',    joinToken: 'int-tok-dana' },
];

const MATCH_ID = 'int-match-1';

const SEED_DOCUMENT = {
  matches: [
    {
      id: MATCH_ID,
      name: 'Integration Match',
      order: 1,
      candidateIds: ['int-alice', 'int-bob', 'int-charlie', 'int-dana'],
      status: 'not_started'
    }
  ],
  match_scores: [
    { matchId: MATCH_ID, candidateId: 'int-alice', score: 0 },
    { matchId: MATCH_ID, candidateId: 'int-bob', score: 0 },
    { matchId: MATCH_ID, candidateId: 'int-charlie', score: 0 },
    { matchId: MATCH_ID, candidateId: 'int-dana', score: 0 },
  ],
  rounds: [
    {
      id: 'int-r-mcq', name: 'MCQ Round', order: 1, answerMode: 'MCQ',
      pointsPerQuestion: 10, timeLimitSeconds: 10, gapEnabled: 0, gapSeconds: 0,
      instructions: 'Integration test MCQ', matchId: MATCH_ID,
    },
    {
      id: 'int-r-open', name: 'Rapid Fire', order: 2, answerMode: 'OPEN',
      pointsPerQuestion: 10, timeLimitSeconds: 10, gapEnabled: 0, gapSeconds: 0,
      instructions: 'Integration test OPEN', matchId: MATCH_ID,
    },
  ],
  questions: [
    {
      id: 'int-q-mcq', roundId: 'int-r-mcq', order: 1, text: 'Capital of France?',
      mediaType: 'none', mediaUrl: null,
      options: [
        { key: 'A', text: 'Berlin' },
        { key: 'B', text: 'Paris' },
        { key: 'C', text: 'Madrid' },
        { key: 'D', text: 'Rome' },
      ],
      correctOptionKey: 'B', pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    },
    {
      id: 'int-q-open', roundId: 'int-r-open', order: 1, text: 'Name a prime number between 20 and 30.',
      mediaType: 'none', mediaUrl: null,
      options: [],
      correctOptionKey: null, pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    },
  ],
  candidates: CANDIDATES.map(c => ({
    ...c, logoUrl: null, score: 0, isActive: 1,
  })),
};

async function importSeedData(token) {
  const res = await fetch(`${BASE}/api/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(SEED_DOCUMENT),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Import failed (${res.status}): ${err}`);
  }
}

async function getAdminToken() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: process.env.ADMIN_PIN }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  const data = await res.json();
  return data.token;
}

function printScoreboard(scoreboard) {
  console.log('  Scoreboard:');
  for (const c of scoreboard) {
    console.log(`    ${c.name}: ${c.score} pts`);
  }
}

function printRankings(rankings, candidates) {
  const nameOf = (id) => (candidates.find(c => c.id === id) || {}).name || id;
  console.log('  Rankings:');
  for (const r of rankings) {
    console.log(`    ${nameOf(r.candidateId)}: ${r.status} (${r.elapsedMs ?? 'N/A'}ms)`);
  }
}

async function runTests() {
  // ── 0. Get admin token and seed data ──
  console.log('--- Setup ---');
  const adminToken = await getAdminToken();
  console.log('  Admin token obtained');
  await importSeedData(adminToken);
  console.log('  Seed data imported');

  // ── 1. Connect all clients ──
  console.log('--- Connecting clients ---');

  const { client: admin, events: adminEv } = await createClient(
    { auth: { token: adminToken } },
    ['game:state', 'candidates:updated', 'scoreboard:update', 'results:revealed']
  );
  // Drain initial events
  await adminEv['game:state'];
  await adminEv['candidates:updated'];
  console.log('  Admin connected');

  const { client: display, events: displayEv } = await createClient(
    { query: { role: 'display' } },
    ['game:state:public', 'scoreboard:update', 'results:revealed']
  );
  await displayEv['game:state:public'];
  console.log('  Display connected');

  const candClients = {};
  for (const cand of CANDIDATES) {
    const { client, events } = await createClient(
      { query: { candidateId: cand.id, joinToken: cand.joinToken } },
      ['game:state:public', 'results:revealed', 'time:up']
    );
    await events['game:state:public'];
    candClients[cand.id] = { client, events };
    console.log(`  Candidate "${cand.name}" connected`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION 1: MCQ — "Capital of France?" (correct: B = Paris)
  //
  // Staggered answers:
  //   Alice:   400ms → B (correct, fastest correct → should WIN)
  //   Charlie: 200ms → A (wrong, fastest overall but WRONG → should NOT win)
  //   Bob:     800ms → B (correct, slower)
  //   Dana:    never answers
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== QUESTION 1: MCQ ===');

  // Pre-register results:revealed listeners before starting
  const adminResults1P = waitForEvent(admin, 'results:revealed', 30000);
  const displayResults1P = waitForEvent(display, 'results:revealed', 30000);
  const candResults1 = {};
  for (const cand of CANDIDATES) {
    candResults1[cand.id] = waitForEvent(candClients[cand.id].client, 'results:revealed', 30000);
  }

  // Start match
  const startAck = await emitP(admin, 'admin:startMatch', { matchId: MATCH_ID });
  assert('admin:startMatch acknowledged', startAck && startAck.success === true);
  console.log('  Match started — MCQ question shown');

  const adminScoreboard1P = waitForEvent(admin, 'scoreboard:update', 30000);

  // Staggered lock-ins
  setTimeout(() => {
    emitP(candClients['int-charlie'].client, 'candidate:lockAnswer', {
      candidateId: 'int-charlie', optionKey: 'A'
    });
  }, 200);
  setTimeout(() => {
    emitP(candClients['int-alice'].client, 'candidate:lockAnswer', {
      candidateId: 'int-alice', optionKey: 'B'
    });
  }, 400);
  setTimeout(() => {
    emitP(candClients['int-bob'].client, 'candidate:lockAnswer', {
      candidateId: 'int-bob', optionKey: 'B'
    });
  }, 800);
  // Dana never answers

  console.log('  Lock-ins sent (Charlie@200ms, Alice@400ms, Bob@800ms, Dana=none)');

  // Wait for all locks then end timer
  await sleep(2000);
  const endAck1 = await emitP(admin, 'admin:endTimerNow', {});
  assert('endTimerNow acknowledged', endAck1 && endAck1.success === true);
  console.log('  Timer ended');

  // Wait for results:revealed
  const results1 = await adminResults1P;
  console.log('  Results revealed!');
  printRankings(results1.rankings, CANDIDATES);
  console.log(`  Winner: ${CANDIDATES.find(c => c.id === results1.winnerCandidateId)?.name || results1.winnerCandidateId}`);

  // ── ASSERTIONS for MCQ ──
  assert('Alice was fastest correct and WINS',
    results1.winnerCandidateId === 'int-alice');
  assert('Charlie (fastest overall but wrong) does NOT win',
    results1.winnerCandidateId !== 'int-charlie');
  assert('Dana (no answer) does NOT win',
    results1.winnerCandidateId !== 'int-dana');

  // Wait for scoreboard
  const score1 = await adminScoreboard1P;
  console.log('  Scoreboard after Q1:');
  printScoreboard(score1);

  const aliceScore1 = score1.find(c => c.id === 'int-alice');
  const charlieScore1 = score1.find(c => c.id === 'int-charlie');
  const bobScore1 = score1.find(c => c.id === 'int-bob');
  const danaScore1 = score1.find(c => c.id === 'int-dana');
  assert('Alice has 10 pts (round points)', aliceScore1.score === 10);
  assert('Charlie has 0 pts (wrong answer)', charlieScore1.score === 0);
  assert('Bob has 0 pts (slower correct)', bobScore1.score === 0);
  assert('Dana has 0 pts (no answer)', danaScore1.score === 0);

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION 2: OPEN (Rapid Fire) — "Name a prime number between 20 and 30"
  //
  // Staggered lock-ins (no optionKey):
  //   Charlie: 200ms → will be judged INCORRECT (fastest but wrong)
  //   Alice:   500ms → will be judged CORRECT
  //   Bob:     900ms → will be judged CORRECT
  //   Dana:    never answers
  //
  // Admin submits judgements in fastest-first order (Charlie, Alice, Bob)
  // Winner should be Alice (fastest judged-correct)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== QUESTION 2: OPEN (Rapid Fire) ===');

  // Pre-register for JUDGING phase events + results + scoreboard
  const adminJudgingP = waitForEvent(admin, 'judging:started', 15000);
  const adminResults2P = waitForEvent(admin, 'results:revealed', 30000);
  const adminScoreboard2P = waitForEvent(admin, 'scoreboard:update', 30000);

  // Advance to next question
  const nextAck = await emitP(admin, 'admin:nextQuestion', {});
  assert('admin:nextQuestion acknowledged', nextAck && nextAck.success === true);
  console.log('  Advanced to OPEN question');

  // Staggered lock-ins (no optionKey for OPEN)
  setTimeout(() => {
    emitP(candClients['int-charlie'].client, 'candidate:lockAnswer', {
      candidateId: 'int-charlie'
    });
  }, 200);
  setTimeout(() => {
    emitP(candClients['int-alice'].client, 'candidate:lockAnswer', {
      candidateId: 'int-alice'
    });
  }, 500);
  setTimeout(() => {
    emitP(candClients['int-bob'].client, 'candidate:lockAnswer', {
      candidateId: 'int-bob'
    });
  }, 900);
  // Dana never answers

  console.log('  Lock-ins sent (Charlie@200ms, Alice@500ms, Bob@900ms, Dana=none)');

  // Wait for locks then end timer
  await sleep(2000);
  const endAck2 = await emitP(admin, 'admin:endTimerNow', {});
  assert('endTimerNow for OPEN acknowledged', endAck2 && endAck2.success === true);
  console.log('  Timer ended — entering JUDGING');

  // Wait for judging:started (admin gets rankedCandidateIds)
  const judging = await adminJudgingP;
  console.log(`  Judging started — ranked IDs: ${judging.rankedCandidateIds.join(', ')}`);
  // Verify fastest-first ordering
  const rankedNames = judging.rankedCandidateIds.map(id => CANDIDATES.find(c => c.id === id)?.name);
  console.log(`  Order: ${rankedNames.join(' → ')}`);

  // Submit judgements in fastest-first order
  // Charlie (fastest) → INCORRECT
  const j1 = await emitP(admin, 'admin:submitJudgement', { candidateId: 'int-charlie', isCorrect: false });
  assert('judgement for Charlie accepted', j1 && j1.success === true);

  // Alice (second) → CORRECT
  const j2 = await emitP(admin, 'admin:submitJudgement', { candidateId: 'int-alice', isCorrect: true });
  assert('judgement for Alice accepted', j2 && j2.success === true);

  // Bob (third) → CORRECT
  const j3 = await emitP(admin, 'admin:submitJudgement', { candidateId: 'int-bob', isCorrect: true });
  assert('judgement for Bob accepted', j3 && j3.success === true);

  console.log('  Judgements submitted: Charlie✗ Alice✓ Bob✓');

  // Advance from gap (gapEnabled=0 so this just reveals results)
  const gapAck = await emitP(admin, 'admin:advanceFromGap', {});
  assert('advanceFromGap acknowledged', gapAck && gapAck.success === true);

  // Wait for results:revealed
  const results2 = await adminResults2P;
  console.log('  Results revealed!');
  printRankings(results2.rankings, CANDIDATES);
  console.log(`  Winner: ${CANDIDATES.find(c => c.id === results2.winnerCandidateId)?.name || results2.winnerCandidateId}`);

  // ── ASSERTIONS for OPEN ──
  assert('Alice (fastest judged-correct) WINS OPEN question',
    results2.winnerCandidateId === 'int-alice');
  assert('Charlie (fastest overall but judged-incorrect) does NOT win',
    results2.winnerCandidateId !== 'int-charlie');
  assert('Dana (no answer) does NOT win OPEN',
    results2.winnerCandidateId !== 'int-dana');

  // Wait for scoreboard
  const score2 = await adminScoreboard2P;
  console.log('  Final Scoreboard:');
  printScoreboard(score2);

  const aliceFinal = score2.find(c => c.id === 'int-alice');
  const charlieFinal = score2.find(c => c.id === 'int-charlie');
  const bobFinal = score2.find(c => c.id === 'int-bob');
  const danaFinal = score2.find(c => c.id === 'int-dana');
  assert('Alice has 20 pts total (10+10)', aliceFinal.score === 20);
  assert('Charlie has 0 pts total', charlieFinal.score === 0);
  assert('Bob has 0 pts total', bobFinal.score === 0);
  assert('Dana has 0 pts total', danaFinal.score === 0);

  // ── Cleanup ──
  admin.disconnect();
  display.disconnect();
  for (const cand of CANDIDATES) {
    candClients[cand.id].client.disconnect();
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}\n`);
  process.exitCode = fail > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exitCode = 1;
});
