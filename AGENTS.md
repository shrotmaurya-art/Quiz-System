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

## 7. When in doubt, ask
- If a prompt is ambiguous, or the correct behavior isn't covered by the architecture
  document, ask a clarifying question instead of guessing on anything that affects data
  safety, security, or the scoring/timing engine (Sections 9, 10, 12 of the architecture
  doc).