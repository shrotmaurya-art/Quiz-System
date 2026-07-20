# Phase 7 Lifecycle Test Log

**Status:** Not run in this environment.

Phase 7 requires a manual end-to-end run with the real development app open as
Admin, Display, and at least two independently connected candidate tablets. This
coding session has no interactive browser/tablet controls, and no reachable dev
server was available to drive during the check. The entries below are deliberately
not marked as passing or failing until that run is performed.

| Scenario | Status | Manual observation required |
|---|---|---|
| 1. Image question through RESULTS | NOT RUN | Confirm image appears on Display and candidates, countdown/lock-ins stay synchronized, and RESULTS is reached. |
| 2. Video question through RESULTS | NOT RUN | Confirm Display plays the muted autoplay video; candidates receive no video player or audio and show “Watch the main screen”; confirm the timer completes independently of video length. |
| 3. Time-limit and gap overrides | NOT RUN | Confirm `timeLimitOverrideSeconds` supersedes round/global defaults and `gapEnabledOverride: false` supersedes an enabled round default. |
| 4. `admin:endTimerNow` behavior | NOT RUN | Confirm the Admin confirmation step, `no_answer` marking for unlocked candidates, natural-flow-equivalent GAP/JUDGING transition, and no effect when pressed during GAP or RESULTS. |
| 5. Gap disabled/enabled behavior | NOT RUN | Confirm a disabled gap transitions directly from time-up to results and an enabled gap shows the suspense screen for its configured duration. |

## Completion prerequisites

1. Start the real development server and open Admin, Display, and two candidate
   sessions on the LAN.
2. Configure dedicated image/video and override test questions without modifying
   production question data.
3. Replace each `NOT RUN` status with `PASS` or `FAIL`, including observed timer
   values, gap duration, and any discrepancy.
