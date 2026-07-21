# Backup & Restore Guide

**For:** The Quiz Master / event organiser (non-technical)
**When to use:** Before the event (backup) and if something goes wrong (restore)

---

## What is a backup?

A backup is a single file (`quiz-backup.json`) that contains **everything**:
all your rounds, questions, answer options, candidates, matches, and scores.
If the quiz system breaks or the database gets wiped, you can restore from
this file and be back exactly where you were — every question, every score,
every candidate — field for field.

---

## Part A — Making a backup (do this BEFORE the event, and again after loading data)

### Step 1 — Open the Admin Panel

On the laptop connected to the projector, open a browser and go to:

```
http://localhost:4000/admin
```

(Or use the LAN address shown in the console when the server started.)

Enter the admin PIN when prompted.

### Step 2 — Export your data

1. In the Admin Panel, go to the **Settings / Backup** tab.
2. Click the **Export** button (it may say "Download Backup").
3. Your browser will download a file called `quiz-backup.json` (or similar).
4. **Copy this file to a USB stick, your Desktop, or any safe location outside
   the quiz folder.** This is your safety net.

> **Tip:** Make a backup right after you finish loading all questions and
> candidates, and again after every major change. The backup file is small
> (about 100 KB for a full quiz) — email it to yourself if you want a cloud copy.

---

## Part B — Restoring a backup (use this if something went wrong)

> **Panic level: normal.** The restore takes about 10 seconds. Nothing is lost
> as long as you have the backup file.

### What "restore" does

It **completely replaces** everything in the quiz system with what was in the
backup file. All current rounds, questions, candidates, matches, and scores
are wiped first, then the backup data is loaded. This is intentional — it
guarantees the restored data is exactly what you exported, with no leftover
junk.

### Step 1 — Make sure the server is running

If you see "This site can't be reached" in the browser, open a terminal and
run:

```
cd server
node --env-file=../.env src/index.js
```

You should see lines like:
```
* LAN QUIZ URL: http://192.168.x.x:4000
* ADMIN:        http://192.168.x.x:4000/admin
```

If you see `Port 4000 is already in use`, the server is already running —
that's fine, skip to Step 2.

### Step 2 — Open the Admin Panel

In a browser on the same laptop, go to:

```
http://localhost:4000/admin
```

Enter the admin PIN.

### Step 3 — Import the backup

1. Go to the **Settings / Backup** tab.
2. Click **Import** (it may say "Restore from Backup" or show a file picker).
3. Select your `quiz-backup.json` file.
4. Confirm when asked.
5. The system will wipe the current data and load the backup. You should see
   a confirmation message, and the rounds/candidates list should reappear.

### Step 4 — Verify it worked

Quick sanity check:
- Go to **Rounds & Questions** — all your rounds and questions should be there.
- Go to **Candidates** — all four candidates should be listed.
- Start the quiz briefly (or go to the **Live Control** tab) — the question
  should display normally on the projector and candidate tablets.

That's it. You're back.

---

## Troubleshooting

### "Request entity too large" error during import

This means your backup file is bigger than the server expects. This was a
known bug fixed in the codebase — make sure you are running the latest
version of `server/src/index.js`. If you see this error and you're on the
latest code, the question bank is unusually large — contact the developer.

### "Import failed: Import body must contain rounds, questions, and candidates arrays"

The file you selected is not a valid quiz backup. Make sure you're picking
the `quiz-backup.json` file downloaded from the Export button — not some
other file.

### The server won't start

1. Make sure you're in the `server/` folder.
2. Make sure Node.js is installed (type `node --version` — if you get an
   error, install Node from https://nodejs.org).
3. Make sure the `.env` file is in the project root (one folder up from
   `server/`). It should contain `ADMIN_PIN=...`.

### I lost the backup file

If you have the USB stick or email copy, use that. If not, and the server
is still running, you can export from the Admin Panel before doing anything
else — the data is still in the live database.

---

## Quick-reference card (print this and keep it at the event)

| Situation | What to do |
|---|---|
| **Before event** | Export backup → save to USB → keep USB safe |
| **Something broke** | Restore from USB backup → re-export fresh backup |
| **New question bank next year** | Edit questions in Admin Panel → export new backup |
| **Server won't start** | `cd server && node --env-file=../.env src/index.js` |
| **"Port already in use"** | Close the other terminal running the server, or restart it |
