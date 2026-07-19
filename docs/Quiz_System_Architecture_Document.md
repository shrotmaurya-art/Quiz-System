# LIVE QUIZ COMPETITION SYSTEM — MASTER PLANNING & ARCHITECTURE DOCUMENT

**Project type:** Single-school, offline/LAN, non-production event system (KBC-style live quiz)
**Status:** Planning complete — ready for phased implementation
**How to use this document:** Paste this entire document into a new chat as the first message. It contains full context, architecture, data models, and phase breakdown so implementation can continue without re-explaining the project.

**Revision note (v2):** The original design used two separate answering mechanics — auto-scored MCQ lock-in vs. an instant-lockout Buzzer. This has been replaced by a single **unified Timed-Ranking engine** (Section 10) used by *every* round: the timer always runs its full configured duration, every candidate can lock in an answer any time during that window, the server timestamps each lock, and once time is up, the **fastest candidate with a correct answer wins the round's points (winner-takes-all)** — all other candidates score 0 for that question. Timer duration and an optional post-timer "suspense gap" are both admin-editable, globally and per round/question. See Sections 4, 9, 10, 12, 13, and 16 for the full updated design.

---

## 1. PROJECT OVERVIEW

A school wants to run a live, projector-based quiz competition (inspired by the "Kaun Banega Crorepati" format) using:

- **1 Main Screen / Projector**, driven by a laptop — shows the question, and optional image/video. **Never shows the answer.**
- **4 Candidate Tablets** — one per contestant, each showing that candidate's question + answer options, with a way to lock in an answer.
- **1 Admin Panel** — operated by the Quiz Master, used to control the flow of the game live (next/previous question, reveal answer, manage score, manage candidates, manage question bank).
- **A live Scoreboard** visible on the Main Screen, updated in real time as scores change.

The system must be **dynamic**: questions, options, images/videos, and candidates are all managed through the admin panel — nothing is hardcoded. Two sample question banks (ICSE Std VIII–X "Tough" and Std V–VII "Tougher") were provided as reference content — the system must support this exact structure (6 rounds, mixed question types, per-round point values) but as **data**, not fixed logic.

This is a **one-time / occasional-use school event system**, not a commercial product. Priorities: **simplicity, reliability on the day of the event, zero cost, and ease of operation by a non-technical teacher.**

---

## 2. OBJECTIVES & SCOPE

### In Scope
- Dynamic question bank: create/edit/delete rounds and questions (text, image, or video + text).
- Dynamic candidate management: add/edit/remove candidates with ID, name, and logo/avatar.
- Live game control from an admin panel (next, previous, reveal answer, timer, scoring).
- Real-time sync across Main Screen + 4 Candidate Tablets + Admin Panel (all on LAN).
- Real-time scoreboard on the Main Screen.
- A unified **Timed-Ranking answer engine** used by every round: full-duration timer, all 4 candidates can lock in anytime during that window, server-timestamped, fastest **correct** candidate wins the round's points (winner-takes-all) — see Section 10. Works for both MCQ-style questions (options on tablet) and open-ended/spoken questions like Rapid Fire (single "Lock Answer" button, Admin judges correctness) — see Section 16.
- Runs entirely on a local network — **no internet required during the event**, no paid services.

### Out of Scope (for this build)
- Multi-school / multi-tenant support.
- Public internet hosting, user accounts for parents/audience, login systems beyond a simple admin PIN.
- Mobile native apps (everything runs in a tablet/laptop browser — installable as a PWA optionally).
- Video conferencing / remote candidates (all 4 candidates are physically present on LAN).
- Payment, analytics, or scale-related engineering (this is intentionally NOT built like a SaaS product).

---

## 3. ACTORS & DEVICES

| Actor | Device | Access |
|---|---|---|
| **Quiz Master (Admin)** | Laptop/tablet, own screen | `/admin` route, PIN-protected |
| **Main Screen / Projector** | Laptop connected to projector | `/display` route, read-only, no admin controls |
| **Candidate 1–4** | 4x Tablets | `/play/:candidateId` route, one per physical tablet |
| **Audience** | Views projector only | No device/interaction needed |

All devices connect to the **same LAN** (a school Wi-Fi router or a portable travel router/hotspot — no internet uplink required).

---

## 4. FUNCTIONAL REQUIREMENTS

**Question Bank Management (Admin)**
- FR1: Create/edit/delete **Rounds** (name, order, `answerMode` — MCQ or open-ended/spoken, points per question, time limit, Gap phase on/off + duration).
- FR2: Create/edit/delete **Questions** within a round: question text, optional media (image or video), 2–4 options (for MCQ rounds), correct answer, points override, time limit override.
- FR3: Upload images/videos from the admin device; files stored locally and served over LAN.
- FR4: Reorder questions within a round (drag or up/down).

