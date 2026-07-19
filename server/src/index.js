require('dotenv').config();

const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const { all, db, run } = require('./db/db');
const app = express();
const PORT = process.env.PORT || 4000;

const roundsRouter = require('./routes/rounds.routes');
const questionsRouter = require('./routes/questions.routes');
const candidatesRouter = require('./routes/candidates.routes');
const { handleAdminLogin, requireAdmin } = require('./middleware/auth');
const initSockets = require('./sockets/index');
const { toPublicCandidate } = candidatesRouter;

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.post('/api/admin/login', handleAdminLogin);
app.use('/api/rounds', roundsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/candidates', candidatesRouter);

app.get('/api/scoreboard', (req, res) => {
  const candidates = all('SELECT * FROM candidates ORDER BY score DESC, name ASC');
  return res.json(candidates.map(toPublicCandidate));
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
  run('DELETE FROM candidates');

  // Re-insert default IDLE game state so getGameState() never returns null
  run(
    `INSERT INTO game_state (id, phase, locks, judgements, resultsRevealed)
     VALUES (1, 'IDLE', '{}', '{}', 0)`
  );

  for (const round of document.rounds) {
    run(
      `INSERT INTO rounds (
        id, name, "order", answerMode, pointsPerQuestion,
        timeLimitSeconds, gapEnabled, gapSeconds, instructions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  res.json({ status: 'ok' });
});

function getLanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    const address = addresses.find((entry) => entry.family === 'IPv4' && !entry.internal);
    if (address) return address.address;
  }

  return 'localhost';
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://${getLanAddress()}:${PORT}`);
  console.log(`Server running — try http://localhost:${PORT}/api/health`);
});

initSockets(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill whatever's holding it (see PID via 'netstat -ano | findstr :${PORT}') and try again.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});
