# Dry-Run Checklist

Printable, checkbox-style checklist for rehearsing the quiz system end-to-end.
Combine this with the LAN setup steps (`lan-setup-steps.md`) before the first dry run.

---

## Pre-Flight

- [ ] Host laptop is powered on and connected to the Wi-Fi router/hotspot (no internet needed).
- [ ] All 4 candidate tablets are powered on and connected to the same Wi-Fi network.
- [ ] Admin device (phone/laptop) is connected to the same Wi-Fi network.
- [ ] Projector (or external display) is connected to the host laptop.

## Power On & Start Server

- [ ] Double-click the start script (`start-quiz.bat` / `start-quiz.sh`).
- [ ] Console shows server running confirmation, e.g. `Server listening on http://192.168.x.x:4000`.
- [ ] Note the LAN IP printed in the console — this is the `<host-ip>` used below.

## Open Main Display

- [ ] On the host laptop (or projector-connected laptop), open `http://<host-ip>:4000/display`.
- [ ] Put the browser in full-screen mode (F11 or browser full-screen).
- [ ] Confirm the display shows the idle/welcome screen.

## Open Admin Panel

- [ ] On the admin device, open `http://<host-ip>:4000/admin`.
- [ ] Enter the admin PIN and log in.
- [ ] Confirm the Admin Panel loads and shows the navigation sidebar.

## Connect Candidate Tablets

- [ ] On each of the 4 tablets, open the pre-set candidate URL (or scan the printed/admin-shown QR code).
- [ ] Confirm each tablet shows the correct candidate name.

## Verify Connections (Live Control)

- [ ] In Admin Panel, navigate to **Live Control**.
- [ ] Confirm all 4 candidates show as "connected" (green indicator for each).
- [ ] If any show as disconnected, check Wi-Fi and refresh the tablet's browser.

## Create and Start a Match (Phase 5.6)

- [ ] In Live Control, the **Choose a Match** screen is visible (phase = IDLE).
- [ ] Select the desired match from the dropdown.
- [ ] Confirm the candidate list shown matches the expected participants.
- [ ] Click **START SELECTED MATCH**.
- [ ] Confirm the phase badge changes from IDLE to the active game phase.
- [ ] Confirm the Main Display shows the first question (or round intro).

## Play Through the Match

For each question:
- [ ] Confirm the question text and options (if MCQ) appear on the Main Display.
- [ ] On each tablet, confirm the question is visible and the timer is counting down.
- [ ] Candidates lock in their answers at different times — confirm each tablet's lock-in is registered on Live Control (Responses panel shows X/4 locked).
- [ ] When the timer expires (or admin clicks **End Timer Now**), confirm the gap interlude or results screen appears.
- [ ] Click **Reveal Answer** (or wait for auto-reveal) — confirm correct answer is highlighted on the Main Display.
- [ ] For OPEN rounds: use the Judging Queue in Live Control to mark each response as Correct or Incorrect.
- [ ] Use **Manual Score Adjustment** if needed (pencil icon next to a candidate's score).
- [ ] Click **NEXT** (or **ADVANCE TO NEXT QUESTION**) to proceed to the next question.
- [ ] Repeat for all questions across all rounds.

## End the Match

- [ ] After the final question, confirm the Main Display shows the final scoreboard/winner automatically (phase = QUIZ_ENDED).
- [ ] In Live Control, click **END MATCH**.
- [ ] Confirm the match status changes to "completed" in the Matches tab.

## Post-Match Verification

- [ ] In the Matches tab, confirm the completed match shows the correct final standings.
- [ ] Start a second match (if applicable) — confirm only one match can be active at a time.
- [ ] Confirm the scoreboard on the Main Display resets appropriately for the new match.

---

## Deliberate Failure Tests

Run these during a rehearsal to verify the system handles edge cases gracefully.

### Tablet Disconnect / Reconnect

- [ ] While a question is active, turn off Wi-Fi on one tablet.
- [ ] Confirm the other 3 tablets continue to function normally.
- [ ] Confirm the disconnected tablet shows a connection-lost or retry indicator.
- [ ] Re-enable Wi-Fi on the tablet. Confirm it reconnects and syncs to the current game state.
- [ ] Confirm the reconnected tablet can still lock in an answer (if the timer is still running).

### Server Restart (Short Delay)

- [ ] While a question is active, kill the server process (Ctrl+C or close the terminal).
- [ ] Within 10 seconds, restart the server (re-run the start script).
- [ ] Confirm all connected clients (admin, display, tablets) reconnect automatically.
- [ ] Confirm the game state resumes correctly (same question, same timer position approximately).
- [ ] Confirm no duplicate scoring or data corruption occurred.

### Server Restart (Long Delay)

- [ ] While a question is active, kill the server process.
- [ ] Wait 30+ seconds, then restart the server.
- [ ] Confirm all clients reconnect.
- [ ] Confirm the game state resumes (timer may have expired server-side during downtime).
- [ ] Confirm the system is playable from where it left off without manual intervention.

### Near-Simultaneous Lock-Ins

- [ ] On two tablets, have candidates lock in their answers within 100ms of each other (use the "3, 2, 1, GO" countdown).
- [ ] Confirm both lock-ins are registered (Live Control shows X/4 locked incremented correctly).
- [ ] Confirm the response times are recorded accurately and the faster candidate is ranked first.
- [ ] Confirm no crash, deadlock, or lost answers occurred.

### Rapid Next Clicks

- [ ] While on a results screen, click **NEXT** three times in rapid succession (< 500ms between clicks).
- [ ] Confirm the system advances only one question (no skipping ahead).
- [ ] Confirm no error alerts or state corruption occurred.
- [ ] Repeat during a gap interlude — click **SKIP INTERLUDE** rapidly and confirm only one advance happens.
