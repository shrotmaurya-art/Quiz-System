# Phase 8 — Server Restart Verification Log

**Date:** 2026-07-20  
**Test script:** `server/test/verify-restart-scenarios.js`  
**Port:** 3991 | **Admin PIN:** env `ADMIN_PIN`  
**Result: 14 / 14 PASSED — 0 FAILED**

---

## Setup

| Item | Detail |
|------|--------|
| Match 1 (`res-m1`) | 2 candidates (Alice, Bob), 2 rounds (R1 no-gap, R2 gap-enabled), 4 questions total |
| Match 2 (`res-m2`) | 2 candidates (Eva, Frank), no rounds run — isolation control |
| Round 1 | `timeLimitSeconds: 10`, `gapEnabled: false` |
| Round 2 | `timeLimitSeconds: 10`, `gapEnabled: true`, `gapSeconds: 10` |

---

## Scenario 1 — Short delay mid-TIMER (under limit)

**Goal:** Server crashes 2 s into a 10 s question timer. Restart simulates 4 s elapsed
(6 s remaining). Bob locks in **after** reconnect. Verify resumed timer value and
correct scoring.

```
--- Scenario 1: Short delay under timer (10s limit) ---
  Alice locked A (correct) at ~1s.
  Server killed at ~2s.
  Server restarted (4s elapsed, ~6s remaining).
  Resumed timer:tick remaining = 5s
  PASS  S1: Resumed timer is 4-7s (not full 10)
  Bob locked A (correct) post-reconnect.
  PASS  S1: Alice 10pts (faster lock)
  PASS  S1: Bob 0pts (slower lock)
  Scores — Alice: 10, Bob: 0
```

| Assertion | Result |
|-----------|--------|
| Resumed `timer:tick.remainingSeconds` is 4–7 s (not full 10) | ✅ PASS (5 s) |
| Alice 10 pts (locked pre-crash, faster) | ✅ PASS |
| Bob 0 pts (locked post-reconnect, slower) | ✅ PASS |

---

## Scenario 2 — Long delay past TIMER (timer expired during downtime)

**Goal:** Server crashes with Alice locked in. Restart simulates 14 s elapsed (past
the 10 s limit). Server auto-resolves to RESULTS on boot without double-scoring.

```
--- Scenario 2: Long delay past timer (10s limit) ---
  Advanced to Q2.
  Alice locked A (correct) at ~1s.
  Server killed.
  Server restarted (14s elapsed, timer expired during downtime).
  PASS  S2: Phase is RESULTS (auto-resolved on boot)
  PASS  S2: Alice 20pts total
  PASS  S2: Bob 0pts total
  Scores — Alice: 20, Bob: 0
```

| Assertion | Result |
|-----------|--------|
| Phase auto-resolved to `RESULTS` on boot | ✅ PASS |
| Alice 20 pts cumulative (10 + 10) | ✅ PASS |
| Bob 0 pts cumulative | ✅ PASS |

---

## Scenario 3a — Short delay mid-GAP (under limit)

**Goal:** Server crashes 2 s into a 10 s gap countdown. Restart simulates 5 s elapsed
(5 s remaining). Verify resumed gap tick value and transition to RESULTS when gap
expires.

```
--- Scenario 3a: Short delay mid-GAP (10s gap) ---
  Advanced to Q3 (gap-enabled round).
  Entered GAP phase.
  Server killed 2s into GAP.
  Server restarted (5s gap elapsed, ~5s remaining).
  Resumed gap:tick remaining = 4s
  PASS  S3a: Resumed gap timer is 3-6s
  PASS  S3a: Phase is RESULTS after gap expired
  PASS  S3a: Alice 30pts total
  Scores — Alice: 30, Bob: 0
```

| Assertion | Result |
|-----------|--------|
| Resumed `gap:tick.remainingSeconds` is 3–6 s | ✅ PASS (4 s) |
| Phase transitions to `RESULTS` after gap expires | ✅ PASS |
| Alice 30 pts cumulative | ✅ PASS |

---

## Scenario 3b — Long delay mid-GAP (gap expired during downtime)

**Goal:** Server crashes during gap. Restart simulates 14 s elapsed (past the 10 s
gap). Server auto-resolves to RESULTS on boot.

```
--- Scenario 3b: Long delay mid-GAP (10s gap) ---
  Advanced to Q4 (gap-enabled round).
  Entered GAP phase.
  Server killed mid-GAP.
  Server restarted (14s gap elapsed, expired during downtime).
  PASS  S3b: Phase is RESULTS (auto-resolved on boot)
  PASS  S3b: Alice 40pts total
  PASS  S3b: Bob 0pts total
  Scores — Alice: 40, Bob: 0
```

| Assertion | Result |
|-----------|--------|
| Phase auto-resolved to `RESULTS` on boot | ✅ PASS |
| Alice 40 pts cumulative | ✅ PASS |
| Bob 0 pts cumulative | ✅ PASS |

---

## Scenario 4 — Match 2 isolation

**Goal:** Confirm Match 2 candidates (Eva, Frank) were completely unaffected by all
Match 1 restarts.

```
--- Scenario 4: Match 2 isolation ---
  PASS  S4: Eva 0pts (untouched M2)
  PASS  S4: Frank 0pts (untouched M2)
  Scores — Eva: 0, Frank: 0
```

| Assertion | Result |
|-----------|--------|
| Eva 0 pts | ✅ PASS |
| Frank 0 pts | ✅ PASS |

---

## Bug found & fixed during Phase 8

**File:** `server/test/verify-restart-scenarios.js` (test itself)  
**Bug:** After a server restart, the in-memory admin session-token store is cleared.
The original test reused the pre-crash admin token for post-restart admin socket
connections, causing the admin socket to silently fail authentication and hang
indefinitely at Scenario 2.  
**Fix:** After every server restart, the test re-calls `POST /api/admin/login` to
obtain a fresh admin token before creating a new admin socket.

**File:** `client/src/candidate/CandidateTablet.jsx` (production code, fixed earlier in Phase 7)  
**Bug:** The `connect_error` handler called `setScreen('invalidLink')` for all
errors, including transient transport failures during Wi-Fi drops or server restarts.
This locked the candidate out permanently on reconnect.  
**Fix:** The handler now only shows `InvalidLinkScreen` for authentication errors
(i.e. errors whose message contains `'auth'` or `'token'`); transient transport errors
are silently ignored, allowing Socket.IO's built-in reconnection to proceed.

---

## Summary

All four server-restart scenarios behave correctly per Task 7.1 and Section 17
(Reliability) of the architecture document:

1. **Resumed timers** reflect real wall-clock elapsed time, not a stale full-duration reset.
2. **Expired timers/gaps** are auto-resolved on boot — no double-scoring, no phantom
   rounds.
3. **Post-reconnect lock-ins** during a resumed window are accepted and scored correctly.
4. **Match isolation** is maintained — unrelated matches are not affected by restarts.
