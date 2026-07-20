'use strict';

/**
 * Verifies duplicate admin navigation events are acknowledged but ignored.
 * Run against a local server with: node server/test/verify-admin-navigation-debounce.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { io: Client } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const MATCH_ID = 'navigation-debounce-match';
const DEBOUNCE_WAIT_MS = 350;
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

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function emitWithAck(socket, event, data = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    socket.emit(event, data, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function connectAdmin(token) {
  return new Promise((resolve, reject) => {
    const socket = Client(BASE, { auth: { token }, autoConnect: false, forceNew: true, reconnection: false, transports: ['websocket'] });
    const timer = setTimeout(() => reject(new Error('Admin socket connection timed out')), 5000);
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
    socket.connect();
  });
}

async function getAdminToken() {
  const response = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: process.env.ADMIN_PIN }),
  });
  if (!response.ok) throw new Error(`Admin login failed (${response.status})`);
  return (await response.json()).token;
}

async function adminRequest(path, token, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed (${response.status})`);
  return response.json();
}

function seedDocument() {
  const candidate = { id: 'navigation-debounce-candidate', name: 'Navigation Debounce Candidate', joinToken: 'navigation-debounce-token', logoUrl: null, score: 0, isActive: true };
  const round = { id: 'navigation-debounce-round', name: 'Navigation Debounce Round', order: 1, answerMode: 'MCQ', pointsPerQuestion: 10, timeLimitSeconds: 30, gapEnabled: true, gapSeconds: 30, instructions: 'Test', matchId: MATCH_ID };
  return {
    matches: [{ id: MATCH_ID, name: 'Navigation Debounce Match', order: 1, candidateIds: [candidate.id], status: 'not_started' }],
    match_scores: [{ matchId: MATCH_ID, candidateId: candidate.id, score: 0 }],
    candidates: [candidate],
    rounds: [round],
    questions: [1, 2, 3].map((order) => ({
      id: `navigation-debounce-q${order}`, roundId: round.id, order, text: `Question ${order}`,
      mediaType: 'none', mediaUrl: null, options: [{ key: 'A', text: 'Correct' }], correctOptionKey: 'A',
      pointsOverride: null, timeLimitOverrideSeconds: null, gapEnabledOverride: null, gapSecondsOverride: null,
    })),
  };
}

async function requestState(socket) {
  const state = waitForEvent(socket, 'game:state');
  await emitWithAck(socket, 'admin:requestState');
  return state;
}

async function run() {
  let admin;
  let token;
  let originalExport;
  try {
    token = await getAdminToken();
    originalExport = await adminRequest('/api/export', token);
    await adminRequest('/api/import', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(seedDocument()) });
    admin = await connectAdmin(token);

    const start = await emitWithAck(admin, 'admin:startMatch', { matchId: MATCH_ID });
    assert('match starts', start && start.success === true);

    // ── advanceFromGap debounce (valid from GAP phase) ──
    // End timer on Q1 to enter GAP (MCQ auto-grades, gapEnabled=true).
    const endTimer1 = await emitWithAck(admin, 'admin:endTimerNow');
    assert('timer ends and enters GAP', endTimer1 && endTimer1.success === true);
    const gapState = await requestState(admin);
    assert('state is GAP before duplicate advance', gapState.phase === 'GAP');

    const results = waitForEvent(admin, 'results:revealed');
    const gapAcks = await Promise.all([
      emitWithAck(admin, 'admin:advanceFromGap'),
      emitWithAck(admin, 'admin:advanceFromGap'),
    ]);
    await results;
    const afterGap = await requestState(admin);
    assert('first advanceFromGap is processed', gapAcks.some((ack) => ack && ack.success === true && !ack.ignored));
    assert('second advanceFromGap is ignored', gapAcks.some((ack) => ack && ack.ignored === true));
    assert('double advanceFromGap reveals results once', afterGap.phase === 'RESULTS' && afterGap.resultsRevealed === true);

    // ── nextQuestion debounce (valid from RESULTS phase) ──
    await sleep(DEBOUNCE_WAIT_MS);
    const nextAcks = await Promise.all([
      emitWithAck(admin, 'admin:nextQuestion'),
      emitWithAck(admin, 'admin:nextQuestion'),
    ]);
    const afterNext = await requestState(admin);
    assert('first nextQuestion is processed', nextAcks.some((ack) => ack && ack.success === true && !ack.ignored));
    assert('second nextQuestion is ignored', nextAcks.some((ack) => ack && ack.ignored === true));
    assert('double next advances exactly one question', afterNext.currentQuestionId === 'navigation-debounce-q2');

    // ── prevQuestion debounce (valid from QUESTION_SHOWN / RESULTS / etc.) ──
    // We are on Q2 QUESTION_SHOWN. End timer → GAP → advance → Q2 RESULTS,
    // then test prevQuestion from RESULTS.
    await sleep(DEBOUNCE_WAIT_MS);
    const endTimer2 = await emitWithAck(admin, 'admin:endTimerNow');
    assert('timer ends on Q2 and enters GAP', endTimer2 && endTimer2.success === true);
    const gapState2 = await requestState(admin);
    assert('state is GAP before advancing to RESULTS', gapState2.phase === 'GAP');

    const results2 = waitForEvent(admin, 'results:revealed');
    await emitWithAck(admin, 'admin:advanceFromGap');
    await results2;

    await sleep(DEBOUNCE_WAIT_MS);
    const prevAcks = await Promise.all([
      emitWithAck(admin, 'admin:prevQuestion'),
      emitWithAck(admin, 'admin:prevQuestion'),
    ]);
    const afterPrev = await requestState(admin);
    assert('first prevQuestion is processed', prevAcks.some((ack) => ack && ack.success === true && !ack.ignored));
    assert('second prevQuestion is ignored', prevAcks.some((ack) => ack && ack.ignored === true));
    assert('double previous moves back exactly one question', afterPrev.currentQuestionId === 'navigation-debounce-q1');
  } finally {
    if (admin) admin.disconnect();
    if (originalExport && token) {
      await adminRequest('/api/import', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(originalExport) });
      console.log('Original server data restored.');
    }
  }
}

run()
  .catch((error) => { fail += 1; console.error('TEST ERROR:', error); })
  .finally(() => {
    console.log(`\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}`);
    process.exitCode = fail > 0 ? 1 : 0;
  });
