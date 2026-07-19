/**
 * Browser-like render verification for the Candidate RESULTS screen (Task 5.5).
 * Mounts the REAL ResultsView in jsdom with a mocked socket.io-client and a
 * controlled CandidateGame context value, covering all four feedback states:
 *   - correctly-and-fastest (this candidate won)
 *   - correctly-but-slower (a different candidate won)
 *   - incorrectly
 *   - not at all (no answer)
 * Asserts each renders the expected badge / winner panel / correct-answer text.
 * Usage: node client/test/verify-results-view.mjs
 */
import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';

const require = createRequire(import.meta.url);
const SRC = path.resolve(process.cwd(), 'src').replace(/\\/g, '/');
const fakeSocketPath = path.join(os.tmpdir(), 'fake-socket.mjs').replace(/\\/g, '/');

let pass = 0, fail = 0;
const assert = (l, c) => { if (c) { pass++; console.log(`  PASS  ${l}`); } else { fail++; console.error(`  FAIL  ${l}`); } };

const fakeSocket = `
  globalThis.__sockets = globalThis.__sockets || [];
  function mk(){ const h={}; const s={ on(e,cb){(h[e]=h[e]||[]).push(cb);}, off(){}, disconnect(){}, close(){}, emit(){}, _fire(e){(h[e]||[]).forEach(cb=>cb());} }; globalThis.__sockets.push(s); return s; }
  export function io(){ return mk(); }
  export default { io };
`;

