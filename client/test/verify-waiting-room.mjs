/**
 * Browser-like render verification for the Candidate WAITING ROOM (Task 5.6).
 * Mounts the REAL CandidateTablet in jsdom with a mocked socket.io-client and a
 * mocked global fetch returning THIS candidate's own profile, then asserts that
 * before the quiz starts (phase IDLE, the default before any server push) the
 * tablet shows this candidate's own name + logo and a "Waiting for the quiz to
 * start" message — and is NOT a blank screen.
 * Usage: node client/test/verify-waiting-room.mjs
 */
import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';

const require = createRequire(import.meta.url);
const SRC = path.resolve(process.cwd(), 'src').replace(/\\/g, '/');

let pass = 0, fail = 0;
const assert = (l, c) => { if (c) { pass++; console.log(`  PASS  ${l}`); } else { fail++; console.error(`  FAIL  ${l}`); } };

const fakeSocket = `
  globalThis.__sockets = globalThis.__sockets || [];
  function mk(){ const h={}; const s={ on(e,cb){(h[e]=h[e]||[]).push(cb);}, off(){}, disconnect(){}, close(){}, emit(){}, _fire(e){(h[e]||[]).forEach(cb=>cb());} }; globalThis.__sockets.push(s); return s; }
  export function io(){ return mk(); }
  export default { io };
`;

async function build() {
  const fakePath = path.join(os.tmpdir(), 'fake-socket-wr.mjs').replace(/\\/g, '/');
  fs.writeFileSync(fakePath, fakeSocket);
  const entry = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Routes, Route } from 'react-router-dom';
    import CandidateTablet from '${SRC}/candidate/CandidateTablet.jsx';
    export { React, createRoot, MemoryRouter, Routes, Route, CandidateTablet };
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

  // Mock fetch to return THIS candidate's own profile (public, no joinToken).
  global.fetch = async (url) => {
    const body = JSON.stringify({ id: 'cand-1', name: 'Aarav Shah', logoUrl: '/uploads/candidates/aarav.png', score: 0, isActive: true });
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  };

  const M = await build();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Mount the real CandidateTablet with a valid token; fire 'connect' so it
  // flips from 'connecting' to 'valid' and renders the game context. Before any
  // server game:state:public push, the default phase is IDLE -> WaitingRoom.
  globalThis.__sockets = [];
  const root = M.createRoot(document.getElementById('root'));
  root.render(M.React.createElement(M.MemoryRouter, { initialEntries: ['/play/cand-1?token=good'] },
    M.React.createElement(M.Routes, null, M.React.createElement(M.Route, { path: '/play/:candidateId', element: M.React.createElement(M.CandidateTablet) }))
  ));
  await wait(30);
  const s = globalThis.__sockets[globalThis.__sockets.length - 1];
  if (s) s._fire('connect');
  await wait(80); // allow the fetch + state update to render

  const html = document.getElementById('root').innerHTML;

  assert('waiting: NOT a blank screen (has content)', html.trim().length > 50);
  assert('waiting: shows THIS candidate name "Aarav Shah"', html.includes('Aarav Shah'));
  assert('waiting: shows the waiting message', html.toUpperCase().includes('WAITING FOR THE QUIZ TO START'));
  assert('waiting: shows the candidate logo image', html.includes('/uploads/candidates/aarav.png'));
  assert('waiting: does NOT show the error screen', !html.includes("This link isn't valid"));
  assert('waiting: does NOT show "THE HOT SEAT" placeholder (replaced)', !html.includes('THE HOT SEAT'));

  root.unmount();

  console.log(`\n${'='.repeat(50)}\nResults: ${pass} passed, ${fail} failed out of ${pass + fail}\n${'='.repeat(50)}`);
  process.exitCode = fail > 0 ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });