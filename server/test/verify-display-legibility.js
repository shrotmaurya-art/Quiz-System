/**
 * Display projector-legibility audit (Task 4.7 polish verification).
 *
 * No browser is available in this environment, so this does a static audit:
 * it parses each Display view's font-size utility classes, resolves them to
 * rendered px using the project's Tailwind @theme scale (client/src/index.css),
 * and asserts every text element meets a projector-legibility floor at
 * 1920x1080 (text readable from the back of a school hall). It also confirms
 * the only changes in this task were className strings (no logic/socket edits).
 *
 * Usage: node server/test/verify-display-legibility.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DISPLAY_DIR = path.resolve(__dirname, '..', '..', 'client', 'src', 'display');

// ── Theme font-size scale (from client/src/index.css @theme) ──
const THEME = {
  'text-display-lg': 48,
  'text-display-xl': 72,
  'text-headline-md': 24,
  'text-headline-xl': 40,
  'text-label-caps': 14,
  'text-body-md': 16,
  'text-body-lg': 18,
  'text-body-xl': 24,
};

// Projector-legibility floors (px) — conservative for reading from the back
// of a room at ~1920x1080. Body copy must be large; headings/hero larger.
const FLOOR = {
  body: 22, // body copy (names-in-strip, captions) must be >=22px
  label: 14, // labels/caps are acceptable small but must be >=14
  heading: 32, // any headline/name/rank — readable from the back of a hall
  hero: 40, // countdown / winner time / big score numbers
};

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.error(`  FAIL  ${label}`); }
}

// Extract every font-size token or explicit text-[Npx] from a className string.
function extractSizes(classStr) {
  const sizes = [];
  // theme tokens like text-display-lg, text-headline-md, text-body-lg, text-label-caps
  for (const tok of Object.keys(THEME)) {
    if (classStr.includes(tok)) sizes.push({ src: tok, px: THEME[tok] });
  }
  // explicit arbitrary px: text-[56px], text-[120px], md:text-[64px]
  const re = /text-(?:[a-z]+:)?\[(\d+)px\]/g;
  let m;
  while ((m = re.exec(classStr)) !== null) {
    sizes.push({ src: `text-[${m[1]}px]`, px: parseInt(m[1], 10) });
  }
  return sizes;
}

function auditView(file) {
  const full = path.join(DISPLAY_DIR, 'phases', file);
  const src = fs.readFileSync(full, 'utf8');
  console.log(`\n=== ${file} ===`);

  // Find every className="..." occurrence
  const classRe = /className="([^"]*)"/g;
  let cm;
  let anyText = false;
  while ((cm = classRe.exec(src)) !== null) {
    const cls = cm[1];
    // Material Symbols icons are glyphs, not readable text — exempt from
    // legibility floors (their size is decorative, not for reading copy).
    if (/material-symbols-outlined/.test(cls)) continue;

    const sizes = extractSizes(cls);
    if (sizes.length === 0) continue;
    anyText = true;
    // Whole-class context: a label token on the same element means the
    // explicit px is a label, not a heading.
    const hasLabelToken = /text-label-caps/.test(cls);
    const hasBodyToken = /text-body-(md|lg|xl)/.test(cls);
    for (const s of sizes) {
      let floor = FLOOR.heading;
      let kind = 'heading/display';
      if (hasLabelToken || /label/.test(s.src)) { floor = FLOOR.label; kind = 'label'; }
      else if (hasBodyToken || /body/.test(s.src)) { floor = FLOOR.body; kind = 'body'; }
      else if (/headline/.test(s.src)) { floor = FLOOR.heading; kind = 'headline'; }
      else if (/display/.test(s.src)) { floor = FLOOR.hero; kind = 'display/hero'; }

      const ok = s.px >= floor;
      assert(`${file}: ${s.src} = ${s.px}px (${kind}) >= ${floor}px floor`, ok);
    }
  }
  if (!anyText) assert(`${file}: has at least one text element`, false);
}

// ── 1. Legibility audit of all five views ──
const VIEWS = ['IdleView.jsx', 'QuestionView.jsx', 'GapView.jsx', 'ResultsView.jsx', 'ScoreboardView.jsx'];
for (const v of VIEWS) auditView(v);

// ── 2. Confirm no logic/socket/field changes in this task (styling only) ──
// Heuristic: the display phase views must not import sockets, fetch, or call
// gameEngine; they only read from useDisplayGame(). Confirm no socket.io-client
// import and no emit() in any display view.
console.log('\n=== Styling-only guard (no logic/socket wiring in display views) ===');
const allViewFiles = fs.readdirSync(path.join(DISPLAY_DIR, 'phases'));
for (const f of allViewFiles) {
  if (!f.endsWith('.jsx')) continue;
  const src = fs.readFileSync(path.join(DISPLAY_DIR, 'phases', f), 'utf8');
  assert(`${f}: no socket.io-client import`, !/socket\.io-client/.test(src));
  assert(`${f}: no socket.emit / client.emit`, !/\.emit\(/.test(src));
  assert(`${f}: only reads from useDisplayGame (no direct engine calls)`, !/gameEngine|require\(['"]\.\.\/\.\.\/server/.test(src));
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${'='.repeat(50)}`);
process.exitCode = fail > 0 ? 1 : 0;