**Candidate Management (Admin)**
- FR5: Add a candidate: unique ID (auto-generated), name, optional logo/photo upload.
- FR6: Edit a candidate's name/logo.
- FR7: Remove a candidate (mid-competition removal should be possible between questions, not disruptive).
- FR8: System supports exactly 4 active candidate slots for this event, but the data model itself is not hardcoded to 4 (so it's reusable for 2, 3, 5, 6 in future years).

**Live Game Control (Admin)**
- FR9: Start Quiz → moves state machine to Round 1, Question 1.
- FR10: Next Question / Previous Question navigation.
- FR11: The per-question timer is **fully editable by the Admin** — a global default, an optional per-round override, and an optional per-question override (most specific wins). Example: default 30s, but one hard question can be set to 45s.
- FR12: The timer, once started, **always runs its full configured duration** — it does not stop early just because all candidates have answered. Admin retains a manual **"End Timer Now"** override for exceptional situations (e.g. a technical fault), used only as an escape hatch.
- FR13: Every candidate lock-in is **timestamped by the server** (not the tablet's clock) the instant it's received, so ranking is fair and immune to individual device clock drift.
- FR14: A candidate who has not locked in an answer when the timer reaches zero is automatically marked **"No Answer"** (blocked) and is excluded from the ranking/winning for that question.
- FR15: An optional **"Gap" phase** (suspense pause) runs after the timer ends and before results are revealed. Both **whether the gap happens at all** and **its duration** are Admin-editable (default: on, 10 seconds), globally and per round/question.
- FR16: **Reveal Results**: shows the correct answer, each candidate's answer/lock status, their elapsed response time, and highlights the **winner** — the fastest candidate whose answer was correct. Winner-takes-all: only the winner is awarded the round's point value for that question; everyone else scores 0 for it.
- FR17: For questions with no preset options (open-ended/spoken, e.g. Rapid Fire), after the timer ends the Admin is shown candidates in ranked (fastest-first) order and marks each one's spoken answer correct/incorrect; the system automatically determines the winner as the fastest candidate marked correct.
- FR18: Manual score adjustment (+/-) per candidate, at any time, as a general override/corrections tool independent of the automatic scoring above.
- FR19: Reset/End quiz, with a confirmation step (destructive action).
- FR20: Jump directly to any round (for rehearsal/testing, and for recovering from an unplanned skip).

**Main Screen (Display)**
- FR21: Shows current question text + image/video (if any). **Never shows options' correctness, other candidates' choices, or timestamps until Admin reveals results.**
- FR22: Shows round name, question number, and a live countdown timer.
- FR23: During the answering window, shows only a live lock-in count ("2/4 locked in") — never who locked in what, to preserve suspense.
- FR24: Shows the results screen (ranking + winner) after reveal, and the live scoreboard between questions / on demand.
- FR25: Shows a "waiting" / idle screen before the quiz starts and between rounds, and a "Calculating results…" screen during the Gap phase (if enabled).

**Candidate Tablet**
- FR26: Shows the same question as the Main Screen, plus either 4 tappable answer options (MCQ-style rounds) or a single "Lock My Answer" button (open-ended/spoken rounds like Rapid Fire).
- FR27: Lock-in mechanism: once tapped, the choice/button cannot be changed for that question, but the candidate **can still see the timer counting down** — locking in early does not end their turn or anyone else's.
- FR28: Visual confirmation that an answer was locked (but not whether it's correct, and not the elapsed time, until Admin reveals results).
- FR29: Reconnect-safe: if a tablet refreshes or loses Wi-Fi momentarily, it re-syncs to the current game state (including whether it already locked in) automatically.

**Scoreboard**
- FR30: Real-time updates on the Main Screen whenever a score changes.
- FR31: Sorted by score, highest first, with candidate logo/name.

---

## 5. NON-FUNCTIONAL REQUIREMENTS

- **NFR1 – Zero cost:** every library, framework, and tool used must be free/open-source. No paid cloud services.
- **NFR2 – LAN-only:** the system must fully function with zero internet connectivity once installed.
- **NFR3 – Low operational complexity:** a non-technical teacher must be able to start the server and open the right screens with a short printed checklist (see Section 18).
- **NFR4 – Real-time feel:** state changes (question change, lock-in, reveal, score update) must propagate to all screens in well under 1 second on LAN.
- **NFR5 – Resilience:** a candidate tablet reconnecting mid-question must not corrupt game state or lose the current question; server is the single source of truth.
- **NFR6 – No build-step fragility on event day:** the app should be pre-built/tested well before the event; event-day operation should just be "start server → open URLs."
- **NFR7 – Small scale, intentionally:** designed for ~1 concurrent admin, ~1 display, ~4 candidates. Do not over-engineer for concurrency, load balancing, or multi-server scale.

---

## 6. HIGH-LEVEL ARCHITECTURE

Single **monolithic Node.js application** (not microservices — unnecessary at this scale) that:
1. Serves the web frontend (Admin / Display / Candidate views) as static assets.
2. Exposes a REST API for CRUD (questions, rounds, candidates).
3. Runs a **Socket.IO** real-time layer for live game-state broadcast.
4. Stores data in a local **SQLite** file (zero-install, file-based, free).
5. Serves uploaded images/videos from a local `/uploads` folder as static files.

```
                              ┌─────────────────────────────┐
                              │   Node.js Server (Express)   │
                              │  - REST API                  │
                              │  - Socket.IO server          │
                              │  - SQLite (better-sqlite3)   │
                              │  - Static file server        │
                              │    (frontend build + /uploads)│
                              └───────────────┬──────────────┘
                                              │  LAN (Wi-Fi router / hotspot)
              ┌────────────────┬──────────────┼───────────────┬────────────────┐
              │                │              │               │                │
      ┌───────▼──────┐ ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼─────┐ ┌────────▼────────┐
      │ Admin Panel  │ │ Main Display │ │ Candidate 1│ │ Candidate 2│ │ Candidate 3 & 4  │
      │  (laptop)    │ │  (projector) │ │  (tablet)  │ │  (tablet)  │ │   (tablets)      │
      │  /admin      │ │  /display    │ │ /play/:id  │ │ /play/:id  │ │   /play/:id      │
      └──────────────┘ └──────────────┘ └────────────┘ └────────────┘ └──────────────────┘
```

**Why one server, one machine?** For a single-school LAN event, running one Node process on the Quiz Master's laptop (or a dedicated "server laptop") that all other devices connect to via browser is the simplest, most reliable, zero-cost option — no cloud, no DNS, no external dependency.

---

## 7. NETWORK / DEPLOYMENT ARCHITECTURE

**Setup:**
1. One machine acts as the **host/server** (can be the same laptop driving the projector, or a separate laptop).
2. All devices (host, 4 tablets, admin device if separate) join the **same Wi-Fi network** — either the school's LAN Wi-Fi, or a simple travel router / mobile hotspot with no internet required.
3. The host machine gets a local IP, e.g. `192.168.1.10`.
4. Node server binds to `0.0.0.0:4000` (configurable port) so it's reachable from other devices on the LAN.
5. Devices open a browser to:
   - Admin: `http://192.168.1.10:4000/admin`
   - Display: `http://192.168.1.10:4000/display`
   - Candidate N: `http://192.168.1.10:4000/play/<candidateId>`
6. Optional convenience: Admin Panel generates a **QR code** per candidate URL (via the free `qrcode` npm package) so tablets can be pointed at the right URL quickly without typing.

**Why this works without internet:** Everything (frontend files, API, database, media) is served from the host machine itself. The Wi-Fi router only needs to route local traffic between devices — no WAN/internet uplink is used.

**Firewall note:** the host machine's firewall must allow inbound connections on the chosen port (a one-time OS setting, documented in Section 18).

---

## 8. TECHNOLOGY STACK (all free/open-source)

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | **Node.js** | Free, cross-platform, single language across stack |
| Web framework | **Express.js** | Minimal, well-documented, easy REST + static serving |
| Real-time layer | **Socket.IO** | Reliable WebSocket abstraction with auto-fallback, rooms support (perfect for per-candidate + broadcast channels) |
| Database | **SQLite** via `better-sqlite3` | Zero-install, single file, no separate DB server to run on event day, fully free |
| Frontend framework | **React (Vite)** | Fast dev/build, component reuse across Admin/Display/Candidate views, huge free ecosystem |
| Styling | **Tailwind CSS** | Fast to build clean, distinct-looking screens (important for a projector display) |
| Media storage | Local filesystem `/uploads` folder | No cloud storage needed; served statically by Express |
| QR code generation | `qrcode` (npm) | Free, for quick candidate tablet setup |
| Process management (optional) | `pm2` or a simple shell/batch script | Keep the server auto-restarting if it crashes on event day |

**No paid services anywhere** — no cloud DB, no cloud storage, no hosting cost, no license fees.

---

## 9. DATA MODEL

```jsonc
// Candidate
{
  "id": "C1",                     // short unique ID, e.g. C1-C4
  "name": "Aarav Shah",
  "logoUrl": "/uploads/candidates/c1.png", // optional
  "score": 0,
  "isActive": true,               // soft-remove instead of hard delete (preserves score history)
  "joinToken": "a1b2c3"           // used in /play/:id?token=... to prevent random guessing
}

// GlobalSettings (single row — defaults, overridable per round/question)
{
  "defaultTimeLimitSeconds": 30,
  "defaultGapEnabled": true,
  "defaultGapSeconds": 10
}

// Round
{
  "id": "R1",
  "name": "General Knowledge",
  "order": 1,
  "answerMode": "MCQ",             // "MCQ" (tappable options) | "OPEN" (single lock button, spoken answer)
  "pointsPerQuestion": 10,
  "timeLimitSeconds": 30,          // Admin-editable; falls back to GlobalSettings.defaultTimeLimitSeconds if null
  "gapEnabled": true,              // Admin-editable on/off for the post-timer suspense pause
  "gapSeconds": 10,                // Admin-editable gap duration
  "instructions": "5 questions | 10 points each"
}

// Question
{
  "id": "Q1",
  "roundId": "R1",
  "order": 1,
  "text": "Which Article of the Indian Constitution abolishes untouchability?",
  "mediaType": "none",             // "none" | "image" | "video"
  "mediaUrl": null,                 // e.g. "/uploads/questions/q1.jpg"
  "options": [                      // empty array if round.answerMode === "OPEN"
    { "key": "A", "text": "Article 14" },
    { "key": "B", "text": "Article 17" },
    { "key": "C", "text": "Article 21" },
    { "key": "D", "text": "Article 32" }
  ],
  "correctOptionKey": "B",          // null for "OPEN" questions (Admin judges correctness manually per candidate)
  "pointsOverride": null,           // null = use round.pointsPerQuestion
  "timeLimitOverrideSeconds": null, // null = use round.timeLimitSeconds
  "gapEnabledOverride": null,       // null = use round.gapEnabled
  "gapSecondsOverride": null        // null = use round.gapSeconds
}

// GameState (single row / in-memory, persisted for crash recovery)
{
  "phase": "IDLE",                  // see Section 10 for full list
  "currentRoundId": "R1",
  "currentQuestionId": "Q1",
  "timerStartedAt": 1234567,        // server epoch ms — clients only ever trust this, never their own clock
  "timeLimitSeconds": 30,           // resolved value for this question (question override > round > global)
  "gapEnabled": true,               // resolved value for this question
  "gapSeconds": 10,                 // resolved value for this question
  "locks": {                        // per-question answer locks, server-timestamped on receipt
    "C1": { "optionKey": "B", "elapsedMs": 4210, "answered": true },
    "C2": { "optionKey": null, "elapsedMs": null, "answered": false }, // no lock yet — still open
    "C3": { "optionKey": "A", "elapsedMs": 9875, "answered": true },
    "C4": { "optionKey": null, "elapsedMs": null, "answered": false }
  },
  "judgements": {                   // only populated for "OPEN" rounds, during JUDGING phase
    "C1": null,                     // null = not yet judged | true = correct | false = incorrect
    "C3": null
  },
  "winnerCandidateId": null,        // resolved at RESULTS: fastest candidate with a correct answer
  "resultsRevealed": false
}

// ScoreLog (audit trail — useful for disputes/replays)
{
  "id": "log1",
  "questionId": "Q1",
  "candidateId": "C1",
  "pointsChange": 10,
  "reason": "timed_ranking_win",    // "timed_ranking_win" | "manual_adjustment"
  "timestamp": 1234567
}
```

**Resolution order for timing values:** question-level override → round-level value → `GlobalSettings` default. This is what makes the timer and gap "flexible and dynamic" — the Admin can change the default once, override it for a whole round, or override it for a single tricky question, without touching code.

---

## 10. GAME STATE MACHINE

Each question goes through a strict, server-controlled lifecycle. The server is the **single source of truth**; all clients only render whatever state the server broadcasts.

Every round — MCQ or open-ended — now runs through the **same single mechanic**: the timer always runs its full duration, every candidate may lock in at any point during that window, and the server timestamps each lock. Nothing is decided by "who pressed first" during the window itself — ranking only happens once time is up.

```
IDLE
  │  (Admin: Start Quiz / Next Question)
  ▼
QUESTION_SHOWN
  — Main Screen + all 4 Tablets show the question (+ media if any).
  — Tablets show either 4 MCQ options (round.answerMode = "MCQ") or a single
    "Lock My Answer" button (round.answerMode = "OPEN", e.g. Rapid Fire).
  — timerStartedAt = now; countdown begins for the resolved timeLimitSeconds.
  — Any candidate may lock in at any moment during the window:
       • MCQ: taps one option → server timestamps { optionKey, elapsedMs }.
       • OPEN: taps "Lock My Answer" → server timestamps { elapsedMs } (answer itself is spoken aloud).
  — Once locked, that candidate's choice is final — no changes accepted.
  — Locking in early does NOT end the question or affect other candidates —
    everyone keeps their full time window regardless of who else has answered.
  — Display/Admin see only a live "X/4 locked in" counter — no names, no times, no correctness.
  │
  │  (timer reaches 0 — automatic) OR (Admin: "End Timer Now" — manual override, exceptional use only)
  ▼
TIME_UP  (momentary, automatic)
  — Any candidate who never locked in is marked answered:false / "No Answer" — excluded from ranking.
  — All remaining locks are finalized; no further input accepted from anyone.
  │
  ├─(round.answerMode === "OPEN")─▶ JUDGING
  │     — Admin sees candidates who answered, in fastest-first order.
  │     — Admin marks each one's spoken answer correct / incorrect.
  │     — Admin may stop as soon as the first (fastest) correct answer is found,
  │       or judge all for the record — the system only needs the fastest correct one.
  │  (Admin finishes judging)
  │
  └─(round.answerMode === "MCQ")──▶ (correctness auto-computed by matching optionKey to
                                      correctOptionKey — no manual judging needed)
  │
  ▼
GAP   (only if resolved gapEnabled === true for this question; otherwise skipped entirely)
  — "Calculating results…" suspense screen on Main Display + Tablets for gapSeconds.
  │  (gap timer ends)
  ▼
RESULTS  (= ANSWER_REVEALED)
  — Correct answer/option revealed on Main Screen + Tablets.
  — Full ranking shown: each candidate's elapsed time, correct/incorrect/no-answer status.
  — winnerCandidateId = fastest candidate among those marked/matched correct (if any).
  — Winner-takes-all scoring: winner is auto-awarded the round's point value for this question;
    every other candidate scores 0 for it (Admin can still manually adjust via FR18 if needed).
  — Scoreboard updates broadcast to all screens.
  │  (Admin: Next Question)
  ▼
QUESTION_SHOWN (next) ... repeats ...

(after last question of last round)
  ▼
QUIZ_ENDED — Main Screen shows final scoreboard/winner.
```

Admin can also trigger `Previous Question` from most states (re-enters QUESTION_SHOWN for the prior question, resets its locks/judgements) and `Jump to Round` for rehearsal. The `"End Timer Now"` override exists purely as a safety valve for technical issues (e.g. a stuck tablet) — the default and expected behavior is that the timer always runs its full configured duration, per the original requirement.

---

## 11. REST API (CRUD / non-realtime operations)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/rounds` | List all rounds with question counts |
| `POST` | `/api/rounds` | Create round |
| `PUT` | `/api/rounds/:id` | Edit round |
| `DELETE` | `/api/rounds/:id` | Delete round (and its questions, with confirmation) |
| `GET` | `/api/rounds/:id/questions` | List questions in a round |
| `POST` | `/api/questions` | Create question (multipart if media attached) |
| `PUT` | `/api/questions/:id` | Edit question |
| `DELETE` | `/api/questions/:id` | Delete question |
| `POST` | `/api/questions/:id/media` | Upload/replace image or video for a question |
| `GET` | `/api/candidates` | List candidates (active + inactive) |
| `POST` | `/api/candidates` | Add candidate (name, optional logo) |
| `PUT` | `/api/candidates/:id` | Edit candidate |
| `DELETE` | `/api/candidates/:id` | Remove (soft-delete) candidate |
| `POST` | `/api/candidates/:id/logo` | Upload candidate logo |
| `GET` | `/api/scoreboard` | Current scoreboard snapshot |
| `POST` | `/api/admin/login` | Simple PIN check → returns a short-lived admin session token |
| `GET` | `/api/export` | Export full question bank + results as JSON (backup) |
| `POST` | `/api/import` | Import a question bank JSON (e.g. pre-load from the two uploaded docs) |

All mutating endpoints require the admin session token (see Section 15).

---

## 12. REAL-TIME EVENTS (Socket.IO)

**Socket rooms:** `admin`, `display`, `candidate:<candidateId>` — the server broadcasts to the right room(s) so candidates never receive each other's tablet-only data, and the display never receives answer data before reveal.

| Event (server → client) | Payload | Who receives |
|---|---|---|
| `game:state` | full current `GameState` + current `Question` (sans correct answer/timestamps, unless revealed) | display, all candidates (candidate view also gets its own options) |
| `timer:tick` | `{ remainingSeconds }` | display, all candidates |
| `candidate:locked` | `{ candidateId }` (no answer content, no elapsed time) | display, admin (so Admin/Display can show "3/4 locked in") |
| `time:up` | `{ noAnswerCandidateIds }` | display, admin, all candidates |
| `judging:started` | `{ rankedCandidateIds }` (fastest-first, OPEN rounds only) | admin |
| `gap:started` | `{ gapSeconds }` | display, admin, all candidates |
| `gap:tick` | `{ remainingSeconds }` | display, all candidates |
| `results:revealed` | `{ correctOptionKey\|correctAnswerText, rankings: [{ candidateId, elapsedMs, status }], winnerCandidateId }` | display, admin, all candidates |
| `scoreboard:update` | sorted candidate list with scores | display, admin |
| `candidates:updated` | full candidate list | admin, display |

Where `status` in `rankings` is one of `"correct"`, `"incorrect"`, or `"no_answer"`.

| Event (client → server) | Payload | Sender |
|---|---|---|
| `admin:nextQuestion` / `admin:prevQuestion` | — | admin |
| `admin:endTimerNow` | — | admin (manual override — technical-issue escape hatch only, per Section 10) |
| `admin:submitJudgement` | `{ candidateId, isCorrect }` | admin (OPEN rounds only, during `JUDGING`) |
| `admin:advanceFromGap` | — | admin (optional manual skip of remaining gap time) |
| `admin:adjustScore` | `{ candidateId, delta, reason }` | admin (general manual override, independent of automatic scoring) |
| `candidate:lockAnswer` | `{ candidateId, optionKey? }` (`optionKey` omitted for OPEN rounds) | candidate tablet |

The server validates every incoming event against the current `phase` (e.g. a `lockAnswer` arriving after `TIME_UP` is rejected) so a slow/buggy client can never corrupt shared state. **All elapsed-time calculations happen server-side** using `GameState.timerStartedAt` and the server's receipt time of `candidate:lockAnswer` — client-reported timestamps are never trusted, which keeps ranking fair regardless of each tablet's own clock accuracy.

---

## 13. SCREEN-BY-SCREEN UX SPEC

**Admin Panel (`/admin`)**
- Left nav: *Rounds & Questions*, *Candidates*, *Live Control*, *Settings/Backup*.
- *Live Control* tab (used during the actual event): big "Next / Previous" buttons, current question preview, live "X/4 locked in" status, countdown display, an "End Timer Now" override (visually secondary, confirm-before-use), and — once `TIME_UP` fires — either an automatic MCQ result or, for OPEN rounds, a **Judging panel**: candidates listed fastest-first with Correct/Incorrect buttons per candidate. After judging (or automatically for MCQ), a "Reveal Results" button becomes active (or the Gap countdown runs automatically first, if enabled). Manual score +/- buttons per candidate remain available at all times as a general override, plus the current scoreboard.
- *Rounds & Questions* tab: table of rounds → expand to question list → add/edit form with text, media upload (image/video), `answerMode` toggle (MCQ / OPEN), options A–D (MCQ only), correct answer selector (MCQ only), points, **time limit (editable, with a "use round default" checkbox)**, and **gap on/off + gap seconds (editable, with a "use round default" checkbox)**.
- *Candidates* tab: table with add-candidate form (name + logo upload), edit/remove buttons, auto-generated ID and join link/QR per candidate.
- *Settings/Backup* tab: `GlobalSettings` defaults (default time limit, default gap on/off, default gap seconds) editable here — the base values that rounds/questions fall back to.

**Main Display (`/display`)**
- Full-screen, dark high-contrast theme suited for projection.
- Idle state: school/event branding + "Get Ready."
- Question state: round name + question number, question text (large font), image or video if present, a prominent countdown timer, and a "🔒 X/4 locked in" indicator — **no names, no times, no correctness shown during this phase.**
- Time's-up state: countdown hits zero; any un-answered candidates are visibly marked "No Answer."
- Gap state (if enabled for this question): a short "Calculating results…" suspense animation for the configured gap duration.
- Results state: correct answer highlighted, a ranking list of all 4 candidates with their response time and correct/incorrect/no-answer status, and the **winner** clearly called out; updated scoreboard shown alongside or immediately after.
- Scoreboard view: candidate logo, name, score, ranked — shown between rounds and at quiz end (final winner highlighted).

**Candidate Tablet (`/play/:candidateId`)**
- Join/idle screen: candidate name + logo, "Waiting for quiz to start."
- MCQ question state: question text + media (if any) mirrored from display, 4 large tappable option buttons, plus the live countdown. Tapping one locks it in — that option is marked "Locked ✔," the other three grey out for *this candidate only*, but the timer keeps running and the question stays live for everyone else until time's up.
- OPEN question state (e.g. Rapid Fire): question text + media, live countdown, and a single large "Lock My Answer" button (the candidate then answers verbally, off-app). Pressing it locks the timestamp and shows "Locked ✔" — it does **not** stop the timer or affect other tablets.
- Results state: shows the correct answer, whether *this* candidate was correct/incorrect/no-answer, their response time, and whether they were the round's winner.

---

## 14. FOLDER STRUCTURE (proposed)

```
quiz-system/
├── server/
│   ├── src/
│   │   ├── index.js                 # Express + Socket.IO bootstrap
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── db.js                 # better-sqlite3 connection
│   │   ├── routes/
│   │   │   ├── rounds.routes.js
│   │   │   ├── questions.routes.js
│   │   │   ├── candidates.routes.js
│   │   │   └── admin.routes.js
│   │   ├── sockets/
│   │   │   ├── index.js              # room setup
│   │   │   └── gameEngine.js         # state machine logic
│   │   ├── middleware/
│   │   │   └── auth.js               # admin PIN/session check
│   │   └── uploads/                  # image/video/logo storage (served statically)
│   └── package.json
├── client/
│   ├── src/
│   │   ├── admin/                    # Admin Panel React app/routes
│   │   ├── display/                  # Main Display React app/routes
│   │   ├── candidate/                # Candidate Tablet React app/routes
│   │   ├── shared/                   # shared components, socket client, types
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── seed/
│   └── import-icse-sample-banks.js   # loads the two provided docx-derived question banks
├── docs/
│   └── Quiz_System_Architecture_Document.md   # this file
└── README.md                         # setup + event-day instructions
```

---

## 15. SECURITY & RELIABILITY CONSIDERATIONS

Even though this is a low-stakes local event, a few safeguards prevent embarrassing failures:

- **Admin access:** simple PIN entry (stored server-side, not in frontend code) → server issues a short-lived token stored in `localStorage`/memory on the admin device. No public sign-up needed.
- **Candidate route protection:** each candidate URL includes a per-candidate `joinToken` (random string generated at candidate creation) so one tablet can't casually open another candidate's `/play/:id` and see their locked-in state. Not bank-grade security — just enough to prevent accidental mix-ups during a school event.
- **Server as single source of truth:** all game logic (locking, timer, scoring) lives server-side; clients only render state and send intent events. This prevents a tablet bug/exploit from corrupting the shared game state.
- **Server-authoritative timestamps for ranking:** every lock-in's elapsed time is computed on the server from `GameState.timerStartedAt` and the moment the server *receives* the `candidate:lockAnswer` event — never a timestamp reported by the tablet itself. This keeps the "who was fastest" ranking fair even if one tablet's system clock is slightly off. (Network latency differences between tablets are an inherent, small margin of error in any LAN setup like this — acceptable for a school event, but worth knowing about if two locks land within a few milliseconds of each other.)
- **Reconnect handling:** on socket reconnect, client immediately requests `game:state` fresh from server — so a Wi-Fi blip on a tablet never desyncs it.
- **Crash recovery:** `GameState` and scores are persisted to SQLite on every change (not just in memory), so if the server process restarts mid-event, restarting it resumes exactly where it left off.
- **Backup/export:** one-click JSON export of the full question bank + final scores (Section 11 `/api/export`) — useful to keep as a record and to re-use the question bank next year.

---

## 16. KEY ASSUMPTIONS & DESIGN DECISIONS (please confirm/adjust)

1. **Timed-Ranking engine, confirmed design (v2):** every round uses one unified mechanic — the timer always runs its full configured duration, every candidate may lock in an answer at any point during that window (locking in early does not end the question for anyone else), the server timestamps each lock, and once time is up, the **fastest candidate with a correct answer wins the round's points, winner-takes-all** (all others score 0 for that question). Both the time limit and the optional post-timer "suspense gap" (on/off + duration) are Admin-editable, globally and per round/question — see Sections 9 and 10.
   - The two sample question banks contain open-ended Q&A (no multiple-choice options written down). Rounds like *General Knowledge, Current Affairs, Science & Tech, Audio-Visual, Visual Puzzle* are assumed to become `answerMode: "MCQ"` — the Admin adds 2–4 options per question when digitizing them (one correct + distractors you write), and correctness/ranking is fully automatic.
   - *Rapid Fire* is assumed to become `answerMode: "OPEN"` — no preset options, candidates just press "Lock My Answer" and respond verbally; the Admin marks correctness per candidate (fastest-first) after time's up, and the system determines the winner as the fastest one marked correct.
   - `answerMode` is set per round in the admin panel — fully configurable, not locked into this mapping.
2. **4 candidates fixed for this event**, but the system is not hardcoded to 4 — it will support adding/removing candidates dynamically for future reuse with a different number.
3. **Single-server-machine deployment** (no separate database server, no cloud) — matches the "free, LAN, non-production" requirement directly.
4. **No formal user accounts for candidates** — tablets are identified by URL + token, physically handed to each contestant; no username/password flow needed for a live event.

---

## 17. DEVELOPMENT PHASES

Each phase ends with a clear, testable exit criterion so quality is checked before moving on.

### **Phase 0 — Project Setup & Scaffolding**
- Initialize repo, `server/` (Express + Socket.IO + better-sqlite3) and `client/` (Vite + React + Tailwind).
- Define SQLite schema from Section 9 and run initial migration.
- Basic health-check route (`GET /api/health`) and Socket.IO "hello" round-trip test.
- **Exit criteria:** server starts, serves a placeholder page, a test client connects via Socket.IO from another device on the same LAN.

### **Phase 1 — Core Data Layer (Rounds, Questions, Candidates CRUD)**
- Implement all REST endpoints from Section 11 for rounds/questions/candidates.
- Media upload handling (image/video) saved to `/uploads`, served statically.
- Seed script to import the two provided ICSE question banks as starter data (Section 14 `seed/`).
- **Exit criteria:** via REST client (e.g. Postman) or a bare admin form, you can fully create/edit/delete rounds, questions (with media), and candidates; data persists across server restarts.

### **Phase 2 — Game Engine & Real-Time Layer**
- Implement the full state machine from Section 10 server-side, including `TIME_UP`, `JUDGING` (OPEN rounds), `GAP`, and `RESULTS`.
- Implement server-authoritative timing: `timerStartedAt` set on entering `QUESTION_SHOWN`, every lock-in timestamped on server receipt (never trusting client clocks), timer always runs its full resolved duration unless `admin:endTimerNow` is used.
- Implement the timing-value resolution order (question override → round → `GlobalSettings`) from Section 9.
- Implement winner-takes-all scoring: fastest candidate with a correct answer (auto-matched for MCQ, admin-judged for OPEN) is awarded the round's points; all others get 0 for that question.
- Implement all Socket.IO events from Section 12, with room-based broadcasting.
- Server-side validation of event legality against current phase (e.g. reject `lockAnswer` after `TIME_UP`).
- **Exit criteria:** using multiple browser tabs/devices (no UI polish needed yet) simulating 4 candidates, you can run one MCQ question and one OPEN question end-to-end — including out-of-order lock-ins, one candidate not answering at all, the Gap pause, and correct winner-takes-all scoring — all synced live.

### **Phase 3 — Admin Panel UI**
- Build *Rounds & Questions* management screens.
- Build *Candidates* management screen (with logo upload, join-link/QR display).
- Build *Live Control* screen (Section 13) wired to the Phase 2 socket events.
- **Exit criteria:** a non-technical user can run an entire quiz end-to-end using only the Admin Panel UI.

### **Phase 4 — Main Display UI**
- Build the projector-facing screen: idle, question (+media), timer, lock-status, reveal, and scoreboard views per Section 13.
- Tune typography/contrast for projector visibility (large fonts, high contrast — reference `frontend-design` best practices).
- **Exit criteria:** displayed on an actual projector/large screen and legible from the back of a room.

### **Phase 5 — Candidate Tablet UI**
- Build MCQ answer screen (4 options, lock-in) and OPEN answer screen (single "Lock My Answer" button) per Section 13, both showing the live countdown without ending the question early for that candidate.
- Build the results/feedback screen (correct/incorrect/no-answer, response time, winner call-out).
- Add reconnect-safe state sync (re-fetch `game:state` on load/reconnect, including whether this candidate already locked in).
- **Exit criteria:** 4 physical tablets on LAN can each independently lock in at different times within the same question window without interfering with each other or ending the question early, verified in a full dry run.

### **Phase 6 — Scoring & Scoreboard Polish**
- Winner-takes-all scoring: fastest correct candidate (auto-matched for MCQ, admin-judged fastest-first for OPEN) gets the round's point value; everyone else gets 0 for that question.
- Results/ranking screen polish: response-time display formatting (e.g. "3.42s"), correct/incorrect/no-answer badges, winner highlight animation.
- Scoreboard sorting, tie handling (equal total scores across candidates, not per-question ties — per-question ties are resolved by server receipt order, which is effectively never exactly equal), animated score-change on Main Display.
- **Exit criteria:** scores computed automatically match expected point totals in a scripted test run of all 6 rounds from the sample question banks, including at least one no-answer case and one case where the fastest candidate was wrong but a slower one was right.

### **Phase 7 — Media & Timer Refinement**
- Video playback sync considerations (video plays on Display; candidates just see question text/options, not the video, to avoid audio duplication — confirm this matches your intent).
- Timer edge cases: the `admin:endTimerNow` override, auto-marking non-answers as `no_answer` exactly at zero, the optional Gap phase (on/off + duration) transitioning cleanly into Results, and verifying the timing-value resolution order (question → round → global default) picks the right value in each case.
- **Exit criteria:** an image round and a video round both run cleanly through the full question lifecycle, and a test question with a custom time-limit override and a test question with the gap disabled both behave exactly as configured.

### **Phase 8 — Full Dry-Run Testing**
- End-to-end rehearsal with all 5 real devices (1 admin, 1 display, 4 candidates) on the actual event Wi-Fi/router.
- Deliberately test failure cases: a tablet disconnects mid-question and reconnects; server restarts mid-quiz; two candidates lock in at nearly the same instant; admin clicks "Next" rapidly.
- **Exit criteria:** no state corruption or crash in any of the above scenarios; a written test checklist is fully passed.

### **Phase 9 — Branding & UX Polish**
- School name/logo, color theme, optional sound effects for lock-in/reveal/correct/wrong (all free/local audio files).
- Final round data entry (loading the actual finalized question sets).
- **Exit criteria:** the whole app looks presentable on a projector, ready for the real audience.

### **Phase 10 — Deployment & Event-Day Readiness**
- Finalize the LAN setup + startup instructions (Section 18).
- Package a simple start script (e.g. `start-quiz.bat` / `start-quiz.sh`) so the Quiz Master just double-clicks to launch the server.
- Full backup of the question bank + a rehearsal run the day before the event.
- **Exit criteria:** the system can be brought up from a cold laptop by following only the printed checklist, with no developer present.

---

## 18. DAY-OF-EVENT CHECKLIST (to be finalized in Phase 10, drafted now)

1. Power on the host laptop; connect it to the Wi-Fi router/hotspot (no internet needed).
2. Double-click the start script → server running confirmation shown (e.g. "Server running on http://192.168.1.10:4000").
3. On the host laptop (or projector-connected laptop), open `http://<host-ip>:4000/display` → put on projector, full-screen.
4. On Admin device, open `http://<host-ip>:4000/admin`, enter PIN.
5. On each of the 4 tablets, open the pre-set candidate URL (or scan the printed/admin-shown QR code) → confirm each tablet shows the correct candidate name.
6. From Admin Panel → *Live Control* → confirm all 4 candidates show as "connected."
7. Click "Start Quiz" and proceed round by round using Next / Reveal Answer / manual score buttons.
8. At the end, Main Display shows the final scoreboard/winner automatically.

---

## 19. FUTURE ENHANCEMENTS (explicitly out of current scope, noted for later)

- Sound effects / background music library.
- Support for more than 4 candidates or team-based scoring.
- Printable certificates/results export as PDF.
- A "practice mode" for candidates to rehearse tablet controls before the real event.
- Multi-year question bank library with tagging/search.

---

**End of document.** This covers requirements, architecture, data model, real-time protocol, screen specs, folder structure, security notes, and a 10-phase build plan. When continuing in a new chat, paste this whole document as the first message and specify which Phase to start building.
