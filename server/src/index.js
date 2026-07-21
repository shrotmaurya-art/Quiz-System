require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { all, db, run, getGlobalSettings } = require('./db/db');
const app = express();
const PORT = process.env.PORT || 4000;

const roundsRouter = require('./routes/rounds.routes');
const questionsRouter = require('./routes/questions.routes');
const candidatesRouter = require('./routes/candidates.routes');
const adminRouter = require('./routes/admin.routes');
const matchesRouter = require('./routes/matches.routes');
const { handleAdminLogin, requireAdmin } = require('./middleware/auth');
const { initSockets, resumeGameStateOnBoot } = require('./sockets/index');
const { toPublicCandidate } = candidatesRouter;

app.use(express.json({ limit: '5mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/api/admin/login', handleAdminLogin);
app.use('/api/admin', adminRouter);
app.use('/api/rounds', roundsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/matches', matchesRouter);

app.get('/api/scoreboard', (req, res) => {
  const { matchId } = req.query;
  if (!matchId) {
    return res.status(400).json({ error: 'matchId query parameter is required.' });
  }
  const match = all('SELECT id FROM matches WHERE id = ?', [matchId]);
  if (match.length === 0) {
    return res.status(404).json({ error: 'Match not found.' });
  }
  const rows = all(
    `SELECT ms.candidateId AS id, c.name, c.logoUrl, ms.score, c.isActive
     FROM match_scores ms
     JOIN candidates c ON c.id = ms.candidateId
     WHERE ms.matchId = ?
     ORDER BY ms.score DESC, c.rowid ASC`,
    [matchId]
  );
  return res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    logoUrl: r.logoUrl,
    score: r.score,
    isActive: Boolean(r.isActive),
  })));
});

function formatRound(round) {
  return {
    ...round,
    gapEnabled: round.gapEnabled === null ? null : Boolean(round.gapEnabled),
  };
}

function formatQuestion(question) {
  return {
    ...question,
    options: JSON.parse(question.options),
    gapEnabledOverride:
      question.gapEnabledOverride === null
        ? null
        : Boolean(question.gapEnabledOverride),
  };
}

function getExportDocument() {
  return {
    matches: all('SELECT * FROM matches ORDER BY "order"').map((m) => ({ ...m, candidateIds: JSON.parse(m.candidateIds || '[]') })),
    match_scores: all('SELECT * FROM match_scores'),
    rounds: all('SELECT * FROM rounds ORDER BY "order"').map(formatRound),
    questions: all('SELECT * FROM questions ORDER BY roundId, "order"').map(formatQuestion),
    candidates: all('SELECT * FROM candidates ORDER BY name'),
  };
}

function toDatabaseBoolean(value) {
  return value === null ? null : Number(Boolean(value));
}

function validateImportDocument(document) {
  if (
    !document ||
    !Array.isArray(document.rounds) ||
    !Array.isArray(document.questions) ||
    !Array.isArray(document.candidates)
  ) {
    return 'Import body must contain rounds, questions, and candidates arrays.';
  }

  if (document.questions.some((question) => !Array.isArray(question.options))) {
    return 'Each imported question must contain an options array.';
  }

  return null;
}

