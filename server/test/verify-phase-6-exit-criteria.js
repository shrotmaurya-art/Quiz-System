/**
 * Phase 6 Exit Criteria Integration Test:
 * 1. Play through all 6 rounds of the seeded question bank.
 * 2. Assert all conditions (no_answer, fastest-wrong/slower-correct, replay-reversal, OPEN-round partial judging).
 * 3. Verify final scoreboard matching expected totals.
 * 4. Verify match isolation (Eva & Frank score in Match 2, scores do not leak).
 *
 * Usage: node server/test/verify-phase-6-exit-criteria.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { io: Client } = require('socket.io-client');

const SERVER_DIR = path.resolve(__dirname, '..');
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

// Helper to extract ROUNDS array from import-icse-sample-banks.js
function getSeededRounds() {
  const fileContent = fs.readFileSync(path.join(SERVER_DIR, '../seed/import-icse-sample-banks.js'), 'utf8');
  const roundsJs = fileContent.substring(
    fileContent.indexOf('const ROUNDS ='),
    fileContent.indexOf('async function login')
  );
  const arrayCode = roundsJs.replace('const ROUNDS =', '').trim().replace(/;$/, '');
  return eval(arrayCode);
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

    // ── Load & Parse Seeded Bank ──
    const seededRounds = getSeededRounds();
    console.log(`Parsed ${seededRounds.length} rounds from seed file.`);

    const C = [
      { id: 'int-alice', name: 'Alice', joinToken: 'int-tok-alice', logoUrl: null },
      { id: 'int-bob', name: 'Bob', joinToken: 'int-tok-bob', logoUrl: null },
      { id: 'int-charlie', name: 'Charlie', joinToken: 'int-tok-charlie', logoUrl: null },
      { id: 'int-dana', name: 'Dana', joinToken: 'int-tok-dana', logoUrl: null },
      { id: 'int-eva', name: 'Eva', joinToken: 'int-tok-eva', logoUrl: null },
      { id: 'int-frank', name: 'Frank', joinToken: 'int-tok-frank', logoUrl: null },
    ];

    const matches = [
      { id: 'int-match-1', name: 'Match 1', order: 1, candidateIds: ['int-alice', 'int-bob', 'int-charlie', 'int-dana'], status: 'not_started', winnerCandidateId: null },
      { id: 'int-match-2', name: 'Match 2', order: 2, candidateIds: ['int-eva', 'int-frank'], status: 'not_started', winnerCandidateId: null },
    ];

    const matchScores = [
      { matchId: 'int-match-1', candidateId: 'int-alice', score: 0 },
      { matchId: 'int-match-1', candidateId: 'int-bob', score: 0 },
      { matchId: 'int-match-1', candidateId: 'int-charlie', score: 0 },
      { matchId: 'int-match-1', candidateId: 'int-dana', score: 0 },
      { matchId: 'int-match-2', candidateId: 'int-eva', score: 0 },
      { matchId: 'int-match-2', candidateId: 'int-frank', score: 0 },
    ];

    const rounds = [];
    const questions = [];

    let rIndex = 1;
    for (const r of seededRounds) {
      const roundId = `r-${rIndex}`;
      rounds.push({
        id: roundId,
        name: r.name,
        order: r.order,
        answerMode: r.answerMode,
        pointsPerQuestion: r.pointsPerQuestion,
        timeLimitSeconds: r.timeLimitSeconds || null,
        gapEnabled: r.gapEnabled !== undefined ? r.gapEnabled : null,
        gapSeconds: r.gapSeconds !== undefined ? r.gapSeconds : null,
        instructions: r.instructions || '',
        matchId: 'int-match-1'
      });

      let qIndex = 1;
      for (const q of r.questions) {
        const questionId = `q-${rIndex}-${qIndex}`;
        
        let correctOptionKey = null;
        let options = [];
        if (r.answerMode === 'MCQ') {
          const optionLetters = ['A', 'B', 'C', 'D'];
          options = (q.options || []).map((optText, idx) => ({
            key: optionLetters[idx],
            text: optText
          }));
          const correctIdx = q.options.indexOf(q.correct);
          correctOptionKey = optionLetters[correctIdx] || null;
        }

        questions.push({
          id: questionId,
          roundId: roundId,
          order: qIndex,
          text: q.text,
          mediaType: 'none',
          mediaUrl: null,
          options: options,
          correctOptionKey: correctOptionKey,
          pointsOverride: null,
          timeLimitOverrideSeconds: null,
          gapEnabledOverride: null,
          gapSecondsOverride: null
        });
        qIndex++;
      }
      rIndex++;
    }

    // A dedicated round and question for Match 2 so we can start it and play it.
    rounds.push({
      id: 'r-m2-1',
      name: 'Match 2 MCQ Round',
      order: 1,
      answerMode: 'MCQ',
      pointsPerQuestion: 10,
      timeLimitSeconds: 10,
      gapEnabled: 0,
      gapSeconds: 0,
      instructions: 'Match 2 test',
      matchId: 'int-match-2'
    });

    questions.push({
      id: 'q-m2-1',
      roundId: 'r-m2-1',
      order: 1,
      text: 'What color is the sky?',
      mediaType: 'none',
      mediaUrl: null,
      options: [
        { key: 'A', text: 'Blue' },
        { key: 'B', text: 'Green' }
      ],
      correctOptionKey: 'A',
      pointsOverride: null,
      timeLimitOverrideSeconds: null,
      gapEnabledOverride: null,
      gapSecondsOverride: null
    });

    const importRes = await fetch(`${BASE}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matches, rounds, questions, match_scores: matchScores, candidates: C.map((c) => ({ ...c, score: 0, isActive: 1 })) }),
    });
    if (!importRes.ok) throw new Error(`Import failed: ${await importRes.text()}`);

    // Set up sockets for admin and Match 1 candidates
    const { client: admin, events: adminEv } = await createClient(
      { auth: { token } }, ['game:state', 'judging:started', 'scoreboard:update', 'results:revealed']
    );
    await adminEv['game:state'];

    const candClients = {};
    const candIds = ['int-alice', 'int-bob', 'int-charlie', 'int-dana'];
    for (const cid of candIds) {
      const { client, events } = await createClient(
        { query: { candidateId: cid, joinToken: `int-tok-${cid.split('-')[1]}` } },
        ['game:state:public', 'results:revealed']
      );
      await events['game:state:public'];
      candClients[cid] = { client, events };
    }

    // Connect Match 2 candidates as well
    const m2CandIds = ['int-eva', 'int-frank'];
    for (const cid of m2CandIds) {
      const { client, events } = await createClient(
        { query: { candidateId: cid, joinToken: `int-tok-${cid.split('-')[1]}` } },
        ['game:state:public', 'results:revealed']
      );
      await events['game:state:public'];
      candClients[cid] = { client, events };
    }

    // Start Match 1
    const startAck = await emitP(admin, 'admin:startMatch', { matchId: 'int-match-1' });
    assert('Match 1 started successfully', startAck && startAck.success === true);

    // Generic question-playing helper
    async function playQuestion(qObj, rObj, lockIns, judgingAnswers) {
      const isMCQ = rObj.answerMode === 'MCQ';

      // Schedule candidate lock-ins
      const promises = Object.entries(lockIns).map(async ([cid, opt]) => {
        await sleep(opt.delay);
        const lockPayload = { candidateId: cid };
        if (isMCQ) {
          lockPayload.optionKey = opt.key;
        }
        await emitP(candClients[cid].client, 'candidate:lockAnswer', lockPayload);
      });

      await Promise.all(promises);
      await sleep(100);

      // End timer
      await emitP(admin, 'admin:endTimerNow', {});

      if (!isMCQ) {
        // Wait for judging:started
        await waitForEvent(admin, 'judging:started', 8000);
        // Admin submits judgements
        for (const [cid, isCorrect] of Object.entries(judgingAnswers)) {
          if (isCorrect !== null) {
            await emitP(admin, 'admin:submitJudgement', { candidateId: cid, isCorrect });
          }
        }
      }

      // Advance from gap (reveal results)
      const resultsP = waitForEvent(admin, 'results:revealed', 8000);
      await emitP(admin, 'admin:advanceFromGap', {});
      const results = await resultsP;
      return results;
    }

    // Play rounds and questions in sequence
    let qGlobalIndex = 0;
    
    // We will play through each round belonging to Match 1
    const match1Rounds = rounds.filter(r => r.matchId === 'int-match-1');
    for (let rIdx = 0; rIdx < match1Rounds.length; rIdx++) {
      const currentRound = match1Rounds[rIdx];
      const currentRoundQuestions = questions.filter(q => q.roundId === currentRound.id);
      
      for (let qIdx = 0; qIdx < currentRoundQuestions.length; qIdx++) {
        const question = currentRoundQuestions[qIdx];
        console.log(`Playing round ${rIdx + 1} (${currentRound.name}) question ${qIdx + 1}: ${question.text}`);
        
        const correctKey = question.correctOptionKey;
        const wrongKey = correctKey === 'A' ? 'B' : 'A';
        
        let lockIns = {};
        let judgingAnswers = {};
        
        // Define exact inputs to satisfy exit criteria cases
        if (rIdx === 0 && qIdx === 0) {
          // --- Case 1: no_answer + fastest-wrong/slower-correct ---
          // Charlie: wrong (A) fastest (50ms)
          // Alice: correct (B) slower (100ms)
          // Bob: correct (B) slowest (150ms)
          // Dana: does not answer (no lockIn)
          lockIns = {
            'int-charlie': { delay: 50, key: wrongKey },
            'int-alice': { delay: 100, key: correctKey },
            'int-bob': { delay: 150, key: correctKey }
          };
          
          const res = await playQuestion(question, currentRound, lockIns, judgingAnswers);
          assert('Results revealed has rankings', res && Array.isArray(res.rankings));
          
          const aliceRank = res.rankings.find(r => r.candidateId === 'int-alice');
          const charlieRank = res.rankings.find(r => r.candidateId === 'int-charlie');
          const bobRank = res.rankings.find(r => r.candidateId === 'int-bob');
          const danaRank = res.rankings.find(r => r.candidateId === 'int-dana');
          
          assert('Alice has correct status badge', aliceRank && aliceRank.status === 'correct');
          assert('Charlie has incorrect status badge', charlieRank && charlieRank.status === 'incorrect');
          assert('Bob has correct status badge', bobRank && bobRank.status === 'correct');
          assert('Dana has no_answer status badge', danaRank && danaRank.status === 'no_answer');
          assert('Alice (slower but correct) wins over Charlie (fastest but wrong)', res.winnerCandidateId === 'int-alice');
        }
        else if (rIdx === 1 && qIdx === 0) {
          // --- Case 2: Replay Scoring Reversal ---
          // Play Q1 of Round 2: Alice wins.
          lockIns = {
            'int-alice': { delay: 50, key: correctKey }
          };
          let res = await playQuestion(question, currentRound, lockIns, judgingAnswers);
          assert('Alice wins Q1 of Round 2 initially', res.winnerCandidateId === 'int-alice');
          
          // Verify Alice scored 10 points in scoreboard
          let sbRes = await fetch(`${BASE}/api/matches/int-match-1/scoreboard`);
          let sb = await sbRes.json();
          const aliceScoreBefore = sb.find(r => r.id === 'int-alice').score;
          
          // Advance to Q2
          await emitP(admin, 'admin:nextQuestion', {});
          
          // Rewind back to Q1
          await emitP(admin, 'admin:prevQuestion', {});
          
          // Scoreboard check immediately after prevQuestion
          sbRes = await fetch(`${BASE}/api/matches/int-match-1/scoreboard`);
          sb = await sbRes.json();
          const aliceScoreAfter = sb.find(r => r.id === 'int-alice').score;
          assert('Alice score decremented back to previous value upon rewind', aliceScoreBefore - aliceScoreAfter === 10);
          
          // Play Q1 again: Bob wins
          lockIns = {
            'int-bob': { delay: 50, key: correctKey }
          };
          res = await playQuestion(question, currentRound, lockIns, judgingAnswers);
          assert('Bob wins Q1 of Round 2 on replay', res.winnerCandidateId === 'int-bob');
          
          // Advance to Q2 again
          await emitP(admin, 'admin:nextQuestion', {});
          continue; // Question has been fully played and advanced
        }
        else if (rIdx === 4 && qIdx === 0) {
          // --- Case 3: OPEN Round early judging termination (Task 6.2) ---
          // Alice: correct, Bob & Charlie: unjudged.
          lockIns = {
            'int-alice': { delay: 50 },
            'int-bob': { delay: 100 },
            'int-charlie': { delay: 150 }
          };
          judgingAnswers = {
            'int-alice': true,
            // Bob & Charlie left unjudged (not judged)
          };
          
          const res = await playQuestion(question, currentRound, lockIns, judgingAnswers);
          assert('Alice wins the OPEN round question', res.winnerCandidateId === 'int-alice');
          
          const aliceRank = res.rankings.find(r => r.candidateId === 'int-alice');
          const bobRank = res.rankings.find(r => r.candidateId === 'int-bob');
          const charlieRank = res.rankings.find(r => r.candidateId === 'int-charlie');
          
          assert('Alice has correct status', aliceRank && aliceRank.status === 'correct');
          assert('Bob has not_judged status', bobRank && bobRank.status === 'not_judged');
          assert('Charlie has not_judged status', charlieRank && charlieRank.status === 'not_judged');
        }
        else {
          // Normal scripted questions to match expected totals
          // Round 1: Q2 (Bob), Q3 (Charlie), Q4 (Dana), Q5 (Alice)
          // Round 2: Q2 (Charlie), Q3 (Dana), Q4 (Alice), Q5 (Bob)
          // Round 3: Q1 (Charlie), Q2 (Dana), Q3 (Alice), Q4 (Bob), Q5 (Charlie)
          // Round 4: Q1 (Dana), Q2 (Alice), Q3 (Bob), Q4 (Charlie), Q5 (Dana)
          // Round 5: Q2 (Bob), Q3 (Charlie), Q4 (Dana)
          // Round 6: Q1 (Alice), Q2 (Bob), Q3 (Charlie), Q4 (Dana), Q5 (Alice)
          let winnerCid = 'int-alice';
          if (rIdx === 0) {
            if (qIdx === 1) winnerCid = 'int-bob';
            if (qIdx === 2) winnerCid = 'int-charlie';
            if (qIdx === 3) winnerCid = 'int-dana';
            if (qIdx === 4) winnerCid = 'int-alice';
          } else if (rIdx === 1) {
            if (qIdx === 1) winnerCid = 'int-charlie';
            if (qIdx === 2) winnerCid = 'int-dana';
            if (qIdx === 3) winnerCid = 'int-alice';
            if (qIdx === 4) winnerCid = 'int-bob';
          } else if (rIdx === 2) {
            if (qIdx === 0) winnerCid = 'int-charlie';
            if (qIdx === 1) winnerCid = 'int-dana';
            if (qIdx === 2) winnerCid = 'int-alice';
            if (qIdx === 3) winnerCid = 'int-bob';
            if (qIdx === 4) winnerCid = 'int-charlie';
          } else if (rIdx === 3) {
            if (qIdx === 0) winnerCid = 'int-dana';
            if (qIdx === 1) winnerCid = 'int-alice';
            if (qIdx === 2) winnerCid = 'int-bob';
            if (qIdx === 3) winnerCid = 'int-charlie';
            if (qIdx === 4) winnerCid = 'int-dana';
          } else if (rIdx === 4) {
            if (qIdx === 1) winnerCid = 'int-bob';
            if (qIdx === 2) winnerCid = 'int-charlie';
            if (qIdx === 3) winnerCid = 'int-dana';
          } else if (rIdx === 5) {
            if (qIdx === 0) winnerCid = 'int-alice';
            if (qIdx === 1) winnerCid = 'int-bob';
            if (qIdx === 2) winnerCid = 'int-charlie';
            if (qIdx === 3) winnerCid = 'int-dana';
            if (qIdx === 4) winnerCid = 'int-alice';
          }
          
          lockIns = {
            [winnerCid]: { delay: 50, key: correctKey }
          };
          judgingAnswers = {
            [winnerCid]: true
          };
          
          await playQuestion(question, currentRound, lockIns, judgingAnswers);
        }
        
        // Advance to next question/round
        await emitP(admin, 'admin:nextQuestion', {});
      }
    }

    // Match 1 ended. End the match.
    const endMatchAck = await emitP(admin, 'admin:endMatch', { matchId: 'int-match-1' });
    assert('Match 1 ended successfully', endMatchAck && endMatchAck.success === true);

    // ── Scoreboard Assertion ──
    const sbRes = await fetch(`${BASE}/api/matches/int-match-1/scoreboard`);
    const sb = await sbRes.json();
    
    const aliceScore = sb.find(r => r.id === 'int-alice')?.score;
    const bobScore = sb.find(r => r.id === 'int-bob')?.score;
    const charlieScore = sb.find(r => r.id === 'int-charlie')?.score;
    const danaScore = sb.find(r => r.id === 'int-dana')?.score;

    console.log('\nFinal Match 1 scoreboard totals:');
    console.log(`  Alice: ${aliceScore} (Expected: 75)`);
    console.log(`  Bob: ${bobScore} (Expected: 65)`);
    console.log(`  Charlie: ${charlieScore} (Expected: 65)`);
    console.log(`  Dana: ${danaScore} (Expected: 65)`);

    if (aliceScore !== 75) throw new Error(`Score mismatch: Alice score is ${aliceScore}, expected 75`);
    if (bobScore !== 65) throw new Error(`Score mismatch: Bob score is ${bobScore}, expected 65`);
    if (charlieScore !== 65) throw new Error(`Score mismatch: Charlie score is ${charlieScore}, expected 65`);
    if (danaScore !== 65) throw new Error(`Score mismatch: Dana score is ${danaScore}, expected 65`);
    assert('Expected scoreboard totals matched exactly', true);

    // ── Match 2 Leakage Verification ──
    // Start Match 2
    const startM2Ack = await emitP(admin, 'admin:startMatch', { matchId: 'int-match-2' });
    assert('Match 2 started successfully', startM2Ack && startM2Ack.success === true);

    // Play one question in Match 2 using the dedicated Match 2 round/question
    const m2q = questions.find(q => q.id === 'q-m2-1');
    const m2r = rounds.find(r => r.id === 'r-m2-1');
    
    // Eva locks in fastest correct
    const lockInsM2 = {
      'int-eva': { delay: 50, key: m2q.correctOptionKey }
    };
    
    await playQuestion(m2q, m2r, lockInsM2, {});
    
    // Check Match 2 Scoreboard
    const sb2Res = await fetch(`${BASE}/api/matches/int-match-2/scoreboard`);
    const sb2 = await sb2Res.json();
    const evaScore = sb2.find(r => r.id === 'int-eva')?.score;
    const frankScore = sb2.find(r => r.id === 'int-frank')?.score;
    
    assert('Eva scored 10 points in Match 2 scoreboard', evaScore === 10);
    assert('Frank has 0 points in Match 2 scoreboard', frankScore === 0);
    
    // Verify Match 1 Scoreboard remains completely unaffected
    const sb1AfterM2Res = await fetch(`${BASE}/api/matches/int-match-1/scoreboard`);
    const sb1AfterM2 = await sb1AfterM2Res.json();
    
    const aliceScoreAfterM2 = sb1AfterM2.find(r => r.id === 'int-alice')?.score;
    const bobScoreAfterM2 = sb1AfterM2.find(r => r.id === 'int-bob')?.score;
    
    assert('Match 1 scores did not change or leak after Match 2 scoring', aliceScoreAfterM2 === 75 && bobScoreAfterM2 === 65);
    
    // End Match 2
    await emitP(admin, 'admin:endMatch', { matchId: 'int-match-2' });

    admin.disconnect();
    for (const cid of candIds) {
      candClients[cid].client.disconnect();
    }
    for (const cid of m2CandIds) {
      candClients[cid].client.disconnect();
    }
  } finally {
    server.kill('SIGTERM');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
  console.log(`${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('VERIFY ERROR:', err.message);
  process.exitCode = 1;
});
