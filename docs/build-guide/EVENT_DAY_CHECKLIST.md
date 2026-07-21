# EVENT DAY CHECKLIST — THE HOT SEAT

**Print this document. Keep it at the Quiz Master's desk. Follow each step in order.**

---

## BEFORE YOU BEGIN

- [ ] All 4 candidate tablets are charged and connected to the school Wi-Fi.
- [ ] The host laptop is charged and connected to the same Wi-Fi.
- [ ] The projector is connected to the host laptop (HDMI / VGA).
- [ ] The `.env` file exists in the project root (one folder above `server/`).
- [ ] `start-quiz.bat` exists in the project root.

---

## PHASE 1 — HARDWARE & NETWORK SETUP

1. [ ] Turn on the Wi-Fi router / hotspot. Wait for the indicator light to go solid.
2. [ ] Connect the host laptop to the Wi-Fi network.
3. [ ] Connect the projector to the host laptop. Press **Win + P** → select **Extend** (not Duplicate).
4. [ ] Open a browser on the host laptop. Type `192.168.1.1` (or your router's IP) in the address bar. Confirm the router admin page loads — this proves the laptop is on the LAN.
5. [ ] On each of the 4 tablets, open Wi-Fi settings. Connect to the same network. Open a browser and type `http://192.168.1.1` — confirm the router page loads on each tablet.

---

## PHASE 2 — FIREWALL CHECK (ONE-TIME)

> If you have already done this once, skip to Phase 3.

1. [ ] On the host laptop, open **Windows Defender Firewall** (search for it in Start).
2. [ ] Click **Advanced settings** (left side).
3. [ ] Click **Inbound Rules** → **New Rule** (right side).
4. [ ] Select **Port** → Next → **TCP** → Specific local ports: `4000` → Next → **Allow the connection** → Next → Check all three (Domain, Private, Public) → Next → Name: `Quiz Server Port 4000` → Finish.

---

## PHASE 3 — LAUNCH THE SERVER

1. [ ] Close any existing terminal / command prompt windows that might be running the server.
2. [ ] Double-click `start-quiz.bat` in the project root.
3. [ ] A black terminal window opens. Wait for this line to appear:

   ```
   Server listening on http://192.168.x.x:4000
   ```

4. [ ] **Write down the IP address here:** `________________:4000`
5. [ ] The server is now running. **Do not close this window.**

---

## PHASE 4 — ADMIN PANEL LOGIN

1. [ ] On the host laptop (or the admin device), open a browser.
2. [ ] Type: `http://localhost:4000/admin`
3. [ ] Enter the admin PIN when prompted.
4. [ ] You should see the **Admin Panel** with tabs: Rounds & Questions, Candidates, Live Control, Settings/Backup.
5. [ ] Click **Rounds & Questions** — confirm that all rounds and questions are listed. Count them: _____ rounds, _____ questions.
6. [ ] Click **Candidates** — confirm all 4 candidates are listed and show as **ACTIVE**.
7. [ ] **QR WARNING:** The QR codes shown here are LIVE and reflect the current network. **Never print QR codes from a previous day.** Always show them on screen and have tablets scan them live.

---

## PHASE 5 — PROVISION CANDIDATE TABLETS

1. [ ] Click **Live Control** in the Admin Panel.
2. [ ] You should see 4 candidate slots. Each should show a name and a status indicator.
3. [ ] On **Tablet 1**, open the browser. Type the join URL shown in the Admin Panel's Candidates tab (or scan the QR code from the Candidates tab). The URL looks like:
   ```
   http://192.168.x.x:4000/play/<candidateId>?token=<joinToken>
   ```
4. [ ] Tablet 1 should show the candidate name and "Waiting for quiz to start."
5. [ ] Repeat for Tablets 2, 3, and 4.
6. [ ] On the Admin Panel Live Control, confirm all 4 candidates show as **connected** (green status).
7. **DO NOT share candidate URLs on the projector.** These contain private join tokens.

---

## PHASE 6 — SELECT MATCH

1. [ ] In the Admin Panel, click **Live Control**.
2. [ ] In the **Match Selector** dropdown (visible when phase is IDLE), you should see all available matches.
3. [ ] Select the match you want to run (e.g., "Rehearsal Grand Quiz").
4. [ ] Confirm the candidate names shown below the selector match the correct teams.
5. [ ] Click **START SELECTED MATCH**.

---

## PHASE 7 — MAIN DISPLAY (PROJECTOR)

1. [ ] On the projector laptop (or the same host laptop), open a new browser tab.
2. [ ] Type: `http://192.168.x.x:4000/display`
3. [ ] The display should show the idle screen ("Get Ready" or school branding).
4. [ ] Press **F11** to enter full-screen mode.
5. [ ] Verify the display is showing on the projector (not just on the laptop screen).

---

## PHASE 8 — RUN THE LIVE MATCH

### Starting a Question
1. [ ] In Admin Panel Live Control, click **NEXT QUESTION**.
2. [ ] The projector shows the question. The tablets show the question with answer options (MCQ) or a "Lock My Answer" button (OPEN).
3. [ ] A countdown timer starts. Watch the lock-in counter: "X/4 locked in."

### Locking In (on tablets)
4. [ ] On a tablet, tap an answer option (MCQ) or "Lock My Answer" (OPEN). The option highlights "Locked" and the timer continues for all candidates.

### Revealing Results
5. [ ] When the timer reaches zero, the admin panel shows results. For MCQ rounds, results are automatic. For OPEN rounds, the admin judges each candidate's spoken answer (Correct / Incorrect buttons).
6. [ ] Click **REVEAL RESULTS** (or the gap interlude runs automatically if enabled).
7. [ ] The projector shows the winner, rankings, and scoreboard.

### Advancing
8. [ ] Click **NEXT QUESTION** to move to the next question, or **END ROUND** to skip to the next round.
8a. **IMPORTANT:** Do NOT click NEXT QUESTION while the "Calculating results..." gap interlude is showing. Either wait for it to finish, or click **SKIP INTERLUDE** first, then click NEXT QUESTION.

### Bug Fix Verification Step A — Mid-Question Join / Reconnect
9. [ ] While a question is actively showing and the timer is ticking:
   - [ ] On Tablet 2, swipe down / pull-to-refresh the browser page.
   - [ ] The tablet should reconnect and show the current question.
   - [ ] If the candidate had already locked in, it should still show "Locked."
   - [ ] The lock-in counter on the admin panel should remain accurate.

### Bug Fix Verification Step B — Candidate Does NOT Lock In
10. [ ] On the next question, let Tablet 3's timer run to zero WITHOUT tapping any answer.
11. [ ] The tablet should show "No Answer" / "Time's Up."
12. [ ] The admin panel should show "No Answer" for that candidate.
13. [ ] The winner is determined among the candidates who did lock in (fastest correct).
14. [ ] Proceed normally — the system should NOT be stuck or show an error.

---

## PHASE 9 — ENDING A MATCH

1. [ ] After the last question of the last round, the admin panel shows the final standings.
2. [ ] Click **END MATCH** in the Live Control header.
3. [ ] The match status changes to **completed**. The final scoreboard is shown on the projector.
4. [ ] Verify the winner name displayed matches the highest-scoring candidate.

### Post-Match Export
5. [ ] Click **Settings/Backup** in the Admin Panel.
6. [ ] Click **Export** to download the post-game results as a JSON file.
7. [ ] Save this file — it is your permanent record of the event.

### Starting the Next Match (if multiple)
8. [ ] Click **Live Control** again.
9. [ ] Select the next match from the dropdown.
10. [ ] Click **START SELECTED MATCH**.
11. [ ] Repeat Phase 8 for the next match.

---

## PHASE 10 — SHUTDOWN

1. [ ] Export a final backup (Settings/Backup → Export) after ALL matches are complete.
2. [ ] Close all browser tabs on tablets and projector.
3. [ ] On the host laptop, go to the server terminal window. Press **Ctrl+C**.
4. [ ] Wait for "Server stopped" message. Close the window.

---

## NEVER DO THIS ON EVENT DAY

> **CRITICAL: Import / Restore will WIPE THE ENTIRE DATABASE.**
>
> The Import button (in Settings/Backup) completely replaces all rounds,
> questions, candidates, matches, and scores with whatever file you give it.
> There is no "undo."
>
> - **Export is SAFE** — you can export at any time, as many times as you want.
> - **Import is DESTRUCTIVE** — never click Import during a live event unless
>   you are doing a deliberate catastrophic recovery before the event starts.
>
> If the quiz is running and something goes wrong, do NOT import. Instead:
> - Refresh the tablet browser.
> - Restart the server (`start-quiz.bat`) — the state is saved in the database.
> - If a tablet disconnects, it will reconnect automatically.

---

## TROUBLESHOOTING

| Problem | Fix |
|---|---|
| Server won't start ("Port 4000 already in use") | Close other terminal windows. Or open Task Manager → End Task on any `node.exe` processes. Then re-run `start-quiz.bat`. |
| Tablet can't connect | Confirm it's on the same Wi-Fi. Try typing `http://<host-ip>:4000` in the tablet browser — if it loads, the network is fine and the issue is the URL. |
| Projector shows "This site can't be reached" | Confirm the display URL is correct (`http://<host-ip>:4000/display`). Check that the projector laptop is on the same Wi-Fi. |
| Admin login fails ("Incorrect PIN") | The PIN is in the `.env` file in the project root. Open it in Notepad to check. |
| Timer seems frozen | The server may have crashed. Close and re-run `start-quiz.bat`. The state will resume exactly where it left off. |
| Candidate locked in wrong answer | There is no "undo lock." After the question ends, the admin can use the score adjustment (+/-) button in Live Control to correct manually. |
| "Request entity too large" on import | The backup file is too large. This is a known bug — contact the developer. |

---

## QUICK REFERENCE — URLS

| Screen | URL | Where to open |
|---|---|---|
| Admin Panel | `http://localhost:4000/admin` | Host laptop browser |
| Main Display | `http://<host-ip>:4000/display` | Projector laptop (F11 full-screen) |
| Candidate Tablet 1 | `http://<host-ip>:4000/play/<id>?token=<token>` | Tablet 1 browser |
| Candidate Tablet 2 | `http://<host-ip>:4000/play/<id>?token=<token>` | Tablet 2 browser |
| Candidate Tablet 3 | `http://<host-ip>:4000/play/<id>?token=<token>` | Tablet 3 browser |
| Candidate Tablet 4 | `http://<host-ip>:4000/play/<id>?token=<token>` | Tablet 4 browser |

Replace `<host-ip>` with the IP written in Phase 3, Step 4.
Candidate URLs are found in Admin Panel → Candidates tab (do NOT share on projector).
