# LIVE QUIZ COMPETITION SYSTEM — BEGINNER BUILD GUIDE (Phases 0–5)

**Companion to:** `Quiz_System_Architecture_Document.md` (v2.2) — read that first if you haven't. Every field name, endpoint, and event name below is copied exactly from it.
**Your toolchain:** [Google Antigravity](https://antigravity.google) · [OpenAI Codex CLI](https://github.com/openai/codex) · [OpenCode](https://opencode.ai) (running free DeepSeek V4 Flash / Big Pickle models)
**Who this is for:** someone who has never shipped a full-stack app before, working with AI coding agents for the first time.

**Build guide revision note (v1.1):** an architecture review found that Task 2.5, as originally written, specified room-based *routing* (which events go to which room) but never specified room-based *authentication* (what proves a connecting socket is allowed into the `admin` room in the first place). Left unfixed, that's a hole the REST-layer PIN auth doesn't cover: anyone on the LAN could open a raw Socket.IO connection, ask to join `admin`, and receive `correctOptionKey` before reveal or issue `admin:*` commands — which would quietly undo the v2.1/v2.2 fixes at the transport layer. Tasks 1.3, 2.5, 3.1, and 3.2 below, and the AGENTS.md security rules, have been updated to close this. Everywhere else, the same fields, endpoints, and event names are still copied exactly from the architecture document (v2.2).

**Build guide revision note (v1.2):** the Stitch.ai UI mockups under `docs/stitch-ui/` have been wired into every relevant Phase 3–5 task as the visual design reference (new Section 0.1, plus new Task 0.8 to bring the assets into the repo). Cross-referencing the mockup set against the existing task list also surfaced a real gap: no task built the Main Display's Gap/suspense state, even though the architecture document requires one and a mockup (`projector_view_suspense_interlude`) exists for it — **new Task 4.4B** fixes this. AGENTS.md Rule 6 was also extended to make clear the mockups govern visuals only, never field names, endpoints, or behavior — the architecture document stays the single source of truth for those.

---

## 0. HOW TO USE THIS GUIDE

Every task below follows the same 4-step pattern:

1. **Open the prompt** — copy the text in the "Prompt" box and paste it into the assigned tool (Antigravity, Codex CLI, or OpenCode).
2. **Let the agent work**, then **read the diff** it proposes before accepting — even as a beginner, skim it. You don't need to understand every line, just check it's touching the files the task says it should.
3. **Verify** — do the specific checks listed under "Verify" for that task. Don't move to the next task until verification passes.
4. **Commit & push** — run the 3-line Git block given for that task.

Tasks are numbered `Phase.Task` (e.g. `1.3` = Phase 1, Task 3). Do them in order within a phase — later tasks assume earlier ones exist.

---

## 0.1 THE STITCH.AI UI MOCKUPS — `docs/stitch-ui/`

Before Phase 3, you generated high-fidelity screen mockups for every UI state in this system using [Stitch](https://stitch.withgoogle.com) (Google's AI UI-design tool), one folder per screen/state, all living under `docs/stitch-ui/`. These are **visual design references, not code** — none of the three coding agents should read them as a spec for field names, endpoints, or event names (that's still the architecture document, always). Treat them the same way a developer would treat a Figma handoff: match the layout, spacing, visual hierarchy, and color/typography choices shown in the mockup; deviate only where it conflicts with a stated functional requirement (projector legibility from NFR4, tablet touch-target size in Task 5.7, etc.) — and say so explicitly if you do.

Every UI task's prompt below now includes a line telling the agent exactly which `docs/stitch-ui/` subfolder is the visual reference for that task. Here's the full map, so you can also sanity-check it yourself before assigning a task:

| `docs/stitch-ui/` folder | Screen / state | Feeds task(s) |
|---|---|---|
| `quiz_master_control_login` | Admin PIN login | 3.2 |
| `rounds_questions_management` | Rounds & Questions tab | 3.3 |
| `candidate_roster_management` | Candidates tab | 3.4 |
| `live_control_center_question_live_phase` | Live Control — question live | 3.5 |
| `live_control_center_judging_phase` | Live Control — OPEN-round judging | 3.5 |
| `live_control_center_results_phase` | Live Control — results | 3.5 |
| `admin_settings_backup` | Settings/Backup tab | 3.6 |
| `grand_opening_idle_screen` | Display idle/branding | 4.2 |
| `projector_view_live_question_pre_reveal` | Display — MCQ question, pre-reveal | 4.4 |
| `projector_view_rapid_fire_round` | Display — OPEN/Rapid Fire question variant | 4.4 |
| `projector_view_suspense_interlude` | Display — Gap/suspense screen | **4.4B (new — see below)** |
| `projector_view_results_winner_reveal` | Display — results/ranking | 4.5 |
| `projector_view_final_leaderboard_champion_reveal` | Display — scoreboard / `QUIZ_ENDED` | 4.6 |
| `cinematic_grandeur`, `shader_1`, `shader_2` | Ambient background/shader treatment — not a single screen, a shared visual mood board | 4.1 (base theme), 4.7 (polish) |
| `candidate_tablet_invalid_link_error` | Candidate — bad/expired token | 5.1 |
| `candidate_tablet_waiting_room`, `candidate_tablet_waiting_room_desktop` | Candidate idle/waiting (tablet + desktop-preview variant) | 5.6 |
| `candidate_tablet_live_mcq_active`, `candidate_tablet_live_mcq_locked_in` | Candidate MCQ answer screen | 5.3 |
| `candidate_tablet_rapid_fire_active`, `candidate_tablet_rapid_fire_locked` | Candidate OPEN/Rapid Fire answer screen | 5.4 |
| `candidate_tablet_results_correct`, `candidate_tablet_results_incorrect`, `candidate_tablet_results_winner` | Candidate results/feedback screen | 5.5 |

**Two things this mapping surfaced that the original Phase 3–5 task list missed:**

1. **No task built the Display's Gap/suspense screen**, even though Section 10 of the architecture doc requires one and Section 12's client already subscribes to `gap:started`/`gap:tick` in Task 4.3. There's a mockup for it (`projector_view_suspense_interlude`) but nothing was building it. **New Task 4.4B below fixes this.**
2. **There's no candidate-tablet mockup for the Gap phase**, and Section 13's Candidate Tablet spec never describes one either (only Section 10 mentions Gap running on "Tablets" too, in passing). Rather than invent a screen with no design reference, Tasks 5.3/5.4 below now say explicitly: the tablet's existing "Locked ✔" view stays on-screen through `TIME_UP` and any Gap phase — no separate build needed. Flag it to your Quiz Master/designer if a dedicated tablet suspense screen turns out to be wanted later; it isn't in scope for Phases 0–5 as currently designed.

---

## 1. WHY THREE DIFFERENT TOOLS

You're running three different AI coding agents side by side. That's not overkill for this project — it's a deliberate cost/quality split. **The default is OpenCode.** Only a task that's genuinely likely to trip up a fast/free model — because a mistake there is either expensive to notice later, or is exactly the kind of subtle security detail this project has already gotten wrong twice (the v2.1/v2.2/v1.1 fixes) — gets escalated to Codex CLI or Antigravity instead.

| Tool | Model(s) | Cost | Use for |
|---|---|---|---|
| **OpenCode** (default) | DeepSeek V4 Flash or Big Pickle (both free on OpenCode Zen) | $0 | **The majority of tasks** — standard CRUD routes, form screens, scaffolding, wiring one already-built piece to another, seed/test scripts, and all visual polish. Any task with a clear, fully-specified prompt and no cross-cutting security decision to make defaults here, even if it's not "trivial" — a detailed prompt is usually enough for a free model to get a well-scoped task right. |
| **Codex CLI** (escalation, tier 1) | GPT (OpenAI) | Free tier / your ChatGPT plan | **Tough-but-not-foundational** tasks — specifically, the small number of tasks that sit exactly on top of a security fix this project has already had to make twice (v2.1, v2.2, v1.1): getting them subtly wrong (an unredacted field slipping into a "public" response, an admin route left unprotected, the wrong look-alike event name used) silently re-opens a closed hole rather than causing a visible crash, which is exactly the failure mode a fast/cheap model is most likely to produce under time pressure and least likely to catch itself. |
| **Antigravity** | Gemini 3.1 Pro | Free (generous preview limits) | **Hard & foundational** tasks — the database schema, the core state machine, the timer/scoring engine, the socket room-security implementation itself (not just code that consumes it), and the candidate lock-in UI. These are the tasks everything else is built on top of, or where a bug wouldn't surface until the actual event night. Worth spending the most capable tool's context and Planning mode on. |

**The rule of thumb, in order:** start every task at **OpenCode**. Move it to **Codex CLI** only if it sits directly on top of a previously-fixed security hole (Section 11/12/15's admin-vs-public split) or involves a cross-cutting refactor that could silently break an existing guard. Move it to **Antigravity** only if it's foundational (schema, engine, scoring, the security implementation itself) or if a bug in it wouldn't be caught until the live event. Every task below already tells you which tier it landed in and why — you don't have to make this call yourself.

**Current split across Phases 0–5:** 24 tasks on OpenCode, 5 on Codex CLI, 10 on Antigravity — roughly 62% of the work on the free/bulk tier, with the remaining 38% reserved for the handful of places a mistake would actually hurt.

---

## 2. THE AGENT RULES FILE — `AGENTS.md`

All three of your tools — Antigravity, Codex CLI, and OpenCode — automatically read a file named **`AGENTS.md`** placed at the root of your project folder, before doing any work. This is the single most important file in this guide: it's the guardrail that stops an AI agent from doing the classic "wipe your code / run a destructive command / go outside its lane" mistakes that beginners run into.

You will create this file once, by hand (copy-paste exactly — don't let an AI agent generate this one, since it's the thing that constrains the AI agents), in **Task 0.5** below. Here is its full content:

```markdown
# AGENTS.md — Rules for AI Coding Agents on This Project

Read this file before doing anything else. These rules apply to every AI agent working
in this repository — Antigravity, Codex CLI, OpenCode, or any other tool that reads
AGENTS.md. If a request from the developer conflicts with a rule below, follow the rule
and ask the developer to confirm before proceeding.

## 0. What this project is
A LAN-only, single-school live quiz competition system. Full spec lives in
`docs/Quiz_System_Architecture_Document.md` — READ IT before writing code that touches
data models, API routes, or Socket.IO events. Field names, endpoint paths, and event
names in that document are the source of truth. Do not invent new ones; do not rename
existing ones without flagging it to the developer first.

## 1. Never destroy work without being asked
- NEVER run `rm -rf`, `git reset --hard`, `git clean -fd`, `git push --force`, or any
  other destructive command unless the developer's prompt explicitly asks for that exact
  action in that exact task.
- NEVER delete or overwrite a file that already has content unless the current task
  explicitly says to replace or delete it. If you need to change a file, READ it first,
  then edit only the relevant part.
- NEVER truncate a file to "start fresh" as a shortcut. If a file is broken, fix it —
  don't blank it and regenerate everything, which throws away unrelated working code.
- If completing the task requires deleting or significantly rewriting existing code,
  STOP and explain what you want to delete and why, before doing it.

## 2. Stay inside the task you were given
- Only touch files that are relevant to the current task's prompt. Do not "helpfully"
  refactor, rename, reformat, or upgrade unrelated files or dependencies while doing a
  task — that makes changes hard to review and hard to undo.
- Do not add new npm packages that are not already listed in
  `docs/Quiz_System_Architecture_Document.md` Section 8 (Technology Stack) unless the
  task explicitly asks for one.
- If a task seems to require something outside its stated scope, stop and say so instead
  of silently expanding the task.

## 3. Git discipline
- Always work on the feature branch created for the current task. Never commit directly
  to `main`.
- Never force-push. Never rewrite history on a shared branch.
- One task = one commit (or a small number of clearly-scoped commits). Do not bundle
  multiple unrelated tasks into a single commit.
- Write commit messages that name the task, e.g. `Phase 1.3: Admin PIN auth middleware`.
- Never commit `.env`, `node_modules/`, `*.sqlite`, or anything under
  `server/src/uploads/` — these must stay in `.gitignore`.

## 4. Security rules specific to this project
- Every endpoint or Socket.IO event that can expose `correctOptionKey` or a candidate's
  `joinToken` must require the admin session token / be emitted only to the `admin`
  room. See Section 11 and Section 12 of the architecture doc for the exact list of
  which endpoints/events are admin-only vs. public. Getting this wrong re-opens a
  security hole that has already been found and fixed twice (v2.1, v2.2) — do not
  regress it.
- Room membership is not self-declared. A socket must never be placed in the `admin`
  room because it *claims* to be admin (e.g. a `role=admin` field it sent) — it must
  present the same admin session token issued by `POST /api/admin/login`, verified
  server-side against the valid-tokens store, exactly like every `requireAdmin` REST
  route. The `candidate:<id>` room already works this way (token validated against
  the DB) — the `admin` room must be held to the same standard. Only the `display`
  room may be joined without a token, since it only ever receives already-redacted,
  public-safe data.
- Never hardcode the admin PIN, API keys, or any secret directly in source code. Use
  environment variables (`.env`, excluded from git) and read them with
  `process.env.SOMETHING`.
- Never log full request bodies that might contain the admin PIN or session tokens.

## 5. Verify before declaring a task done
- After making changes, run the project's existing build/lint/test commands if they
  exist (`npm run build`, `npm test`, etc.) before saying the task is complete.
- If you added a new API route, actually test it (e.g. with `curl` or a short Node
  script) rather than assuming it works from reading the code.
- If something doesn't work, say so plainly — do not report a task as "done" when you
  are not sure it works.

## 6. Match the architecture document exactly
- REST endpoint paths, HTTP methods, Socket.IO event names, and data model field names
  must match `docs/Quiz_System_Architecture_Document.md` exactly (e.g. `answerMode`, not
  `answer_mode` or `mode`; `game:state:public`, not `gameStatePublic`).
- If you believe the architecture document is wrong or incomplete for the task at hand,
  say so and propose a specific change — do not silently deviate from it.
- `docs/stitch-ui/` contains AI-generated visual mockups, one folder per screen/state
  (mapping in the build guide's Section 0.1). These are a design reference for layout,
  spacing, and styling ONLY — never treat them as a source for field names, endpoints,
  event names, or behavior. If a mockup's layout implies a data shape or interaction
  that conflicts with the architecture document, the architecture document wins; flag
  the conflict instead of silently picking one.

## 7. When in doubt, ask
- If a prompt is ambiguous, or the correct behavior isn't covered by the architecture
  document, ask a clarifying question instead of guessing on anything that affects data
  safety, security, or the scoring/timing engine (Sections 9, 10, 12 of the architecture
  doc).
```

**Why this works across all three tools without duplication:** `AGENTS.md` at the project root is a cross-tool standard — Antigravity, Codex CLI, and OpenCode all discover and read it automatically at the start of every session, with no per-tool setup needed. You write the rules once.

---

## 3. GIT & GITHUB WORKFLOW PATTERN

You'll repeat this exact pattern for every single task in this guide. Learn it once here:

```bash
# 1. Make sure you're starting from a clean, up-to-date main
git checkout main
git pull origin main

# 2. Create a fresh branch just for this task
git checkout -b <branch-name-for-this-task>

# 3. Run the task's prompt in the assigned tool, review the diff, verify it works

# 4. Commit the work
git add .
git commit -m "<commit message for this task>"

# 5. Merge into main and push
git checkout main
git merge <branch-name-for-this-task>
git push origin main
```

Each task below gives you the exact `<branch-name>` and `<commit message>` to drop into this pattern — from Phase 1 onward, the git block is shown compactly as:

```bash
git checkout -b phase1/1.1-sqlite-schema
git add . && git commit -m "Phase 1.1: SQLite schema"
git checkout main && git merge phase1/1.1-sqlite-schema && git push origin main
```

If a merge conflict ever appears (rare, since you're one person working sequentially), stop and ask your AI agent to help resolve it — don't guess.

---

## 4. PHASE 0 — ENVIRONMENT, TOOLS & REPO SETUP

This phase is mostly manual — you're installing things and creating accounts, not writing code yet. No AGENTS.md exists until Task 0.5, so there's nothing for an AI agent to misbehave with before then.

### Task 0.1 — Install Node.js and Git
**Tool:** Manual (no AI agent)
**Do this:**
1. Install [Node.js LTS](https://nodejs.org) (version 22 or newer).
2. Install [Git](https://git-scm.com/downloads).
3. Open a terminal and run:
```bash
node --version
git --version
```
**Verify:** both commands print a version number (Node 22.x or higher, Git 2.x or higher). If `node --version` fails, restart your terminal after installing.
**Git:** nothing to commit yet.

### Task 0.2 — Create your GitHub repository
**Tool:** Manual
**Do this:**
1. Go to [github.com](https://github.com), sign in (or create an account).
2. Click **New repository** → name it `quiz-system` → keep it **Private** (it'll contain your school's question bank) → check **Add a README** → Create.
3. On your computer, clone it:
```bash
git clone https://github.com/<your-username>/quiz-system.git
cd quiz-system
git config user.name "Your Name"
git config user.email "your-email@example.com"
```
**Verify:** `cd quiz-system && ls` shows a `README.md` file. `git remote -v` shows your GitHub URL for both `fetch` and `push`.
**Git:** nothing extra to commit — the clone already did it.

### Task 0.3 — Install the three AI coding tools
**Tool:** Manual
**Do this:**

*Antigravity:*
1. Go to [antigravity.google](https://antigravity.google) and download the installer for your OS (Windows/macOS/Linux).
2. Run the installer, sign in with a Google account (a personal Gmail account works).
3. When it asks about a development mode, pick **"Agent-assisted development"** (recommended) — you stay in control, the agent proposes changes you review.
4. For Terminal Policy, leave it on the default so it asks before running anything risky.

*Codex CLI:*
```bash
npm install -g @openai/codex
codex --version
```
Then authenticate — either `codex login` (sign in with your ChatGPT account) or set `OPENAI_API_KEY` if you're using API credits.

*OpenCode:*
```bash
npm install -g opencode-ai
opencode --version
```
Then run `opencode` once, follow the prompt to connect a provider, and choose **OpenCode Zen** → select **DeepSeek V4 Flash** or **Big Pickle** (both free). You don't need your own API key for these two.

**Verify:**
- `codex --version` and `opencode --version` both print version numbers.
- Antigravity opens and shows the Agent Manager screen after sign-in.
- In OpenCode, running `/models` (or the model picker) shows `deepseek-v4-flash` and/or `big-pickle` available.

**Git:** nothing to commit yet.

### Task 0.4 — First commit: `.gitignore` and folder skeleton
**Tool:** OpenCode (bulk/easy — pure boilerplate, no project logic yet)
**Prompt:**
```
Inside the quiz-system repo root, create a .gitignore file for a Node.js + React
project that excludes: node_modules/, .env, *.sqlite, *.sqlite3, dist/, build/,
server/src/uploads/*  (but keep server/src/uploads/.gitkeep so the folder itself is
tracked), .DS_Store, and standard editor folders (.vscode/, .idea/). Also create these
empty folders with a .gitkeep file in each so they exist in git before we add real
files: server/src, client/src, seed/, docs/. Do not create any other files yet.
```
**Verify:**
- `git status` shows the new `.gitignore` and the four `.gitkeep` files as untracked.
- Open `.gitignore` and confirm it lists `node_modules/`, `.env`, `*.sqlite`, `server/src/uploads/*`.
```bash
git checkout -b phase0/0.4-gitignore-skeleton
git add . && git commit -m "Phase 0.4: gitignore and folder skeleton"
git checkout main && git merge phase0/0.4-gitignore-skeleton && git push origin main
```

### Task 0.5 — Create `AGENTS.md` (by hand)
**Tool:** Manual — copy-paste, do not generate this with AI
**Do this:** Create a file named `AGENTS.md` at the repo root (`quiz-system/AGENTS.md`) and paste in the **exact content from Section 2 above**, word for word.
**Verify:**
- The file exists at `quiz-system/AGENTS.md` (not inside a subfolder).
- Open Antigravity on this project and check its Rules panel picks it up (Agent Manager → "..." menu → Customizations → Rules tab should show the project's `AGENTS.md`).
- In Codex CLI, run `codex` inside the repo and ask it "what does AGENTS.md in this repo say about git?" — it should summarize Section 3 correctly.
- In OpenCode, run `opencode` inside the repo and ask the same question.
```bash
git checkout -b phase0/0.5-agents-md
git add . && git commit -m "Phase 0.5: add AGENTS.md agent rules file"
git checkout main && git merge phase0/0.5-agents-md && git push origin main
```

### Task 0.6 — Copy the architecture document into the repo
**Tool:** Manual
**Do this:** Save the architecture document as `quiz-system/docs/Quiz_System_Architecture_Document.md` (the v2.2 version, with both security fixes applied).
**Verify:** `cat docs/Quiz_System_Architecture_Document.md | head -20` shows the document header and the v2.2 revision note.
```bash
git checkout -b phase0/0.6-architecture-doc
git add . && git commit -m "Phase 0.6: add architecture document"
git checkout main && git merge phase0/0.6-architecture-doc && git push origin main
```

### Task 0.7 — Scaffold `server/` and `client/`
**Tool:** OpenCode (bulk/easy — standard project scaffolding, no custom logic)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 8 (Technology
Stack) and Section 14 (Folder Structure) first.

Scaffold two projects inside this repo, matching Section 14's folder structure exactly:

1. server/ — a Node.js + Express project.
   - Run npm init inside server/ and install: express, socket.io, better-sqlite3,
     multer, cors, dotenv, uuid.
   - Install nodemon as a dev dependency.
   - Create the empty folder structure: server/src/db/, server/src/routes/,
     server/src/sockets/, server/src/middleware/, server/src/uploads/ (with a
     .gitkeep).
   - Add a "dev" script to server/package.json that runs
     "nodemon src/index.js".
   - Do NOT write any route or logic code yet — just the skeleton and package.json.
     A later task will fill in server/src/index.js.

2. client/ — a React app using Vite.
   - Scaffold with the react template.
   - Install and configure Tailwind CSS per Tailwind's official Vite guide.
   - Create the folder structure: client/src/admin/, client/src/display/,
     client/src/candidate/, client/src/shared/.
   - Do not build any actual screens yet — just the scaffold, so it runs with
     "npm run dev" and shows the default Vite+React starter page.

Report back the exact commands you ran and the final folder tree.
```
**Verify:**
- `cd server && npm run dev` starts without crashing (it's fine if there's no real server logic yet — even an empty `index.js` that just prints "ok" is acceptable at this stage).
- `cd client && npm run dev` opens a browser tab showing the default Vite+React starter page with Tailwind loaded (no visible errors in the browser console).
- The folder tree matches Section 14 of the architecture doc.
```bash
git checkout -b phase0/0.7-scaffold
git add . && git commit -m "Phase 0.7: scaffold server and client projects"
git checkout main && git merge phase0/0.7-scaffold && git push origin main
```

### Task 0.8 — Add the Stitch UI mockups as reference material
**Tool:** Manual
**Do this:** Place your exported Stitch mockups under `quiz-system/docs/stitch-ui/`, matching the folder-per-screen structure listed in Section 0.1 above exactly (e.g. `docs/stitch-ui/quiz_master_control_login/`, `docs/stitch-ui/candidate_tablet_results_winner/`, etc.). These are reference-only assets (images/exported markup) — they do not get imported into `client/` or wired up as code; agents read them for visual guidance during the matching Phase 3–5 task, per Section 0.1's mapping table. Do not delete or rename any of the folders even if a task hasn't reached them yet.
**Verify:** `ls docs/stitch-ui/` shows all 26 folders from Section 0.1's table, none empty.
```bash
git checkout -b phase0/0.8-stitch-ui-mockups
git add . && git commit -m "Phase 0.8: add Stitch UI mockups as design reference"
git checkout main && git merge phase0/0.8-stitch-ui-mockups && git push origin main
```

**Phase 0 exit check:** you have a GitHub repo with `AGENTS.md`, the architecture doc, the Stitch UI mockups under `docs/stitch-ui/`, and empty `server/`/`client/` projects that both start without errors. All three AI tools are installed and can see `AGENTS.md`. You're ready for Phase 1.

---

## 5. PHASE 1 — CORE DATA LAYER (Rounds, Questions, Candidates CRUD)

Implements Sections 9 (Data Model) and 11 (REST API) of the architecture doc, including the v2.1 auth-gating fix.

### Task 1.1 — SQLite schema
**Tool:** Antigravity (hard & important — every later phase depends on this being right; a mistake here cascades everywhere)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 9 (Data Model)
completely before writing anything.

Create server/src/db/schema.sql implementing these tables, matching the field names,
types, and defaults in Section 9 exactly:

- candidates (id, name, logoUrl, score, isActive, joinToken)
- global_settings (single row: defaultTimeLimitSeconds, defaultGapEnabled,
  defaultGapSeconds)
- rounds (id, name, "order", answerMode, pointsPerQuestion, timeLimitSeconds,
  gapEnabled, gapSeconds, instructions)
- questions (id, roundId, "order", text, mediaType, mediaUrl, options — store as a
  JSON text column since SQLite has no native array type, correctOptionKey,
  pointsOverride, timeLimitOverrideSeconds, gapEnabledOverride, gapSecondsOverride)
- game_state (single row, matching every field in the GameState shape in Section 9:
  phase, currentRoundId, currentQuestionId, timerStartedAt, timeLimitSeconds,
  gapEnabled, gapSeconds, locks as JSON text, judgements as JSON text,
  winnerCandidateId, resultsRevealed)
- score_log (id, questionId, candidateId, pointsChange, reason, timestamp)

Use TEXT for ids (we'll generate UUIDs in app code, not autoincrement integers).
Add foreign keys: questions.roundId -> rounds.id, score_log.questionId ->
questions.id, score_log.candidateId -> candidates.id.
Add a CHECK constraint on rounds.answerMode restricting it to 'MCQ' or 'OPEN'.
Add a CHECK constraint on questions.mediaType restricting it to 'none', 'image',
'video'.

Then create server/src/db/db.js that:
- opens the SQLite file at server/src/db/quiz.sqlite using better-sqlite3
- on startup, runs schema.sql if the tables don't already exist (idempotent —
  running it twice must not error or wipe existing data)
- inserts one default row into global_settings (30, true, 10) only if the table is
  empty
- exports the open database connection for other files to import

Do not create any routes yet. After writing the files, run node -e
"require('./server/src/db/db.js')" and confirm it creates quiz.sqlite with no
errors, then show me the output of running .tables in the sqlite3 CLI (or an
equivalent Node query) against the new file.
```
**Verify:**
- `server/src/db/quiz.sqlite` is created after running the db.js file once.
- Running it a second time does not throw an error and does not wipe the file (check the file's modified timestamp barely changes, or add a temporary row and confirm it survives a second run).
- Open the file with any SQLite viewer (or `sqlite3 server/src/db/quiz.sqlite ".tables"`) and confirm all 6 tables exist with the field names from Section 9.
- `global_settings` has exactly one row: `30 | 1 | 10`.
```bash
git checkout -b phase1/1.1-sqlite-schema
git add . && git commit -m "Phase 1.1: SQLite schema and db connection"
git checkout main && git merge phase1/1.1-sqlite-schema && git push origin main
```

### Task 1.2 — DB connection wrapper & migration runner
**Tool:** OpenCode (default tier — mechanical extension of an existing file with small, well-specified helper functions; no security or architecture decisions involved)
**Prompt:**
```
Read AGENTS.md first. server/src/db/db.js already opens the database and runs
schema.sql once. Extend it (don't rewrite it — edit the existing file) so that:

- It exports small helper functions other files will reuse: getGlobalSettings(),
  updateGlobalSettings(patch), and a generic run(sql, params) / get(sql, params) /
  all(sql, params) wrapper around the better-sqlite3 prepared-statement API, so
  route files don't each write raw better-sqlite3 boilerplate.
- It sets PRAGMA foreign_keys = ON on the connection (SQLite has foreign keys off
  by default, which would silently let broken references through).
- Add a comment at the top of the file explaining that this file is the single
  place other files import the database from — no other file should open its own
  connection to quiz.sqlite.

Do not touch schema.sql. Do not create route files yet.
```
**Verify:** `node -e "const {getGlobalSettings} = require('./server/src/db/db.js'); console.log(getGlobalSettings())"` prints `{ defaultTimeLimitSeconds: 30, defaultGapEnabled: 1, defaultGapSeconds: 10 }` (or similar, matching your column names).
```bash
git checkout -b phase1/1.2-db-wrapper
git add . && git commit -m "Phase 1.2: DB helper wrapper and global settings accessors"
git checkout main && git merge phase1/1.2-db-wrapper && git push origin main
```

### Task 1.3 — Admin auth middleware (PIN login, session token, rate limiting)
**Tool:** Antigravity (hard & important — security-critical; this is exactly the code the v2.1/v2.2 fixes depend on)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 11 (REST API)
and Section 15 (Security) completely first — pay close attention to the "Auth
required" column in Section 11's table and the v2.1/v2.2 revision notes at the top
of the document.

Create server/src/middleware/auth.js implementing:

1. An admin PIN, read from process.env.ADMIN_PIN (never hardcoded). Add a .env.example
   file at the repo root (not .env itself) with ADMIN_PIN=changeme as a placeholder,
   and confirm .env is already in .gitignore.
2. POST /api/admin/login handler logic (export it as a function; it'll be mounted in
   a routes file later): accepts { pin }, compares to process.env.ADMIN_PIN, and on
   success returns a random session token (crypto.randomUUID()) that's valid for the
   rest of the server process's lifetime, stored in an in-memory Set. On failure,
   returns 401.
3. Rate limiting on the login handler: max 5 attempts per 5 minutes per IP address, in
   memory (a Map of IP -> attempt timestamps is fine for this scale — no need for a
   library). Exceeding the limit returns 429.
4. An Express middleware function requireAdmin(req, res, next) that checks for a
   Bearer token in the Authorization header, verifies it's in the valid-tokens Set,
   and calls next() if valid or returns 401 if not. This is the middleware every
   admin-only route from Section 11's table will use.
5. A standalone exported function isValidAdminToken(token) that does the same
   valid-tokens-Set check as requireAdmin, but callable directly (not as Express
   middleware). requireAdmin should call this function internally rather than
   duplicating the check. This exists so the Socket.IO layer (Task 2.5) can verify
   an admin token at connection time using the exact same logic as the REST
   middleware, instead of re-implementing (and risking drifting out of sync with)
   the auth check.

Do not build any other routes yet. After writing the code, demonstrate it works by
starting a minimal temporary Express app inline (or a quick test script) that
mounts POST /api/admin/login and one dummy GET /api/test-protected route guarded by
requireAdmin, then curl it: first with a wrong PIN (expect 401), then the correct
PIN from .env (expect a token back), then hit /api/test-protected with that token
(expect 200) and without it (expect 401). Show me all four curl results.
```
**Verify:**
- `.env` is in `.gitignore`; `.env.example` (with a placeholder, not your real PIN) is committed.
- You set a real PIN in your own local `.env` and re-run the four curl checks above yourself — wrong PIN → 401, correct PIN → token, protected route with token → 200, without token → 401.
- Sending 6 rapid wrong-PIN attempts triggers a 429 on the 6th.
```bash
git checkout -b phase1/1.3-admin-auth
git add . && git commit -m "Phase 1.3: admin PIN auth middleware with rate limiting"
git checkout main && git merge phase1/1.3-admin-auth && git push origin main
```

### Task 1.4 — Rounds REST routes
**Tool:** OpenCode (default tier — standard CRUD against a fully-specified endpoint table; `rounds` carries no answer-secrecy or token data, so there's nothing sensitive to get subtly wrong here)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 11 first.
Using the db.js helpers from Task 1.2 and the requireAdmin middleware from Task
1.3, create server/src/routes/rounds.routes.js implementing exactly these
endpoints from Section 11's table (all require requireAdmin):

- GET /api/rounds — list all rounds with a count of their questions
- POST /api/rounds — create a round (body matches the Round shape in Section 9;
  generate the id server-side with crypto.randomUUID())
- PUT /api/rounds/:id — edit a round
- DELETE /api/rounds/:id — delete a round and cascade-delete its questions (wrap in
  a transaction), only after confirming the round exists (404 if not)
- GET /api/rounds/:id/questions — list questions in a round, including
  correctOptionKey (per Section 11, this is intentionally admin-only)

Validate answerMode is 'MCQ' or 'OPEN' on create/edit and return 400 with a clear
message if not. Export an Express Router. Do not mount it anywhere yet — that's a
later task.
```
**Verify:** Write a throwaway test file that mounts this router alone on a temp Express app, then `curl` through: create a round, list rounds (see it), edit it, get its (empty) question list, delete it, confirm it's gone. All without an admin token should return 401.
```bash
git checkout -b phase1/1.4-rounds-routes
git add . && git commit -m "Phase 1.4: rounds REST routes"
git checkout main && git merge phase1/1.4-rounds-routes && git push origin main
```

### Task 1.5 — Questions REST routes + media upload
**Tool:** OpenCode (default tier — the UUID-filename requirement from Section 15 is spelled out as an explicit, mechanical instruction in the prompt below, not something the agent has to infer; still, verify the filename check yourself extra carefully after this one, since it's the one place in this task a shortcut could slip past a quick review)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 11 and the
"Media not guessable ahead of reveal" bullet in Section 15 first.

Create server/src/routes/questions.routes.js implementing (all require
requireAdmin):

- POST /api/questions — create a question (multipart/form-data if media is
  attached, using multer). Body matches the Question shape in Section 9.
- PUT /api/questions/:id — edit a question
- DELETE /api/questions/:id — delete a question
- POST /api/questions/:id/media — upload/replace the image or video for a question

Critical requirement from Section 15: uploaded files must be saved under a random
UUID filename (e.g. crypto.randomUUID() + the original extension), never the
original filename or a sequential name, so a question's media can't be guessed or
enumerated before it's revealed. Save files to server/src/uploads/questions/.

Validate mediaType is 'none', 'image', or 'video'. If mediaType is 'image' or
'video', mediaUrl must be set after upload; if 'none', mediaUrl must be null.
Store the options array as JSON text in the DB (matching Task 1.1's schema) but
return it as a real JSON array in API responses, not a string.
```
**Verify:** Create a question with a small test image attached via `curl -F`, confirm the response includes a `mediaUrl` pointing at a random-looking filename (not `image1.jpg`), and that the file actually exists on disk at that path. Edit the question's text without touching media, confirm the media URL is unchanged. Delete it, confirm the DB row and (optionally) the uploaded file are gone.
```bash
git checkout -b phase1/1.5-questions-routes
git add . && git commit -m "Phase 1.5: questions REST routes with media upload"
git checkout main && git merge phase1/1.5-questions-routes && git push origin main
```

### Task 1.6 — Candidates REST routes (including the public-safe endpoint)
**Tool:** Codex CLI (escalation tier 1 — kept off OpenCode deliberately: this is the exact endpoint pair where the v2.1 fix lives, and the failure mode — `joinToken` quietly slipping into the "public" response — produces no error, no crash, nothing a quick test would catch by accident. The prompt below is deliberately explicit about the security requirement for exactly this reason.)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 11 very
carefully, especially the two rows for GET /api/candidates and
GET /api/candidates/public — note they return DIFFERENT field sets.

Create server/src/routes/candidates.routes.js implementing:

- GET /api/candidates (requireAdmin) — full candidate objects INCLUDING joinToken.
- GET /api/candidates/public (no auth — public) — ONLY these fields per candidate:
  id, name, logoUrl, score, isActive. joinToken must NEVER appear in this
  response. Write this as a completely separate response-shaping step (e.g. a
  toPublicCandidate() function), not a conditional inside the full serializer, so
  it's obvious by reading the code that joinToken can't leak through here.
- POST /api/candidates (requireAdmin) — create a candidate; generate id and
  joinToken server-side with crypto.randomUUID().
- PUT /api/candidates/:id (requireAdmin) — edit a candidate.
- DELETE /api/candidates/:id (requireAdmin) — soft-delete: set isActive = false,
  do not actually remove the row (Section 9 says isActive is a soft-remove flag to
  preserve score history).
- POST /api/candidates/:id/logo (requireAdmin) — upload a candidate logo, using
  the same random-UUID-filename approach as Task 1.5.

After writing this, re-read your own toPublicCandidate() function and confirm out
loud in your response that joinToken cannot appear in its output under any code
path.
```
**Verify:** Create a candidate, then call `GET /api/candidates/public` (no auth header at all) and confirm the JSON response has no `joinToken` key anywhere in it — literally `grep -i jointoken` the response body and confirm zero matches. Then call `GET /api/candidates` with a valid admin token and confirm `joinToken` IS present there.
```bash
git checkout -b phase1/1.6-candidates-routes
git add . && git commit -m "Phase 1.6: candidates REST routes with public-safe endpoint"
git checkout main && git merge phase1/1.6-candidates-routes && git push origin main
```

### Task 1.7 — Express bootstrap (`index.js`)
**Tool:** Codex CLI (escalation tier 1 — kept off OpenCode deliberately: this task wires together every route from Tasks 1.4–1.6, and mounting even one of them with the wrong auth requirement is silent — it won't error, it'll just be wrong until someone specifically checks that one route)
**Prompt:**
```
Read AGENTS.md first. Create server/src/index.js that:

- loads environment variables with dotenv
- creates an Express app
- mounts express.json() and cors() (allow all origins — this is a closed LAN, not
  public internet)
- serves server/src/uploads/ as static files at the /uploads URL path
- mounts the rounds, questions, and candidates routers from Tasks 1.4-1.6 under
  /api (e.g. app.use('/api/rounds', roundsRouter))
- adds the POST /api/admin/login route from Task 1.3
- adds a GET /api/scoreboard route (public, no auth) that returns candidates
  sorted by score descending — reuse the same public field shape as
  /api/candidates/public
- adds GET /api/export and POST /api/import (requireAdmin) that dump/restore the
  full rounds+questions+candidates data as one JSON document
- adds a simple GET /api/health route (public) returning { status: 'ok' }
- starts the server with app.listen(PORT, '0.0.0.0', ...) where PORT comes from
  process.env.PORT or defaults to 4000, and logs the LAN-reachable URL on startup

Double check every route from Section 11's table is mounted with the correct auth
requirement — cross-reference the table's "Auth required" column route by route
before finishing.
```
**Verify:**
- `npm run dev` inside `server/` starts and prints something like `Server running on http://0.0.0.0:4000`.
- `curl http://localhost:4000/api/health` returns `{"status":"ok"}`.
- Go through Section 11's table row by row and `curl` each endpoint once with and once without an admin token, confirming the auth behavior matches the table exactly. This is worth doing carefully — it's your last checkpoint before the security model is "live."
```bash
git checkout -b phase1/1.7-express-bootstrap
git add . && git commit -m "Phase 1.7: Express bootstrap wiring all Phase 1 routes"
git checkout main && git merge phase1/1.7-express-bootstrap && git push origin main
```

### Task 1.8 — Seed script + smoke test
**Tool:** OpenCode (bulk/easy — data entry and a repetitive test script)
**Prompt:**
```
Read AGENTS.md first. The server from Task 1.7 is running with a full REST API.

1. Create seed/import-icse-sample-banks.js: a Node script that, using plain HTTP
   calls (fetch or axios) against the running server's admin API, logs in with the
   admin PIN (read from process.env.ADMIN_PIN), then creates the 6 rounds and all
   30 questions from the ICSE "Std VIII-X Tough" question bank (General Knowledge,
   Current Affairs, Science & Technology, Audio-Visual, Rapid Fire, Visual Puzzle),
   using answerMode 'MCQ' for every round except Rapid Fire which is 'OPEN'. For
   MCQ rounds, invent 3 plausible wrong options alongside each real answer (mark
   the real one as correctOptionKey). Use the exact questions and answers listed in
   the ICSE_Quiz_Std8to10_Tough source content already summarized in
   docs/Quiz_System_Architecture_Document.md Section 1's project overview — ask me
   if you need the original question text again, don't invent quiz content.

2. Create seed/smoke-test.js: a script that hits every endpoint from Section 11's
   table once (after logging in as admin) and prints PASS/FAIL for each based on
   the expected status code from the table's Auth column, plus a final PASS/FAIL
   for GET /api/candidates/public confirming no joinToken field is present in the
   response.

Run both scripts against the local dev server and show me the full output.
```
**Verify:** `node seed/import-icse-sample-banks.js` completes with 6 rounds and 30 questions created (check via `GET /api/rounds` with an admin token). `node seed/smoke-test.js` prints PASS for every line, including the `joinToken` absence check.
```bash
git checkout -b phase1/1.8-seed-and-smoke-test
git add . && git commit -m "Phase 1.8: seed script and REST smoke test"
git checkout main && git merge phase1/1.8-seed-and-smoke-test && git push origin main
```

**Phase 1 exit check:** the server runs, every REST endpoint from Section 11 exists and enforces the exact auth rule the table specifies, real question-bank data is seeded, and a smoke test confirms the security model end to end. This matches the architecture doc's Phase 1 exit criteria.

---

## 6. PHASE 2 — GAME ENGINE & REAL-TIME LAYER

This is the highest-risk phase in the whole project — it's the state machine and Socket.IO layer from Sections 10 and 12. Most of it goes to Antigravity on purpose.

### Task 2.1 — GameState store + timing resolution helper
**Tool:** OpenCode (default tier — the resolution order is a small, pure function with three test cases spelled out for the agent to prove against; well-scoped enough for the free tier even though 2.2 depends on it)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 9 (the
"Resolution order for timing values" paragraph) first.

Create server/src/sockets/gameStateStore.js with:

- getGameState() / saveGameState(state) — read/write the single game_state row
  (from Task 1.1's schema) as a JS object, parsing the locks/judgements JSON text
  columns into real objects and back.
- resolveTimeLimitSeconds(question, round, globalSettings),
  resolveGapEnabled(question, round, globalSettings), and
  resolveGapSeconds(question, round, globalSettings) — each implementing the exact
  resolution order from Section 9: question-level override wins if not null, else
  the round-level value, else the global default.

Write a few inline test calls (not a full test framework, just console.log
assertions) proving: a question with timeLimitOverrideSeconds = 45 returns 45
regardless of the round's value; a question with it null falls back to the round's
timeLimitSeconds; a round with gapEnabled = false and no question override
resolves gapEnabled to false. Show me the output.
```
**Verify:** the three resolution-order test cases above all print the expected value, not just "no errors."
```bash
git checkout -b phase2/2.1-gamestate-store
git add . && git commit -m "Phase 2.1: game state store and timing resolution helpers"
git checkout main && git merge phase2/2.1-gamestate-store && git push origin main
```

### Task 2.2 — Core state machine (`gameEngine.js`)
**Tool:** Antigravity (hard & important — this IS the product; a bug here breaks the live event)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 10 (Game State
Machine) in full — read it twice. This task implements that diagram exactly, phase
by phase, with no shortcuts.

Create server/src/sockets/gameEngine.js implementing the full lifecycle from
Section 10 as a set of exported functions operating on the GameState from Task
2.1's store:

- startQuiz() — sets phase to QUESTION_SHOWN on Round 1, Question 1, sets
  timerStartedAt = Date.now(), resolves timeLimitSeconds/gapEnabled/gapSeconds
  using Task 2.1's helpers, and initializes an empty lock entry for every active
  candidate.
- nextQuestion() / previousQuestion() — advances/rewinds currentRoundId/
  currentQuestionId, resetting locks/judgements/winnerCandidateId/resultsRevealed
  for the newly-entered question exactly like startQuiz() does.
- lockAnswer(candidateId, optionKey) — only accepted while phase is
  QUESTION_SHOWN and this candidate hasn't already locked; records
  { optionKey, elapsedMs: Date.now() - timerStartedAt, answered: true } into
  locks[candidateId]. Reject (return an error, don't throw) if the phase is wrong
  or the candidate already locked.
- handleTimeUp() — marks every candidate still unlocked as
  { answered: false }, moves phase to TIME_UP, then immediately to JUDGING if the
  current round's answerMode is 'OPEN', or auto-resolves correctness for 'MCQ' by
  comparing each lock's optionKey to the question's correctOptionKey and moves
  straight past judging.
- submitJudgement(candidateId, isCorrect) — only valid during JUDGING on an OPEN
  round; records it in judgements[candidateId].
- allJudged() — helper returning true once every answered candidate in an OPEN
  round has a non-null judgement (used to know when Admin can proceed).
- computeWinner() — implements winner-takes-all exactly per Section 10: among
  candidates who answered AND are correct (MCQ: optionKey === correctOptionKey;
  OPEN: judgements[candidateId] === true), pick the one with the lowest elapsedMs.
  If none are correct, winnerCandidateId stays null.
- enterGap() / exitGap() — moves phase to GAP if resolved gapEnabled is true for
  this question, otherwise skips straight to RESULTS. Do not implement the actual
  wait — that's the caller's job (a setTimeout in the sockets layer, Task 2.5) —
  this function only manages the phase field and the resolved gapSeconds value.
- revealResults() — sets phase to RESULTS, resultsRevealed = true, and calls
  computeWinner() to set winnerCandidateId. Does NOT yet apply scoring — that's
  Task 2.4.
- endTimerNow() — the manual admin override from Section 10: behaves exactly like
  the timer reaching zero (calls the same logic as handleTimeUp()), for
  exceptional use only.

Every function must validate the current phase before acting and return a clear
error (not throw, not silently no-op) if called at the wrong time — this is what
Section 12 calls "server-side validation of event legality against current
phase." List, in your response, every phase-transition guard you added.
```
**Verify:**
- Write a scratch Node script that calls these functions directly (no sockets yet) simulating: `startQuiz()` → 2 candidates `lockAnswer()` with different `optionKey`s → `handleTimeUp()` → `computeWinner()` picks the faster correct one, not the faster overall one, if the faster one was wrong.
- Confirm calling `lockAnswer()` twice for the same candidate on the same question is rejected the second time.
- Confirm calling `lockAnswer()` after `handleTimeUp()` is rejected.
```bash
git checkout -b phase2/2.2-game-engine
git add . && git commit -m "Phase 2.2: core game state machine"
git checkout main && git merge phase2/2.2-game-engine && git push origin main
```

### Task 2.3 — Server-authoritative timer & lock-in timestamping (hardening pass)
**Tool:** Antigravity (hard & important — this is the fairness guarantee the whole system is built on)
**Prompt:**
```
Read AGENTS.md and Section 15's "Server-authoritative timestamps for ranking"
bullet first. This is a review-and-harden pass on Task 2.2's gameEngine.js, not a
rewrite.

Audit lockAnswer(candidateId, optionKey) in gameEngine.js and confirm:
- elapsedMs is computed ONLY from the server's own Date.now() minus the server's
  own timerStartedAt — there must be no code path anywhere that accepts a
  timestamp or elapsed value from the client and trusts it.
- If any client-supplied timing data is currently accepted anywhere in the
  codebase, remove it and replace it with the server-computed value.

Then add a real timer to the engine: a setTimeout, started inside startQuiz() and
nextQuestion() (and cleared/restarted correctly on previousQuestion()), that calls
handleTimeUp() automatically when the resolved timeLimitSeconds elapses — using
the actual resolved value from Task 2.1, not a hardcoded number. Make sure calling
endTimerNow() clears this pending setTimeout so handleTimeUp() never fires twice
for the same question.

Report back explicitly: "confirmed, no client-supplied timestamp is trusted
anywhere" or list what you found and fixed.
```
**Verify:** Start a question, wait for the real timer to elapse without manually calling anything, and confirm `handleTimeUp()` fires on its own. Then start another question and call `endTimerNow()` early, and confirm the original setTimeout does NOT also fire later (no double-handling).
```bash
git checkout -b phase2/2.3-timer-hardening
git add . && git commit -m "Phase 2.3: real timer + server-authoritative timestamp hardening"
git checkout main && git merge phase2/2.3-timer-hardening && git push origin main
```

### Task 2.4 — Winner-takes-all scoring
**Tool:** Antigravity (hard & important — money-line logic; getting this wrong means wrong scores on stage)
**Prompt:**
```
Read AGENTS.md and Section 10's RESULTS description and Section 9's ScoreLog shape
first.

Extend revealResults() in gameEngine.js (edit, don't rewrite the file) so that,
after computeWinner() sets winnerCandidateId:

- if winnerCandidateId is not null, award that candidate's score += the resolved
  pointsPerQuestion (question's pointsOverride if set, else the round's
  pointsPerQuestion), and insert a score_log row with reason
  'timed_ranking_win'.
- every other candidate gets 0 change for this question (no score_log row needed
  for non-winners — only log actual point changes).
- also add a separate exported function adjustScoreManually(candidateId, delta,
  reason) for the general admin override from FR18, which updates the candidate's
  score and inserts a score_log row with reason 'manual_adjustment', usable at any
  time regardless of game phase.

Show me, using the same scratch script style as Task 2.2, a full run: start a
question worth 10 points, 2 candidates answer, one correct-and-faster, one
correct-and-slower, reveal results, and confirm only the faster correct
candidate's score increased by exactly 10.
```
**Verify:** re-run the Task 2.2 scratch scenario through to `revealResults()` and confirm the winner's `score` increases by exactly the round's `pointsPerQuestion` (or the question's override, if you test that case), and no other candidate's score changes. Confirm a `score_log` row exists with `reason = 'timed_ranking_win'`.
```bash
git checkout -b phase2/2.4-scoring
git add . && git commit -m "Phase 2.4: winner-takes-all scoring and manual score adjustment"
git checkout main && git merge phase2/2.4-scoring && git push origin main
```

### Task 2.5 — Socket.IO rooms and event wiring (with the v2.2 admin/public split)
**Tool:** Antigravity (hard & important — this is the exact code the v2.2 security fix lives in; must not regress it)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 12 (Real-Time
Events) in full, including both v2.2 revision notes at the top of the document.
This is the most security-sensitive task in the whole project — read the event
table twice before writing code.

Create server/src/sockets/index.js that:

1. Sets up Socket.IO with three room types, each with its own admission rule — a
   client's requested role must NEVER be trusted on its own; it must be proven:
   - 'candidate:<candidateId>' — the client sends its candidateId + joinToken as
     connection query params; validate the token against the DB before allowing
     the join; reject the connection if it doesn't match an active candidate.
   - 'admin' — the client sends its admin session token (the same token issued by
     POST /api/admin/login in Task 1.3) via the connection handshake, e.g.
     socket.handshake.auth.token; validate it with Task 1.3's isValidAdminToken()
     — the SAME function the REST requireAdmin middleware uses, not a
     reimplementation. If the token is missing or invalid, do NOT add the socket
     to the 'admin' room (either refuse the connection outright, or connect it
     with no privileged room membership — either is fine, but it must never end
     up in 'admin' without a valid token). A client sending role: 'admin' with no
     token, or a stale/garbage token, must be treated as unauthenticated.
   - 'display' — no token required; this room only ever receives already-redacted,
     public-safe data (game:state:public, candidates:public-updated, etc.), so
     open access to it carries no security risk.

2. Implements every server-to-client event from Section 12's table with the EXACT
   room targeting specified — this is the part that must not regress the v2.2
   fix:
   - game:state (unredacted, including correctOptionKey) -> 'admin' room ONLY.
   - game:state:public (redacted, no correctOptionKey, no lock timestamps until
     RESULTS) -> 'display' room and every 'candidate:*' room.
   - candidates:updated (full objects including joinToken) -> 'admin' room ONLY.
   - candidates:public-updated (no joinToken) -> 'display' room.
   - timer:tick, candidate:locked, time:up, judging:started, gap:started,
     gap:tick, results:revealed, scoreboard:update — exactly as the "Who
     receives" column specifies for each, no more and no less.

3. Implements every client-to-server event from Section 12's second table
   (admin:nextQuestion, admin:prevQuestion, admin:endTimerNow,
   admin:submitJudgement, admin:advanceFromGap, admin:adjustScore,
   candidate:lockAnswer), calling the matching gameEngine.js function from Tasks
   2.2-2.4, and rejecting (emitting an error back to the sender, not crashing)
   any event sent from the wrong room — e.g. a candidate socket sending
   admin:nextQuestion must be rejected, not silently ignored.

4. Broadcasts the redacted vs. unredacted state pair (game:state +
   game:state:public) after every single mutation — nextQuestion,
   lockAnswer, handleTimeUp, submitJudgement, revealResults, adjustScore —
   so every connected screen is always in sync within one broadcast.

After writing this, write out — as a checklist in your response, one line per
event — confirming which room each event goes to, so I can diff it against
Section 12's table myself.
```
**Verify:**
- Connect four separate simple Socket.IO test clients (a plain Node script using the `socket.io-client` package is enough) impersonating: an admin (with a valid admin token from Task 1.3's login endpoint), a display, a candidate with a valid `joinToken`, and a fifth "attacker" client that sends `role: 'admin'` in its handshake but NO valid admin token (or a made-up one).
- Confirm the real admin client receives `game:state` with `correctOptionKey` present; confirm the display and candidate clients receive `game:state:public` with `correctOptionKey` absent.
- Confirm the attacker client — despite claiming `role: 'admin'` — never receives `game:state` or `candidates:updated`, and any `admin:*` event it sends (e.g. `admin:nextQuestion`) is rejected, not actioned. This is the check that proves the room-join loophole is closed.
- Confirm a candidate client's socket sending `admin:nextQuestion` gets rejected, not actioned.
- Confirm a candidate connecting with a wrong/missing `joinToken` is refused the room join.
- Diff the agent's own checklist against Section 12's table — they must match exactly.
```bash
git checkout -b phase2/2.5-socket-wiring
git add . && git commit -m "Phase 2.5: Socket.IO rooms and event wiring with admin/public split"
git checkout main && git merge phase2/2.5-socket-wiring && git push origin main
```

### Task 2.6 — Phase-validation guard (cross-cutting safety net)
**Tool:** Codex CLI (escalation tier 1 — kept off OpenCode deliberately: this task edits every mutating function in an already-working `gameEngine.js` to swap in a shared guard, and a careless refactor here could silently drop a check Task 2.2 already relies on)
**Prompt:**
```
Read AGENTS.md first. Tasks 2.2 and 2.5 already reject some out-of-phase actions
individually. This task adds one central, reusable guard so nothing was missed.

In gameEngine.js, add an exported function assertPhase(currentPhase,
allowedPhases: string[]) that throws a typed error (e.g. new
PhaseError(currentPhase, allowedPhases)) if the current GameState.phase isn't in
the allowed list. Go through every mutating function in gameEngine.js
(lockAnswer, submitJudgement, nextQuestion, previousQuestion, endTimerNow,
revealResults, etc.) and make sure each one calls assertPhase() at the very top
with the correct allowed-phases list per Section 10's diagram, replacing any
ad-hoc phase checks you find with this shared helper. In sockets/index.js, catch
PhaseError specifically and emit a clean rejection event back to the sender
instead of letting it crash the connection.
```
**Verify:** Deliberately send events out of order through the test clients from Task 2.5 (e.g. `candidate:lockAnswer` while phase is `RESULTS`, `admin:submitJudgement` during an MCQ round) and confirm each is cleanly rejected with no server crash and no corrupted GameState.
```bash
git checkout -b phase2/2.6-phase-guard
git add . && git commit -m "Phase 2.6: centralized phase-validation guard"
git checkout main && git merge phase2/2.6-phase-guard && git push origin main
```

### Task 2.7 — 4-candidate integration test script
**Tool:** OpenCode (bulk/easy — the event contract is now fully specified, so this is "follow the spec and simulate it")
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 12 first.

Create server/test/integration-4-candidates.js: a Node script using
socket.io-client that connects 1 admin client, 1 display client, and 4 candidate
clients (using real joinTokens fetched from the seeded data via the admin API)
against the running dev server, then:

1. Runs through one full MCQ question: admin triggers startQuiz(), the 4
   candidates lock in answers at staggered times (use setTimeout with different
   delays) with a mix of correct and incorrect options, including one candidate
   that never answers at all, then waits for the real timer to expire.
2. Runs through one full OPEN question (Rapid Fire): same staggered lock-ins
   (just pressing the single lock button, no options), admin then submits
   judgements in fastest-first order after time-up.
3. After each question, prints: final rankings, who won, and the resulting
   scoreboard — and asserts (throws a clear error if wrong) that the winner is
   the fastest CORRECT/judged-correct candidate, not just the fastest overall.

Run it against the seeded dev server and paste me the full console output.
```
**Verify:** the script runs to completion with no unhandled errors, and its own assertions about "fastest correct wins" pass for both the MCQ and OPEN question it simulates. The no-answer candidate is correctly excluded from winning.
```bash
git checkout -b phase2/2.7-integration-test
git add . && git commit -m "Phase 2.7: 4-candidate integration test script"
git checkout main && git merge phase2/2.7-integration-test && git push origin main
```

**Phase 2 exit check:** the full state machine runs end to end for both MCQ and OPEN questions, timing is server-authoritative, winner-takes-all scoring is correct, and — critically — the admin-only vs. public-safe event split from v2.2 is verified working over real Socket.IO connections, not just read in the code, AND a socket that merely claims to be admin without a valid session token cannot get into the 'admin' room or receive any admin-only data (the v1.1 build-guide fix, Task 2.5).

---

## 7. PHASE 3 — ADMIN PANEL UI

Builds the `/admin` screens from Section 13, wired to Phase 1's REST API and Phase 2's `admin`-room socket events.

### Task 3.1 — React app scaffold + routing
**Tool:** OpenCode (bulk/easy — standard routing scaffold)
**Prompt:**
```
Read AGENTS.md first. In client/src/admin/, set up React Router with a layout
component (left nav sidebar) and four empty placeholder pages matching Section
13's Admin Panel tabs: Rounds & Questions, Candidates, Live Control,
Settings/Backup. Wire the app's root route so visiting /admin shows this layout
with Live Control as the default tab. Install socket.io-client in client/ if not
already present. Create client/src/shared/socket.js exporting a factory function
(e.g. createSocket({ auth })) — not a single pre-built instance — that opens a
Socket.IO connection to the server (read the server URL from a Vite env variable,
default to the current page's host on port 4000) and forwards an optional `auth`
object into the underlying socket.io-client connection options unchanged. This is
needed because Admin (Task 3.2) must attach its session token at connect time to
be admitted to the 'admin' room per Task 2.5, while Display and Candidate connect
differently — a single shared instance with no way to pass auth can't support
that. Do not build any real screen content yet — just the shell, nav, and empty
pages.
```
**Verify:** `npm run dev` in `client/` and visiting `/admin` shows a sidebar with all four tab links, and clicking each one navigates without a full page reload (SPA routing works). No console errors.
```bash
git checkout -b phase3/3.1-admin-scaffold
git add . && git commit -m "Phase 3.1: admin panel routing scaffold"
git checkout main && git merge phase3/3.1-admin-scaffold && git push origin main
```

### Task 3.2 — Admin PIN login screen
**Tool:** Codex CLI (escalation tier 1 — kept off OpenCode deliberately: since the v1.1 fix, this screen is also responsible for opening the admin socket connection with the session token attached, and for correctly treating a rejected/expired socket auth the same as a REST 401. Getting that fallback wrong doesn't crash anything visibly — it just quietly leaves someone looking at a broken Live Control screen with no explanation.)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 11's
POST /api/admin/login row and Section 15's rate-limiting note first. Use
docs/stitch-ui/quiz_master_control_login/ as the visual reference for layout and
styling.

Build a login screen in client/src/admin/ that's shown instead of the main layout
until the admin is authenticated: a single PIN input + submit button, calling
POST /api/admin/login, storing the returned token in memory (a React context or
simple module-level variable — not localStorage, since this is a shared laptop
used once per event and we don't want stale tokens persisting across browser
sessions), and attaching it as a Bearer token on every subsequent admin API call
via a shared fetch wrapper in client/src/shared/api.js. On successful login, also
open the admin Socket.IO connection using Task 3.1's createSocket({ auth: { token
} }) — passing this same session token — so the socket is admitted to the 'admin'
room per Task 2.5; do not attempt to use the admin socket before login succeeds.
If the socket connection is ever rejected or errors out due to an invalid/expired
token, treat it the same as a REST 401: clear the in-memory token and return to
the login screen. Show a clear error message on a wrong PIN, and a distinct
message if rate-limited (429).
```
**Verify:** entering the wrong PIN shows an error and does not proceed; entering the correct PIN (from your `.env`) shows the main Admin Panel layout; refreshing the page requires re-entering the PIN (confirms it's not persisted to localStorage); entering 6 wrong PINs quickly shows the rate-limit message.
```bash
git checkout -b phase3/3.2-admin-login
git add . && git commit -m "Phase 3.2: admin PIN login screen"
git checkout main && git merge phase3/3.2-admin-login && git push origin main
```

### Task 3.3 — Rounds & Questions management screens
**Tool:** OpenCode (default tier — a detailed form spec plus a Stitch mockup for layout; pure UI construction with no security decision embedded in it)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 13's
"Rounds & Questions tab" description and Section 9's Round/Question shapes first.
Use docs/stitch-ui/rounds_questions_management/ as the visual reference.

Build the Rounds & Questions tab: a table of rounds (name, answerMode, question
count) with add/edit/delete, expanding a round to show its question list. The
question add/edit form must include: text, media upload (image or video, using
POST /api/questions/:id/media), an answerMode-aware options section (show 4 option
inputs + a correct-answer radio selector only when the round's answerMode is
'MCQ'; hide entirely for 'OPEN'), points (with a "use round default" checkbox that
sends pointsOverride: null when checked), time limit (same override pattern using
timeLimitOverrideSeconds), and gap on/off + seconds (same override pattern using
gapEnabledOverride/gapSecondsOverride). Wire everything to the REST endpoints from
Section 11. Use the admin token from Task 3.2 on every call.
```
**Verify:** create a new round with `answerMode: MCQ`, add a question with 4 options and a correct answer, confirm it appears via `GET /api/rounds/:id/questions`. Create an `OPEN` round and confirm its question form has no options fields. Toggle "use round default" on the time limit and confirm the saved question has `timeLimitOverrideSeconds: null`.
```bash
git checkout -b phase3/3.3-rounds-questions-ui
git add . && git commit -m "Phase 3.3: rounds and questions management screens"
git checkout main && git merge phase3/3.3-rounds-questions-ui && git push origin main
```

### Task 3.4 — Candidates management screen
**Tool:** OpenCode (default tier — UI CRUD plus a mockup; the one real gotcha, using `candidates:updated` and not `candidates:public-updated`, is already spelled out explicitly in the prompt below, which is exactly the kind of guardrail that makes a clearly-written prompt safe to hand to the free tier)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 13's
"Candidates tab" description first. Use docs/stitch-ui/candidate_roster_management/
as the visual reference.

Build the Candidates tab: a table of candidates (logo thumbnail, name, active
status) with add (name + logo upload), edit, and remove (soft-delete) actions,
wired to Section 11's candidate endpoints using GET /api/candidates (the
admin-only, full-data endpoint — this screen is allowed to see joinToken, unlike
the Display screen in Phase 4). For each candidate, show their join link
(http://<current-host>:<port>/play/:candidateId?token=:joinToken) as both plain
text (for copy-paste) and a QR code (use the qrcode npm package per Section 8 of
the architecture doc). Subscribe to the candidates:updated socket event (not
candidates:public-updated — confirm you're using the admin-only one) to keep this
table live if candidates are added from elsewhere.
```
**Verify:** add a candidate, confirm it appears with a working QR code that, when scanned or the link opened, points at the right `/play/:id?token=...` URL. Remove a candidate and confirm it disappears from the active list (but check via `GET /api/candidates` that the row still exists with `isActive: false`, not deleted).
```bash
git checkout -b phase3/3.4-candidates-ui
git add . && git commit -m "Phase 3.4: candidates management screen with QR join links"
git checkout main && git merge phase3/3.4-candidates-ui && git push origin main
```

### Task 3.5 — Live Control screen
**Tool:** Antigravity (hard & important — this is the operational cockpit wired straight into Phase 2's critical engine; a UI bug here means a broken show)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 13's "Live
Control tab" description and Section 12's full event table in detail — this
screen is the primary consumer of nearly every admin-room event.

Three Stitch mockups cover this screen's phases — use them as the visual
reference for the matching state: docs/stitch-ui/live_control_center_question_live_phase/
for the default/question-live layout below, docs/stitch-ui/live_control_center_judging_phase/
for the Judging panel, and docs/stitch-ui/live_control_center_results_phase/ for
the results state.

Build the Live Control tab:
- Subscribe to game:state (the ADMIN, unredacted variant — confirm you are not
  accidentally using game:state:public here) to show the current question
  (including correctOptionKey, since Admin is allowed to see it), round name, and
  phase.
- Subscribe to candidate:locked to show a live "X/4 locked in" counter.
- Show Next / Previous buttons that emit admin:nextQuestion / admin:prevQuestion.
- Show a live countdown using timer:tick, plus an "End Timer Now" button (visibly
  secondary/de-emphasized styling, with a confirmation step before it fires) that
  emits admin:endTimerNow.
- When phase becomes JUDGING (an OPEN round), show a Judging panel: candidates
  listed fastest-first (from the judging:started payload) each with
  Correct/Incorrect buttons that emit admin:submitJudgement.
- When phase becomes GAP, show the gap countdown (gap:tick) with an
  "Advance Now" button emitting admin:advanceFromGap.
- When phase becomes RESULTS, show the results:revealed payload: full ranking,
  correct answer, and the winner clearly highlighted.
- At all times, show manual score +/- buttons per candidate (emitting
  admin:adjustScore) and the current scoreboard (scoreboard:update).
- Add a confirmation dialog before any destructive action (End Timer Now, jumping
  rounds).

This is the screen the Quiz Master will stare at all evening — prioritize clarity
over cleverness.
```
**Verify:** run through one full MCQ question and one full OPEN question live using this screen only (no direct socket testing) against the seeded data — confirm Next/Previous, the timer, the lock counter, judging (for OPEN), the gap countdown, results reveal, and manual score adjustment all work as a human operator, matching the architecture doc's Phase 3 exit criteria: "a non-technical user can run an entire quiz end-to-end using only the Admin Panel UI."
```bash
git checkout -b phase3/3.5-live-control
git add . && git commit -m "Phase 3.5: Live Control screen"
git checkout main && git merge phase3/3.5-live-control && git push origin main
```

### Task 3.6 — Settings/Backup tab
**Tool:** OpenCode (bulk/easy)
**Prompt:**
```
Read AGENTS.md first. Use docs/stitch-ui/admin_settings_backup/ as the visual
reference. Build the Settings/Backup tab: a small form for
GlobalSettings (defaultTimeLimitSeconds, defaultGapEnabled, defaultGapSeconds)
wired to a GET/PUT on those values (add these two small endpoints to
server/src/routes/admin.routes.js if they don't already exist, requireAdmin-
protected, matching the GlobalSettings shape in Section 9), plus two buttons:
"Export Backup" (calls GET /api/export and downloads the JSON) and "Import
Backup" (file picker, calls POST /api/import).
```
**Verify:** change the global default time limit, save, refresh the page, and confirm it persisted. Export a backup, confirm a JSON file downloads with your rounds/questions/candidates in it. Import it back into a fresh/empty database and confirm the data is restored.
```bash
git checkout -b phase3/3.6-settings-backup
git add . && git commit -m "Phase 3.6: settings and backup tab"
git checkout main && git merge phase3/3.6-settings-backup && git push origin main
```

### Task 3.7 — Admin Panel visual polish
**Tool:** OpenCode (bulk/easy — pure styling, no logic changes)
**Prompt:**
```
Read AGENTS.md first. Cross-check each tab against the Stitch mockup used to
build it (Section 0.1's table — quiz_master_control_login, rounds_questions_management,
candidate_roster_management, the three live_control_center_* folders, and
admin_settings_backup) and tighten anywhere it drifted. Do a visual-only pass
over the entire Admin Panel built in Tasks 3.1-3.6: consistent Tailwind spacing, button styles, form field styles, a
clear visual distinction between destructive actions (red-ish) and safe actions,
and a persistent header showing which screen is being edited. Do not change any
logic, API calls, or component structure — styling only.
```
**Verify:** click through every tab and confirm nothing behaves differently than before this task — only appearance changed. No new console errors.
```bash
git checkout -b phase3/3.7-admin-polish
git add . && git commit -m "Phase 3.7: admin panel visual polish"
git checkout main && git merge phase3/3.7-admin-polish && git push origin main
```

**Phase 3 exit check:** matches the architecture doc exactly — a non-technical user can run an entire quiz end-to-end using only the Admin Panel UI, from logging in, to managing questions and candidates, to running Live Control through a full question cycle.

---

## 8. PHASE 4 — MAIN DISPLAY UI

Builds the `/display` screen from Section 13. This screen only ever renders server-computed state — it never mutates anything — so it's lower-risk than Phases 2 and 3, and no task here needs Antigravity.

### Task 4.1 — React app scaffold for `/display`
**Tool:** OpenCode (bulk/easy)
**Prompt:**
```
Read AGENTS.md first. For the overall look and feel, use docs/stitch-ui/cinematic_grandeur/
and docs/stitch-ui/shader_1/ + docs/stitch-ui/shader_2/ as the mood-board
reference — these aren't a single screen, they set the ambient background/
shader style the rest of Display should share; the per-state mockups referenced
in later tasks take priority for actual layout. In client/src/display/, set up a single full-screen route at
/display with a dark, high-contrast base theme (Section 13: "Full-screen, dark
high-contrast theme suited for projection"). Set up an empty state container ready
to switch between idle / question / gap / results / scoreboard views based on a
phase value (the actual socket wiring is the next task — just build the shell and
a hardcoded phase switcher you can manually flip for now to preview each view).
```
**Verify:** visiting `/display` shows a full-screen dark layout with no browser chrome distractions (consider testing with browser fullscreen mode, F11). Manually flipping the hardcoded phase value switches between placeholder view containers.
```bash
git checkout -b phase4/4.1-display-scaffold
git add . && git commit -m "Phase 4.1: main display scaffold"
git checkout main && git merge phase4/4.1-display-scaffold && git push origin main
```

### Task 4.2 — Idle/branding screen
**Tool:** OpenCode (bulk/easy)
**Prompt:**
```
Read AGENTS.md first. Use docs/stitch-ui/grand_opening_idle_screen/ as the
visual reference. Build the idle-state view for /display (Section 13: school/
event branding + "Get Ready."). Use placeholder text for the school name (make it
a simple hardcoded constant near the top of the file that's easy to change later)
and a clean, large, centered layout suitable for an empty auditorium screen before
the event starts.
```
**Verify:** the idle view renders correctly full-screen, text is legible from a distance (test by shrinking the browser preview or standing back from your monitor).
```bash
git checkout -b phase4/4.2-idle-screen
git add . && git commit -m "Phase 4.2: display idle/branding screen"
git checkout main && git merge phase4/4.2-idle-screen && git push origin main
```

### Task 4.3 — Socket client wiring (public events only)
**Tool:** Codex CLI (escalation tier 1 — kept off OpenCode deliberately: `game:state` and `game:state:public` differ by seven characters and one is a straight security leak if used on this screen; this is exactly the look-alike-name trap a fast/free model is most likely to fall into)
**Prompt:**
```
Read AGENTS.md and docs/Quiz_System_Architecture_Document.md Section 12 in full
before writing any socket code. This screen must ONLY subscribe to the
display-safe events — never the admin-only ones.

In client/src/display/, create a hook or context that connects to the shared
socket (client/src/shared/socket.js) and subscribes ONLY to: game:state:public
(NOT game:state — confirm this explicitly), timer:tick, candidate:locked,
time:up, gap:started, gap:tick, results:revealed, scoreboard:update, and
candidates:public-updated (NOT candidates:updated). Expose the current phase and
payload data to the rest of the display components built in this phase. Do not
subscribe to or reference game:state, candidates:updated, or judging:started
anywhere in this client/src/display/ folder — those are admin-only and this
screen has no business receiving them.
```
**Verify:** open your browser's dev tools Network tab (WS filter) while `/display` is open, trigger a question via the Admin's Live Control screen, and confirm the incoming Socket.IO frames on this connection are named `game:state:public` / `candidates:public-updated`, never `game:state` / `candidates:updated`. Confirm none of the frames contain a `correctOptionKey` or `joinToken` field before results are revealed.
```bash
git checkout -b phase4/4.3-display-socket-wiring
git add . && git commit -m "Phase 4.3: display socket wiring using public-safe events only"
git checkout main && git merge phase4/4.3-display-socket-wiring && git push origin main
```

### Task 4.4 — Question screen
**Tool:** OpenCode (default tier — pure rendering of data Task 4.3 already validated as public-safe; two Stitch mockups cover both round-type layouts, so there's little left to guess at)
**Prompt:**
```
Read AGENTS.md and Section 13's "Main Display" question-state description first.
Use docs/stitch-ui/projector_view_live_question_pre_reveal/ as the visual
reference for the MCQ layout, and docs/stitch-ui/projector_view_rapid_fire_round/
for how this same view should look when round.answerMode is 'OPEN' (no options
grid to show, since Rapid Fire has none).
Build the question-state view: round name + question number, large question text,
image or video if mediaType/mediaUrl are set (video should autoplay muted-off
since Display is the only place audio should come from, per Section 17 Phase 7's
media note), a prominent countdown using timer:tick, and a "locked-in" counter
using candidate:locked's running count — no candidate names, no answer content,
no timestamps, matching Section 13 exactly. Also build the "time's up" sub-state:
when time:up fires, visibly mark which candidates (by count only, not identity —
Display doesn't know identities without candidates:public-updated correlation,
which is fine to add) had no answer.
```
**Verify:** trigger a question from Admin, confirm text/media/timer render correctly on Display, confirm the lock counter increments as candidates answer (test with the Task 2.7 integration script or manual browser tabs), and confirm no answer content or correctness is visible before reveal.
```bash
git checkout -b phase4/4.4-question-screen
git add . && git commit -m "Phase 4.4: display question screen"
git checkout main && git merge phase4/4.4-question-screen && git push origin main
```

### Task 4.4B — Gap/suspense screen
**Tool:** OpenCode (bulk/easy — a single self-contained visual state, no new socket logic since 4.3 already subscribes to gap:started/gap:tick)
**Prompt:**
```
Read AGENTS.md and Section 10's GAP phase description ("Calculating results…"
suspense screen, shown only when the resolved gapEnabled is true) first. Use
docs/stitch-ui/projector_view_suspense_interlude/ as the visual reference. Build
the Gap-state view for /display: a full-screen "Calculating results…" suspense
animation driven by gap:started (initial gapSeconds) and gap:tick (remaining
seconds), replacing the question view the moment the phase becomes GAP and
handing off to the Task 4.5 results view the moment results:revealed fires. If
gapEnabled resolves to false for a question, this state is skipped entirely by
the server (per Section 10) — this screen never needs to guess at that, it
simply never receives a gap:started event for that question.
```
**Verify:** run a question with the round's gapEnabled set to true and confirm the suspense screen appears for the configured duration between time's-up and results. Run a question with gapEnabled set to false and confirm Display goes straight from time's-up to results with no suspense screen at all.
```bash
git checkout -b phase4/4.4B-gap-suspense-screen
git add . && git commit -m "Phase 4.4B: display Gap/suspense screen"
git checkout main && git merge phase4/4.4B-gap-suspense-screen && git push origin main
```

### Task 4.5 — Results/ranking screen
**Tool:** OpenCode (default tier — pure rendering of the `results:revealed` payload against a Stitch mockup; no data-access decision to make, everything it needs is already redacted correctly upstream)
**Prompt:**
```
Read AGENTS.md and Section 13's "Results state" description and Section 12's
results:revealed payload shape first. Use docs/stitch-ui/projector_view_results_winner_reveal/
as the visual reference. Build the results view: correct answer
highlighted, a ranked list of all candidates (name + logo from
candidates:public-updated, joined with their elapsedMs/status from
results:revealed's rankings array), formatted response times (e.g. "3.42s", or
"No Answer" for status: 'no_answer'), and the winner clearly and visually
distinguished from the rest (not just a small badge — this is the dramatic
moment of the round).
```
**Verify:** run a full question through to reveal and confirm the results screen shows accurate rankings matching what Task 2.7's integration test asserted, with the correct candidate visually called out as winner, and formatted times that make sense (fastest correct at the top or clearly marked, no-answer candidates clearly marked as such).
```bash
git checkout -b phase4/4.5-results-screen
git add . && git commit -m "Phase 4.5: display results and ranking screen"
git checkout main && git merge phase4/4.5-results-screen && git push origin main
```

### Task 4.6 — Scoreboard view
**Tool:** OpenCode (bulk/easy)
**Prompt:**
```
Read AGENTS.md and Section 13's "Scoreboard view" description first. Use
docs/stitch-ui/projector_view_final_leaderboard_champion_reveal/ as the visual
reference, especially for the QUIZ_ENDED/champion-reveal state. Build a
scoreboard view (candidate logo, name, score, ranked highest-first) using
scoreboard:update, with a simple animation when a score changes (e.g. a brief
highlight flash on the row that just updated). Make it usable both as a standalone
view (shown between rounds, on demand) and as the closing view at QUIZ_ENDED with
the top candidate visually emphasized as the winner.
```
**Verify:** trigger a score change from the Admin's manual +/- buttons and confirm the scoreboard updates live with the animation. Manually simulate reaching the last question (or just check the QUIZ_ENDED rendering directly) and confirm the winner is visually emphasized.
```bash
git checkout -b phase4/4.6-scoreboard
git add . && git commit -m "Phase 4.6: display scoreboard view"
git checkout main && git merge phase4/4.6-scoreboard && git push origin main
```

### Task 4.7 — Projector visual polish
**Tool:** OpenCode (bulk/easy — pure styling)
**Prompt:**
```
Read AGENTS.md first. Re-check every view against its Stitch mockup from
Section 0.1's table, and use docs/stitch-ui/cinematic_grandeur/,
docs/stitch-ui/shader_1/, and docs/stitch-ui/shader_2/ for the ambient
background treatment that should tie idle/question/gap/results/scoreboard
together into one cohesive visual identity. Do a visual-only pass
across every Display view built in
this phase: large, high-contrast typography readable from the back of a school
hall, generous spacing, and a consistent color theme across idle/question/gap/
results/scoreboard states. Reference the frontend-design conventions if
available. Do not change any logic or socket wiring — styling only.
```
**Verify:** preview each view (using the same phase-switcher approach from Task 4.1, or by actually running through a live question) at a large/projector-like resolution and confirm text is legible from several feet away from your monitor. No logic regressions — the app still behaves exactly as before this task.
```bash
git checkout -b phase4/4.7-display-polish
git add . && git commit -m "Phase 4.7: display visual polish for projector legibility"
git checkout main && git merge phase4/4.7-display-polish && git push origin main
```

**Phase 4 exit check:** matches the architecture doc — displayed on an actual projector or large screen, every state (idle, question, time's up, gap, results, scoreboard) is legible from the back of a room, and the display never shows anything it isn't supposed to before the appropriate reveal moment.

---

## 9. PHASE 5 — CANDIDATE TABLET UI

Builds the `/play/:candidateId` screen from Section 13. The lock-in path here is the fairness guarantee the whole system is built on, so it goes back to Antigravity for the riskiest tasks.

### Task 5.1 — React app scaffold + token validation
**Tool:** OpenCode (default tier — the prompt below deliberately delegates the actual security check to Task 2.5's socket layer and explicitly forbids adding a second REST validation path, so this task is really just "render a friendly error on rejection," a UI task, not a security task)
**Prompt:**
```
Read AGENTS.md and Section 15's "Candidate route protection" bullet first. Use
docs/stitch-ui/candidate_tablet_invalid_link_error/ as the visual reference for
the error screen. In
client/src/candidate/, set up the route /play/:candidateId reading a ?token=
query param. On load, validate the candidateId+token pair by attempting the
Socket.IO room join (the server-side validation from Task 2.5 already rejects bad
tokens) — do not add a second, separate REST validation call, since the socket
layer is already the source of truth for this. If the connection is rejected, show
a clear "This link isn't valid — check with your Quiz Master" screen instead of a
blank page or a raw error. If valid, proceed to an idle/waiting shell (the real
idle screen is Task 5.6).
```
**Verify:** open `/play/<realCandidateId>?token=<correctToken>` and confirm it connects successfully. Open the same URL with a wrong or missing token and confirm you see the friendly error screen, not a crash or blank page.
```bash
git checkout -b phase5/5.1-candidate-scaffold
git add . && git commit -m "Phase 5.1: candidate tablet scaffold with token validation"
git checkout main && git merge phase5/5.1-candidate-scaffold && git push origin main
```

### Task 5.2 — Socket client wiring + reconnect-safe sync
**Tool:** Antigravity (hard & important — reliability-critical per NFR5, and must never subscribe to the admin-only channel)
**Prompt:**
```
Read AGENTS.md, docs/Quiz_System_Architecture_Document.md Section 12 in full, and
Section 15's Reconnect handling bullet before writing anything. This screen must
NEVER subscribe to game:state or candidates:updated (the admin-only, unredacted
events) — only game:state:public and events explicitly scoped to
candidate:<candidateId>'s own room.

In client/src/candidate/, build the socket wiring: subscribe to game:state:public,
timer:tick, gap:started, gap:tick, results:revealed, and time:up, scoping
correctly to this candidate's own connection. Critically, implement true
reconnect-safety per NFR5: on every socket 'connect' event (including
reconnects, not just the first load — Socket.IO fires 'connect' again after a
network blip), immediately request a fresh state snapshot rather than trusting
any locally cached state, so a tablet that drops Wi-Fi mid-question and reconnects
5 seconds later correctly shows: the current question, whether THIS candidate
already locked in (and can't lock in again), and the correct remaining time — not
a stale view from before the disconnect.

Explicitly confirm in your response that game:state (unredacted) and
candidates:updated do not appear anywhere in client/src/candidate/.
```
**Verify:** with a question live and this candidate NOT yet locked in, kill your Wi-Fi/network for ~5 seconds and restore it — confirm the tablet correctly resumes showing the live countdown and the question, not a frozen or blank screen. Repeat after this candidate HAS locked in, and confirm on reconnect it correctly shows "already locked" rather than letting them answer again. Run `grep -rn "'game:state'" client/src/candidate/` (the closing quote right after `state` is deliberate — it matches the exact event name `game:state` and will NOT match `game:state:public`, which has `:public` immediately after `state` instead of a closing quote) and confirm it returns zero matches.
```bash
git checkout -b phase5/5.2-candidate-socket-wiring
git add . && git commit -m "Phase 5.2: candidate socket wiring with reconnect-safe sync"
git checkout main && git merge phase5/5.2-candidate-socket-wiring && git push origin main
```

### Task 5.3 — MCQ answer screen
**Tool:** Antigravity (hard & important — this is the core fairness-critical lock-in path)
**Prompt:**
```
Read AGENTS.md and Section 13's "MCQ question state" description and Section 10's
lock-in rules (particularly: "Locking in early does NOT end the question or affect
other candidates — everyone keeps their full time window") before writing
anything. Use docs/stitch-ui/candidate_tablet_live_mcq_active/ as the visual
reference for the pre-lock state and docs/stitch-ui/candidate_tablet_live_mcq_locked_in/
for the post-lock state.

Build the MCQ answer screen: question text + media mirrored from what
game:state:public provides, the live countdown, and 4 large tappable option
buttons. On tap, immediately emit candidate:lockAnswer with this candidate's id
and the chosen optionKey, and IMMEDIATELY disable all 4 buttons client-side (don't
wait for server confirmation to prevent a double-tap — the server is the ultimate
guard from Task 2.2/2.6, but the UI should feel instant and never allow a visible
second tap). Show the chosen option marked "Locked ✔" and grey out the rest, while
the countdown keeps running — this candidate's screen must NOT show a "waiting for
others" or "question ending" state, since per Section 10 the question stays fully
live for everyone else until the real timer ends. There is no separate Stitch
mockup or dedicated build task for a tablet Gap/suspense state (see Section 0.1)
— once time:up fires, keep showing this same locked view (with the countdown
simply resting at zero) straight through any Gap phase, until results:revealed
hands off to Task 5.5. Handle the server rejecting a
double-lock gracefully (it shouldn't be reachable via normal UI use, but don't let
a race condition crash the screen if it happens).
```
**Verify:** tap an option and confirm it locks instantly, the other 3 options grey out, and the countdown keeps running normally (it must NOT jump to zero or show any "question ending" indicator just because this candidate answered). Using two browser tabs as two different candidates, confirm one candidate locking in has zero visible effect on the other candidate's screen or timer.
```bash
git checkout -b phase5/5.3-mcq-answer-screen
git add . && git commit -m "Phase 5.3: MCQ answer screen with instant lock-in"
git checkout main && git merge phase5/5.3-mcq-answer-screen && git push origin main
```

### Task 5.4 — OPEN/Rapid-Fire answer screen
**Tool:** Antigravity (hard & important — same lock-in path and risk profile as 5.3)
**Prompt:**
```
Read AGENTS.md and Section 13's "OPEN question state" description first. Use
docs/stitch-ui/candidate_tablet_rapid_fire_active/ as the visual reference for
the pre-lock state and docs/stitch-ui/candidate_tablet_rapid_fire_locked/ for
the post-lock state. Build the
OPEN-round answer screen (used for Rapid Fire): question text + media, the live
countdown, and a single large "Lock My Answer" button. On tap, emit
candidate:lockAnswer with just this candidate's id (no optionKey, since OPEN
questions have no preset options — the real answer is spoken aloud off-app),
immediately disable the button and show "Locked ✔", and — exactly like Task
5.3 — do NOT stop the timer or show any "others still answering" messaging; the
question stays fully live for other candidates until time's up. As with Task
5.3, this locked view is also what stays on-screen through any Gap phase (there
is no separate tablet Gap mockup — see Section 0.1).
```
**Verify:** same checks as Task 5.3 but for the single-button flow: tap locks instantly, timer keeps running normally, and another candidate's screen (two-tab test) is unaffected by this one locking in.
```bash
git checkout -b phase5/5.4-open-answer-screen
git add . && git commit -m "Phase 5.4: OPEN/Rapid Fire answer screen"
git checkout main && git merge phase5/5.4-open-answer-screen && git push origin main
```

### Task 5.5 — Results/feedback screen
**Tool:** OpenCode (default tier — pure rendering of this candidate's own slice of `results:revealed`, filtered client-side; three Stitch mockups cover every state it needs to show)
**Prompt:**
```
Read AGENTS.md and Section 13's candidate "Results state" description first.
Use docs/stitch-ui/candidate_tablet_results_winner/ as the visual reference for
when this candidate won the round, docs/stitch-ui/candidate_tablet_results_correct/
for correct-but-not-fastest, and docs/stitch-ui/candidate_tablet_results_incorrect/
for incorrect (reuse the incorrect layout for the "no answer" case too, adjusting
only the status text/badge — there's no separate mockup for it).
Build the results view for this candidate: the correct answer, whether THIS
candidate was correct/incorrect/no-answer (derived from results:revealed's
rankings array, filtered to this candidate's own id), their own response time, and
a clear "You won this round! 🏆" state if winnerCandidateId matches this
candidate's id.
```
**Verify:** run a full question through to reveal with this candidate answering correctly-and-fastest, correctly-but-slower, incorrectly, and not at all (test all four across separate runs or separate tabs) and confirm each shows the right corresponding feedback.
```bash
git checkout -b phase5/5.5-candidate-results
git add . && git commit -m "Phase 5.5: candidate results and feedback screen"
git checkout main && git merge phase5/5.5-candidate-results && git push origin main
```

### Task 5.6 — Idle/waiting screen + candidate branding
**Tool:** OpenCode (bulk/easy)
**Prompt:**
```
Read AGENTS.md first. Use docs/stitch-ui/candidate_tablet_waiting_room/ as the
primary visual reference (this is what real tablets will show), and
docs/stitch-ui/candidate_tablet_waiting_room_desktop/ for how the same screen
should adapt on a wider desktop viewport during dev testing before real tablets
are available. Build the idle/waiting screen shown before the quiz starts
(and between questions if you want a brief transition state): this candidate's
name and logo (fetched once on connect — safe to use since it's this candidate's
own data, not another candidate's), and a "Waiting for quiz to start..." message.
```
**Verify:** before Admin clicks "Start Quiz," the tablet shows this candidate's own name/logo and a waiting message, not a blank screen.
```bash
git checkout -b phase5/5.6-candidate-idle
git add . && git commit -m "Phase 5.6: candidate idle and waiting screen"
git checkout main && git merge phase5/5.6-candidate-idle && git push origin main
```

### Task 5.7 — Tablet visual polish
**Tool:** OpenCode (bulk/easy — pure styling)
**Prompt:**
```
Read AGENTS.md first. Re-check every screen against its Stitch mockup from
Section 0.1's table (the candidate_tablet_* folders). Do a visual-only pass across every candidate screen built in
this phase: large touch targets (option buttons and the Lock button should be
comfortably tappable on a real tablet, not just a mouse cursor), mobile-friendly
responsive layout, and a clear visual "Locked" state so a nervous contestant can
instantly tell their tap registered. Do not change any socket logic — styling
only.
```
**Verify:** open the candidate screen on an actual tablet or your phone's browser (not just desktop dev tools) and confirm buttons are comfortably tappable and text is legible, with no change in underlying behavior from before this task.
```bash
git checkout -b phase5/5.7-candidate-polish
git add . && git commit -m "Phase 5.7: candidate tablet visual polish"
git checkout main && git merge phase5/5.7-candidate-polish && git push origin main
```

**Phase 5 exit check:** matches the architecture doc — 4 physical tablets on the same LAN can each independently lock in at different times within the same question window without interfering with each other or ending the question early, verified in a full dry run, with reconnect-safety holding up under a real Wi-Fi drop test.

---

## 10. END-OF-PHASE-5 FULL INTEGRATION SMOKE TEST

Before you consider Phases 1–5 "done," run this once, all together, with real devices if you can (or 6 browser windows/tabs if not — 1 admin, 1 display, 4 candidates):

1. Start the server fresh (`npm run dev` in `server/`), open `/admin` and log in.
2. Open `/display` in one window/screen.
3. Open `/play/:id?token=...` for all 4 seeded candidates.
4. From Live Control, click **Start Quiz**.
5. Run one full **MCQ** question: have candidates lock in at different times, including one that doesn't answer at all. Confirm Display shows only the lock-count during the window, never answer content. Let the timer run out on its own — don't use End Timer Now for this run.
6. Confirm the Gap screen appears (if enabled) and then Results — with the correct fastest-correct candidate declared winner, and their score increasing by exactly the round's point value on every screen (Admin, Display, and all 4 candidate tablets) simultaneously.
7. Run one full **OPEN** (Rapid Fire style) question: candidates press Lock at different times, Admin judges correctness fastest-first, and the winner is computed correctly.
8. During a live question, disconnect one candidate's Wi-Fi for a few seconds and reconnect — confirm it resyncs correctly without breaking the other 3 candidates or the Admin/Display view.
9. Use the manual score +/- buttons on the Admin panel and confirm Display's scoreboard updates instantly.
10. Export a backup from Settings, confirm the JSON download contains everything you'd need to restore this exact state.

If all 10 steps pass, Phases 1–5 are solid and you're ready to move on to Phases 6–10 from the architecture document (scoring/timer polish, full dry-run testing, branding, and event-day deployment) in a future session.

---

**End of guide.** When continuing in a new chat for Phases 6–10, paste both this build guide and the architecture document as your first message.
