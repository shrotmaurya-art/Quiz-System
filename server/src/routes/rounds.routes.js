'use strict';

const crypto = require('crypto');
const express = require('express');
const { db, all, get, run } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ROUND_FIELDS = [
  'matchId',
  'name',
  'order',
  'answerMode',
  'pointsPerQuestion',
  'timeLimitSeconds',
  'gapEnabled',
  'gapSeconds',
  'instructions',
];

function isValidAnswerMode(answerMode) {
  return answerMode === 'MCQ' || answerMode === 'OPEN';
}

function formatRound(round) {
  if (!round) return round;

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

function toDatabaseValue(field, value) {
  if (field === 'gapEnabled' && value !== null) {
    return Number(value);
  }

  return value;
}

router.use(requireAdmin);

// GET /api/rounds
router.get('/', (req, res) => {
  const { matchId } = req.query;

  if (matchId) {
    const rounds = all(`
      SELECT rounds.*, COUNT(questions.id) AS questionCount
      FROM rounds
      LEFT JOIN questions ON questions.roundId = rounds.id
      WHERE rounds.matchId = ?
      GROUP BY rounds.id
      ORDER BY rounds."order"
    `, [matchId]);
    return res.json(rounds.map(formatRound));
  }

  const rounds = all(`
    SELECT rounds.*, COUNT(questions.id) AS questionCount
    FROM rounds
    LEFT JOIN questions ON questions.roundId = rounds.id
    GROUP BY rounds.id
    ORDER BY rounds."order"
  `);

  return res.json(rounds.map(formatRound));
});

// POST /api/rounds
router.post('/', (req, res) => {
  const round = req.body || {};

  if (!round.matchId || typeof round.matchId !== 'string') {
    return res
      .status(400)
      .json({ error: 'matchId is required and must be a string.' });
  }

  const match = get('SELECT id FROM matches WHERE id = ?', [round.matchId]);
  if (!match) {
    return res
      .status(400)
      .json({ error: 'Match not found.' });
  }

  if (!isValidAnswerMode(round.answerMode)) {
    return res
      .status(400)
      .json({ error: "answerMode must be either 'MCQ' or 'OPEN'." });
  }

  const id = crypto.randomUUID();

  // Auto-compute order if not provided (MAX(order)+1, or 1 if no rounds exist)
  let order = round.order;
  if (order === undefined || order === null) {
    const maxRow = get('SELECT MAX("order") AS maxOrder FROM rounds WHERE matchId = ?', [round.matchId]);
    order = (maxRow?.maxOrder ?? 0) + 1;
  }

  run(
    `INSERT INTO rounds (
      id, matchId, name, "order", answerMode, pointsPerQuestion,
      timeLimitSeconds, gapEnabled, gapSeconds, instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      round.matchId,
      round.name,
      order,
      round.answerMode,
      round.pointsPerQuestion === undefined ? 10 : round.pointsPerQuestion,
      round.timeLimitSeconds === undefined ? null : round.timeLimitSeconds,
      round.gapEnabled === undefined ? null : toDatabaseValue('gapEnabled', round.gapEnabled),
      round.gapSeconds === undefined ? null : round.gapSeconds,
      round.instructions === undefined ? null : round.instructions,
    ]
  );

  return res.status(201).json(formatRound(get('SELECT * FROM rounds WHERE id = ?', [id])));
});

// PUT /api/rounds/:id
router.put('/:id', (req, res) => {
  const existingRound = get('SELECT * FROM rounds WHERE id = ?', [req.params.id]);
  if (!existingRound) {
    return res.status(404).json({ error: 'Round not found.' });
  }

  const patch = req.body || {};
  if (patch.answerMode !== undefined && !isValidAnswerMode(patch.answerMode)) {
    return res
      .status(400)
      .json({ error: "answerMode must be either 'MCQ' or 'OPEN'." });
  }

  if (patch.matchId !== undefined) {
    if (typeof patch.matchId !== 'string') {
      return res.status(400).json({ error: 'matchId must be a string.' });
    }
    const match = get('SELECT id FROM matches WHERE id = ?', [patch.matchId]);
    if (!match) {
      return res.status(400).json({ error: 'Match not found.' });
    }
  }

  const fields = ROUND_FIELDS.filter((field) => patch[field] !== undefined);
  if (fields.length > 0) {
    const assignments = fields
      .map((field) => (field === 'order' ? '"order" = ?' : `${field} = ?`))
      .join(', ');
    run(
      `UPDATE rounds SET ${assignments} WHERE id = ?`,
      [...fields.map((field) => toDatabaseValue(field, patch[field])), req.params.id]
    );
  }

  return res.json(formatRound(get('SELECT * FROM rounds WHERE id = ?', [req.params.id])));
});

// DELETE /api/rounds/:id
router.delete('/:id', (req, res) => {
  const existingRound = get('SELECT * FROM rounds WHERE id = ?', [req.params.id]);
  if (!existingRound) {
    return res.status(404).json({ error: 'Round not found.' });
  }

  const deleteRoundAndQuestions = db.transaction((roundId) => {
    run('DELETE FROM questions WHERE roundId = ?', [roundId]);
    run('DELETE FROM rounds WHERE id = ?', [roundId]);
  });
  deleteRoundAndQuestions(req.params.id);

  return res.status(204).end();
});

// GET /api/rounds/:id/questions
router.get('/:id/questions', (req, res) => {
  const round = get('SELECT id FROM rounds WHERE id = ?', [req.params.id]);
  if (!round) {
    return res.status(404).json({ error: 'Round not found.' });
  }

  // This route is protected by requireAdmin so correctOptionKey is safe here.
  const questions = all(
    'SELECT * FROM questions WHERE roundId = ? ORDER BY "order"',
    [req.params.id]
  );
  return res.json(questions.map(formatQuestion));
});

module.exports = router;
