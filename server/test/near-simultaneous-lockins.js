'use strict';

/**
 * Stress test for server-authoritative lock-in timestamps.
 *
 * Starts one isolated, seeded match on a running local server, then runs 20
 * MCQ questions. On each question every connected candidate locks the correct
 * answer within a five-millisecond window. The candidate sent five milliseconds
 * ahead rotates on every iteration, so each candidate is expected to win five
 * times. The original data export is restored before the script exits.
 *
 * Usage (from repository root):
 *   npm --prefix server run dev
 *   node server/test/near-simultaneous-lockins.js
 *
 * Optional: BASE_URL=http://localhost:4000 node server/test/near-simultaneous-lockins.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { io: Client } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const ITERATIONS = 20;
const POINTS = 10;
const LOCK_WINDOW_MS = 5;
const MATCH_ID = 'near-simultaneous-lockins-match';
const CANDIDATES = [
  { id: 'near-lock-c1', name: 'Near Lock Candidate 1', joinToken: 'near-lock-token-1' },
  { id: 'near-lock-c2', name: 'Near Lock Candidate 2', joinToken: 'near-lock-token-2' },
  { id: 'near-lock-c3', name: 'Near Lock Candidate 3', joinToken: 'near-lock-token-3' },
  { id: 'near-lock-c4', name: 'Near Lock Candidate 4', joinToken: 'near-lock-token-4' },
];

let pass = 0;
let fail = 0;

function assert(label, condition) {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL  ${label}`);
  }
}

function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitWithAck(socket, event, payload, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

function connect(options) {
  return new Promise((resolve, reject) => {
    const socket = Client(BASE, {
      query: options.query || {},
      auth: options.auth || {},
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
    });
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.connect();
  });
}

async function getAdminToken() {
  const response = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: process.env.ADMIN_PIN }),
  });
  if (!response.ok) throw new Error(`Admin login failed (${response.status})`);
  return (await response.json()).token;
}

async function adminRequest(path, token, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function seedDocument() {
  const round = {
    id: 'near-lock-round', name: 'Near simultaneous lock-ins', order: 1,
    answerMode: 'MCQ', pointsPerQuestion: POINTS, timeLimitSeconds: 30,
    gapEnabled: false, gapSeconds: 0, instructions: 'Automated timestamp stress test', matchId: MATCH_ID,
  };
  return {
    matches: [{ id: MATCH_ID, name: 'Near simultaneous lock-in stress test', order: 1, candidateIds: CANDIDATES.map((c) => c.id), status: 'not_started' }],
    match_scores: CANDIDATES.map((c) => ({ matchId: MATCH_ID, candidateId: c.id, score: 0 })),
    candidates: CANDIDATES.map((c) => ({ ...c, logoUrl: null, score: 0, isActive: true })),
    rounds: [round],
    questions: Array.from({ length: ITERATIONS }, (_, index) => ({
      id: `near-lock-question-${index + 1}`,
      roundId: round.id,
      order: index + 1,
      text: `Near simultaneous lock-in question ${index + 1}`,
      mediaType: 'none', mediaUrl: null,
      options: [{ key: 'A', text: 'Incorrect' }, { key: 'B', text: 'Correct' }],
      correctOptionKey: 'B', pointsOverride: null,
      timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    })),
  };
}

function sendLockAfter(socket, candidateId, delayMs) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      resolve(await emitWithAck(socket, 'candidate:lockAnswer', { candidateId, optionKey: 'B' }));
    }, delayMs);
  });
}

async function run() {
  let admin;
  const candidateSockets = new Map();
  let adminToken;
  let originalExport;

  try {
    adminToken = await getAdminToken();
    originalExport = await adminRequest('/api/export', adminToken);
    await adminRequest('/api/import', adminToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seedDocument()),
    });

    admin = await connect({ auth: { token: adminToken } });
    for (const candidate of CANDIDATES) {
      candidateSockets.set(candidate.id, await connect({ query: { candidateId: candidate.id, joinToken: candidate.joinToken } }));
    }

    const start = await emitWithAck(admin, 'admin:startMatch', { matchId: MATCH_ID });
    assert('match starts successfully', start && start.success === true);

    const expectedWins = new Map(CANDIDATES.map((candidate) => [candidate.id, 0]));
    for (let index = 0; index < ITERATIONS; index += 1) {
      const expectedWinner = CANDIDATES[index % CANDIDATES.length].id;
      const resultsPromise = waitForEvent(admin, 'results:revealed');

      // All lock events are dispatched in a 5ms window. Rotating the first
      // dispatch gives every candidate an opportunity to be the fastest.
      const lockAcks = await Promise.all(CANDIDATES.map((candidate) => sendLockAfter(
        candidateSockets.get(candidate.id),
        candidate.id,
        candidate.id === expectedWinner ? 0 : LOCK_WINDOW_MS,
      )));
      assert(`run ${index + 1}: every near-simultaneous lock is accepted`, lockAcks.every((ack) => ack && ack.success === true));

      const endTimer = await emitWithAck(admin, 'admin:endTimerNow', {});
      assert(`run ${index + 1}: timer resolves without a server error`, endTimer && endTimer.success === true);
      const results = await resultsPromise;

      const correctRankings = results.rankings.filter((ranking) => ranking.status === 'correct');
      const fastestCorrect = correctRankings[0] && correctRankings[0].candidateId;
      const uniqueWinner = typeof results.winnerCandidateId === 'string'
        && correctRankings.filter((ranking) => ranking.candidateId === results.winnerCandidateId).length === 1;
      assert(`run ${index + 1}: exactly one correct winner is resolved`, uniqueWinner);
      assert(`run ${index + 1}: a correct lock never produces no winner`, results.winnerCandidateId !== null);
      assert(`run ${index + 1}: revealed ranking's fastest correct candidate is the winner`, results.winnerCandidateId === fastestCorrect);
      assert(`run ${index + 1}: rotated earliest lock wins`, results.winnerCandidateId === expectedWinner);

      expectedWins.set(expectedWinner, expectedWins.get(expectedWinner) + 1);
      const scoreboard = await adminRequest(`/api/scoreboard?matchId=${MATCH_ID}`, adminToken);
      const scoresAgree = CANDIDATES.every((candidate) => {
        const entry = scoreboard.find((score) => score.id === candidate.id);
        return entry && entry.score === expectedWins.get(candidate.id) * POINTS;
      });
      assert(`run ${index + 1}: match_scores agree with results:revealed`, scoresAgree);

      if (index < ITERATIONS - 1) {
        const next = await emitWithAck(admin, 'admin:nextQuestion', {});
        assert(`run ${index + 1}: advances to the next question`, next && next.success === true);
      }
    }

    assert('all four candidates win at least once', CANDIDATES.every((candidate) => expectedWins.get(candidate.id) > 0));
  } finally {
    if (admin) admin.disconnect();
    for (const socket of candidateSockets.values()) socket.disconnect();
    if (originalExport && adminToken) {
      await adminRequest('/api/import', adminToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(originalExport),
      });
      console.log('Original server data restored.');
    }
  }
}

run()
  .catch((error) => {
    fail += 1;
    console.error('TEST ERROR:', error);
  })
  .finally(() => {
    console.log(`\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}`);
    process.exitCode = fail > 0 ? 1 : 0;
  });