const restoreData = db.transaction((document) => {
  run('DELETE FROM score_log');
  run('DELETE FROM game_state');
  run('DELETE FROM questions');
  run('DELETE FROM rounds');
  run('DELETE FROM match_scores');
  run('DELETE FROM matches');
  run('DELETE FROM candidates');

  // Re-insert default IDLE game state so getGameState() never returns null
  run(
    `INSERT INTO game_state (id, phase, locks, judgements, resultsRevealed)
     VALUES (1, 'IDLE', '{}', '{}', 0)`
  );

  for (const candidate of document.candidates) {
    run(
      'INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
      [
        candidate.id,
        candidate.name,
        candidate.logoUrl,
        candidate.score,
        toDatabaseBoolean(candidate.isActive),
        candidate.joinToken,
      ]
    );
  }

  const hasMatches = document.matches && Array.isArray(document.matches) && document.matches.length > 0;
  let autoMatchId = null;

  if (hasMatches) {
    for (const m of document.matches) {
      run(
        `INSERT INTO matches (id, name, "order", candidateIds, status, winnerCandidateId)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          m.id,
          m.name,
          m.order,
          JSON.stringify(m.candidateIds || []),
          m.status || 'not_started',
          m.winnerCandidateId || null
        ]
      );
    }
  } else {
    autoMatchId = crypto.randomUUID();
    const candidateIds = document.candidates.map(c => c.id);
    run(
      `INSERT INTO matches (id, name, "order", candidateIds, status, winnerCandidateId)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        autoMatchId,
        'Match 1',
        1,
        JSON.stringify(candidateIds),
        'not_started',
        null
      ]
    );
  }

  const hasScores = document.match_scores && Array.isArray(document.match_scores) && document.match_scores.length > 0;
  if (hasScores) {
    for (const ms of document.match_scores) {
      run(
        `INSERT INTO match_scores (matchId, candidateId, score)
         VALUES (?, ?, ?)`,
        [ms.matchId, ms.candidateId, ms.score]
      );
    }
  } else if (autoMatchId) {
    for (const c of document.candidates) {
      run(
        `INSERT INTO match_scores (matchId, candidateId, score)
         VALUES (?, ?, ?)`,
        [autoMatchId, c.id, c.score || 0]
      );
    }
  }

  for (const round of document.rounds) {
    run(
      `INSERT INTO rounds (
        id, name, "order", answerMode, pointsPerQuestion,
        timeLimitSeconds, gapEnabled, gapSeconds, instructions, matchId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        round.id,
        round.name,
        round.order,
        round.answerMode,
        round.pointsPerQuestion,
        round.timeLimitSeconds,
        toDatabaseBoolean(round.gapEnabled),
        round.gapSeconds,
        round.instructions,
        round.matchId || autoMatchId || null,
      ]
    );
  }

  for (const question of document.questions) {
    run(
      `INSERT INTO questions (
        id, roundId, "order", text, mediaType, mediaUrl, options,
        correctOptionKey, pointsOverride, timeLimitOverrideSeconds,
        gapEnabledOverride, gapSecondsOverride
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question.id,
        question.roundId,
        question.order,
        question.text,
        question.mediaType,
        question.mediaUrl,
        JSON.stringify(question.options),
        question.correctOptionKey,
        question.pointsOverride,
        question.timeLimitOverrideSeconds,
        toDatabaseBoolean(question.gapEnabledOverride),
        question.gapSecondsOverride,
      ]
    );
  }
});

// Exports contain join tokens and are therefore protected by the admin session.
app.get('/api/export', requireAdmin, (req, res) => {
  return res.json(getExportDocument());
});

app.post('/api/import', requireAdmin, (req, res) => {
  const importError = validateImportDocument(req.body);
  if (importError) {
    return res.status(400).json({ error: importError });
  }

  try {
    restoreData(req.body);
  } catch (error) {
    return res.status(400).json({ error: `Import failed: ${error.message}` });
  }

  return res.json(getExportDocument());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', lanIp: getLanAddress() });
});

app.get('/api/settings/branding', (req, res) => {
  const settings = getGlobalSettings();
  return res.json({
    schoolName: settings.schoolName || 'Quiz Competition',
    brandLogoUrl: settings.brandLogoUrl || null,
    brandColor: settings.brandColor || null,
    soundEffectsEnabled: settings.soundEffectsEnabled !== 0,
  });
});

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    const address = addresses.find((entry) => entry.family === 'IPv4' && !entry.internal);
    if (address) return address.address;
  }

  return 'localhost';
}

// Production: serve the built client from client/dist/ (after `npm run build` in client/).
// When the directory doesn't exist (local dev with Vite on 5173), this is skipped entirely.
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA catch-all: any GET that wasn't matched by /api/* or /uploads above
  // gets index.html so client-side routes (/display, /admin, /play/:id, etc.) resolve.
  // Express 5 requires the {*path} syntax for catch-all routes.
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  console.log(`Serving client from ${clientDistPath}`);
} else {
  console.log('client/dist not found — skipping static serving (use Vite dev server on port 5173)');
}

const server = app.listen(PORT, '0.0.0.0', () => {
  const lanUrl = `http://${getLanAddress()}:${PORT}`;
  console.log('\n***************************************************************');
  console.log(`* LAN QUIZ URL: ${lanUrl}`);
  console.log(`* DISPLAY:      ${lanUrl}/display`);
  console.log(`* ADMIN:        ${lanUrl}/admin`);
  console.log('***************************************************************\n');
  console.log(`Server listening on ${lanUrl}`);
  console.log(`Server running — try http://localhost:${PORT}/api/health`);
});

const io = initSockets(server);
resumeGameStateOnBoot(io);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill whatever's holding it (see PID via 'netstat -ano | findstr :${PORT}') and try again.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});