fs.writeFileSync(fakeSocketPath, fakeSocket);
async function build() {
  const fakePath = fakeSocketPath;
  // Single bundle so ResultsView and CandidateGameContext share the SAME module
  // instance (context identity must match for the Provider to work).
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import ResultsView from '${SRC}/candidate/ResultsView.jsx';
    import { CandidateGameContext } from '${SRC}/candidate/CandidateGameContext.jsx';
    function Inject({ value, children }) {
      return React.createElement(CandidateGameContext.Provider, { value }, children);
    }
    globalThis.__render = (value) => {
      const root = createRoot(document.getElementById('root'));
      root.render(React.createElement(Inject, { value }, React.createElement(ResultsView)));
      return root;
    };
    export { React, createRoot, ResultsView };
  `;
  const r = await esbuild.build({
    stdin: { contents: entry, resolveDir: SRC, loader: 'js' },
    bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', write: false,
    alias: { 'socket.io-client': fakePath },
    define: { 'import.meta.env': '{}' },
    logLevel: 'silent',
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', r.outputFiles[0].text)(m, m.exports, require);
  return m.exports;
}

async function main() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  global.window = dom.window; global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement; global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = (id) => clearTimeout(id);

  const M = await build();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const MCQ_QUESTION = {
    id: 'q1', text: 'Q?', options: [
      { key: 'A', text: 'w' }, { key: 'B', text: 'r' }, { key: 'C', text: 'x' }, { key: 'D', text: 'y' },
    ],
  };

  async function renderState(value) {
    const root = globalThis.__render(value);
    await wait(40);
    const html = document.getElementById('root').innerHTML;
    root.unmount();
    return html;
  }

  // ---- 1. THIS candidate answered correctly AND fastest -> WON ----------------
  const wonHtml = await renderState({
    candidateId: 'C1',
    phase: 'RESULTS',
    gameState: { answerMode: 'MCQ', question: MCQ_QUESTION, winnerCandidateId: 'C1' },
    results: { correctOptionKey: 'B', winnerCandidateId: 'C1', rankings: [
      { candidateId: 'C1', elapsedMs: 3000, status: 'correct' },
      { candidateId: 'C2', elapsedMs: 6000, status: 'incorrect' },
    ] },
  });
  assert('won: shows "YOU WON THIS ROUND! 🏆"', wonHtml.includes('YOU WON THIS ROUND'));
  assert('won: shows correct answer text "B. r"', wonHtml.includes('B. r'));
  assert('won: shows own response time 3.00s', wonHtml.includes('3.00s'));
  assert('won: shows CORRECT badge', wonHtml.includes('CORRECT'));
  assert('won: does NOT show "Not Quite"', !wonHtml.includes('Not Quite'));

  // ---- 2. THIS candidate answered correctly but slower -> someone else won ----
  const correctSlowerHtml = await renderState({
    candidateId: 'C2',
    phase: 'RESULTS',
    gameState: { answerMode: 'MCQ', question: MCQ_QUESTION, winnerCandidateId: 'C1' },
    results: { correctOptionKey: 'B', winnerCandidateId: 'C1', rankings: [
      { candidateId: 'C1', elapsedMs: 3000, status: 'correct' },
      { candidateId: 'C2', elapsedMs: 6000, status: 'correct' },
    ] },
  });
  assert('correct-but-slower: does NOT show winner panel', !correctSlowerHtml.includes('YOU WON THIS ROUND'));
  assert('correct-but-slower: shows "That\'s Correct!" heading', correctSlowerHtml.includes('Correct'));
  assert('correct-but-slower: shows CORRECT badge', correctSlowerHtml.includes('CORRECT'));
  assert('correct-but-slower: shows own response time 6.00s', correctSlowerHtml.includes('6.00s'));
  assert('correct-but-slower: shows correct answer "B. r"', correctSlowerHtml.includes('B. r'));

  // ---- 3. THIS candidate answered INCORRECTLY ---------------------------------
  const incorrectHtml = await renderState({
    candidateId: 'C2',
    phase: 'RESULTS',
    gameState: { answerMode: 'MCQ', question: MCQ_QUESTION, winnerCandidateId: 'C1' },
    results: { correctOptionKey: 'B', winnerCandidateId: 'C1', rankings: [
      { candidateId: 'C1', elapsedMs: 3000, status: 'correct' },
      { candidateId: 'C2', elapsedMs: 5000, status: 'incorrect' },
    ] },
  });
  assert('incorrect: shows "Not Quite"', incorrectHtml.includes('Not Quite'));
  assert('incorrect: shows INCORRECT badge', incorrectHtml.includes('INCORRECT'));
  assert('incorrect: shows own response time 5.00s', incorrectHtml.includes('5.00s'));
  assert('incorrect: shows correct answer "B. r"', incorrectHtml.includes('B. r'));
  assert('incorrect: does NOT show winner panel', !incorrectHtml.includes('YOU WON THIS ROUND'));

  // ---- 4. THIS candidate did NOT answer at all (no answer) --------------------
  const noAnswerHtml = await renderState({
    candidateId: 'C2',
    phase: 'RESULTS',
    gameState: { answerMode: 'MCQ', question: MCQ_QUESTION, winnerCandidateId: 'C1' },
    results: { correctOptionKey: 'B', winnerCandidateId: 'C1', rankings: [
      { candidateId: 'C1', elapsedMs: 3000, status: 'correct' },
      { candidateId: 'C2', elapsedMs: null, status: 'no_answer' },
    ] },
  });
  assert('no-answer: shows "Time\'s Up" heading', noAnswerHtml.includes("Time's Up"));
  assert('no-answer: shows NO ANSWER badge', noAnswerHtml.includes('NO ANSWER'));
  assert('no-answer: shows response time "—"', noAnswerHtml.includes('>—<') || noAnswerHtml.includes('—'));
  assert('no-answer: shows correct answer "B. r"', noAnswerHtml.includes('B. r'));

  // ---- 5. OPEN round variant: correct answer shown as spoken-answer note ------
  const openHtml = await renderState({
    candidateId: 'C1',
    phase: 'RESULTS',
    gameState: { answerMode: 'OPEN', question: { id: 'q2', text: 'Name the capital' }, winnerCandidateId: 'C1' },
    results: { correctOptionKey: null, winnerCandidateId: 'C1', rankings: [
      { candidateId: 'C1', elapsedMs: 4200, status: 'correct' },
    ] },
  });
  assert('OPEN round: winner shows "YOU WON THIS ROUND"', openHtml.includes('YOU WON THIS ROUND'));
  assert('OPEN round: correct answer shown as spoken-answer note', openHtml.includes('Spoken answer (judged by Quiz Master)'));

  assert('all renders non-empty (no crash/blank)', wonHtml.length > 0 &&
    correctSlowerHtml.length > 0 && incorrectHtml.length > 0 && noAnswerHtml.length > 0);

  console.log(`\n${'='.repeat(50)}\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}\n${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });