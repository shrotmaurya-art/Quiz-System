'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { all, get, run } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const QUESTIONS_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'questions');

const QUESTION_FIELDS = [
  'roundId',
  'order',
  'text',
  'mediaType',
  'options',
  'correctOptionKey',
  'pointsOverride',
  'timeLimitOverrideSeconds',
  'gapEnabledOverride',
  'gapSecondsOverride',
];

function isValidMediaType(mediaType) {
  return mediaType === 'none' || mediaType === 'image' || mediaType === 'video';
}

function parseOptions(options) {
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      throw new Error('options must be a valid JSON array.');
    }
  }

  if (!Array.isArray(options)) {
    throw new Error('options must be an array.');
  }

  return options;
}

function formatQuestion(question) {
  if (!question) return question;

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
  if (field === 'gapEnabledOverride' && value !== null) {
    if (value === 'true' || value === true) return 1;
    if (value === 'false' || value === false) return 0;
    return Number(value);
  }

  if (field === 'correctOptionKey') {
    return value == null ? null : String(value);
  }

  return value;
}

function saveMedia(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(QUESTIONS_UPLOAD_DIR, filename);

  fs.mkdirSync(QUESTIONS_UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(destination, file.buffer);

  return `/uploads/questions/${filename}`;
}

function validateMedia(mediaType, mediaUrl) {
  if (!isValidMediaType(mediaType)) {
    return "mediaType must be 'none', 'image', or 'video'.";
  }

  if (mediaType === 'none' && mediaUrl !== null) {
    return "mediaUrl must be null when mediaType is 'none'.";
  }

  if (mediaType !== 'none' && !mediaUrl) {
    return "mediaUrl must be set after uploading image or video media.";
  }

  return null;
}

router.use(requireAdmin);

// POST /api/questions
router.post('/', upload.single('media'), (req, res) => {
  const question = req.body || {};
  const mediaType = question.mediaType;
  const mediaError = validateMedia(
    mediaType,
    mediaType === 'none' ? null : req.file ? '/pending-upload' : null
  );
  if (mediaError) {
    return res.status(400).json({ error: mediaError });
  }
  if (mediaType === 'none' && req.file) {
    return res.status(400).json({ error: "No media file is allowed when mediaType is 'none'." });
  }

  let options;
  try {
    options = parseOptions(question.options === undefined ? [] : question.options);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const round = get('SELECT id FROM rounds WHERE id = ?', [question.roundId]);
  if (!round) {
    return res.status(404).json({ error: 'Round not found.' });
  }

  const mediaUrl = req.file ? saveMedia(req.file) : null;

  const maxOrder = get(
    'SELECT MAX("order") AS maxOrder FROM questions WHERE roundId = ?',
    [question.roundId]
  );
  const nextOrder = (maxOrder?.maxOrder ?? 0) + 1;

  const id = crypto.randomUUID();
  run(
    `INSERT INTO questions (
      id, roundId, "order", text, mediaType, mediaUrl, options,
      correctOptionKey, pointsOverride, timeLimitOverrideSeconds,
      gapEnabledOverride, gapSecondsOverride
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      question.roundId,
      question.order != null ? question.order : nextOrder,
      question.text,
      mediaType,
      mediaUrl,
      JSON.stringify(options),
      question.correctOptionKey === undefined || question.correctOptionKey === null ? null : String(question.correctOptionKey),
      question.pointsOverride === undefined ? null : question.pointsOverride,
      question.timeLimitOverrideSeconds === undefined
        ? null
        : question.timeLimitOverrideSeconds,
      question.gapEnabledOverride === undefined
        ? null
        : toDatabaseValue('gapEnabledOverride', question.gapEnabledOverride),
      question.gapSecondsOverride === undefined ? null : question.gapSecondsOverride,
    ]
  );

  return res.status(201).json(formatQuestion(get('SELECT * FROM questions WHERE id = ?', [id])));
});

// PUT /api/questions/:id
router.put('/:id', (req, res) => {
  const existingQuestion = get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!existingQuestion) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const patch = req.body || {};
  const mediaType = patch.mediaType === undefined ? existingQuestion.mediaType : patch.mediaType;
  const mediaUrl = mediaType === 'none' ? null : existingQuestion.mediaUrl;
  console.log('[PUT /:id]', req.params.id, 'patch.mediaType:', patch.mediaType, 'existing.mediaType:', existingQuestion.mediaType, 'existing.mediaUrl:', existingQuestion.mediaUrl, 'computed mediaType:', mediaType, 'computed mediaUrl:', mediaUrl);
  const mediaError = validateMedia(mediaType, mediaUrl);
  if (mediaError) {
    return res.status(400).json({ error: mediaError });
  }

  let options;
  if (patch.options !== undefined) {
    try {
      options = parseOptions(patch.options);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  const fields = QUESTION_FIELDS.filter((field) => patch[field] !== undefined);
  const values = fields.map((field) => {
    if (field === 'options') return JSON.stringify(options);
    return toDatabaseValue(field, patch[field]);
  });

  if (patch.mediaType === 'none') {
    fields.push('mediaUrl');
    values.push(null);
  }

  if (fields.length > 0) {
    const assignments = fields
      .map((field) => (field === 'order' ? '"order" = ?' : `${field} = ?`))
      .join(', ');
    run(`UPDATE questions SET ${assignments} WHERE id = ?`, [...values, req.params.id]);
  }

  return res.json(formatQuestion(get('SELECT * FROM questions WHERE id = ?', [req.params.id])));
});

// DELETE /api/questions/:id
router.delete('/:id', (req, res) => {
  const question = get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!question) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  run('DELETE FROM score_log WHERE questionId = ?', [req.params.id]);
  run('DELETE FROM questions WHERE id = ?', [req.params.id]);

  if (question.mediaUrl) {
    const filePath = path.join(__dirname, '..', question.mediaUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  return res.status(204).end();
});

// POST /api/questions/:id/media
router.post('/:id/media', upload.single('media'), (req, res) => {
  const question = get('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!question) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'A media file is required.' });
  }

  const mediaType = req.body && req.body.mediaType;
  console.log('[POST /:id/media]', req.params.id, 'mediaType:', mediaType, 'file:', req.file?.originalname);
  if (mediaType !== 'image' && mediaType !== 'video') {
    return res
      .status(400)
      .json({ error: "mediaType must be 'image' or 'video' when uploading media." });
  }

  const mediaUrl = saveMedia(req.file);
  run('UPDATE questions SET mediaType = ?, mediaUrl = ? WHERE id = ?', [
    mediaType,
    mediaUrl,
    req.params.id,
  ]);

  return res.json(formatQuestion(get('SELECT * FROM questions WHERE id = ?', [req.params.id])));
});

module.exports = router;
