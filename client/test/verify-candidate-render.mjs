/**
 * Browser-like render verification for the Candidate tablet (Phase 5.1).
 * Mounts the REAL CandidateTablet in jsdom with a mocked socket.io-client and
 * drives connect / connect_error / missing-token to assert which screen shows.
 * Usage: node client/test/verify-candidate-render.mjs
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
  const fakePath = path.join(os.tmpdir(), 'fake-socket.mjs').replace(/\\/g, '/');
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
  new Function('module','exports','require', r.outputFiles[0].text)(m, m.exports, require);
  return m.exports;
}

async function main() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  global.window = dom.window; global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement; global.requestAnimationFrame = (cb)=>setTimeout(cb,0); global.cancelAnimationFrame=(id)=>clearTimeout(id);

  const M = await build();
  const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

  async function mount(entry, fire) {
    globalThis.__sockets = [];
    const root = M.createRoot(document.getElementById('root'));
    root.render(M.React.createElement(M.MemoryRouter, { initialEntries:[entry] },
      M.React.createElement(M.Routes, null, M.React.createElement(M.Route, { path:'/play/:candidateId', element: M.React.createElement(M.CandidateTablet) }))
    ));
    await wait(30);
    const s = globalThis.__sockets[globalThis.__sockets.length-1];
    if (fire && s) s._fire(fire);
    await wait(30);
    const html = document.getElementById('root').innerHTML;
    root.unmount();
    return html;
  }

  const valid = await mount('/play/cand-1?token=good', 'connect');
  assert('valid token + connect -> waiting shell (THE HOT SEAT)', valid.includes('THE HOT SEAT') && valid.includes('Waiting for the quiz to start'));
  assert('valid token + connect -> NOT error screen', !valid.includes("This link isn't valid"));

  const wrong = await mount('/play/cand-1?token=bad', 'connect_error');
  assert('wrong token + connect_error -> friendly error screen', wrong.includes("This link isn't valid") && wrong.includes('Quiz Master'));
  assert('wrong token -> not blank', wrong.trim().length > 0);

  const missing = await mount('/play/cand-1', null);
  assert('missing token -> friendly error screen', missing.includes("This link isn't valid"));
  assert('missing token -> no socket created (short-circuit)', globalThis.__sockets.length === 0);

  assert('all renders non-empty (no crash/blank)', valid.length>0 && wrong.length>0 && missing.length>0);

  console.log(`\n${'='.repeat(50)}\nResults: ${pass} passed, ${fail} failed out of ${pass+fail}\n${'='.repeat(50)}`);
  process.exitCode = fail>0 ? 1 : 0;
}
main().catch((e)=>{ console.error(e); process.exitCode=1; });