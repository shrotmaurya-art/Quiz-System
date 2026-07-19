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
const CANDIDATES_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'candidates');

function toAdminCandidate(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    logoUrl: candidate.logoUrl,
    score: candidate.score,
    isActive: Boolean(candidate.isActive),
    joinToken: candidate.joinToken,
  };
}

// Deliberate allowlist for unauthenticated responses: never spread candidate here.
function toPublicCandidate(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    logoUrl: candidate.logoUrl,
    score: candidate.score,
    isActive: Boolean(candidate.isActive),
  };
}

function saveLogo(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(CANDIDATES_UPLOAD_DIR, filename);

  fs.mkdirSync(CANDIDATES_UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(destination, file.buffer);

  return `/uploads/candidates/${filename}`;
}

// GET /api/candidates/public
router.get('/public', (req, res) => {
  const candidates = all('SELECT * FROM candidates WHERE isActive = 1 ORDER BY name');
  return res.json(candidates.map(toPublicCandidate));
});

// GET /api/candidates/:id/public
// Public, unauthenticated, token-free self-profile for a single candidate.
// Safe to expose: returns ONLY this candidate's own id/name/logoUrl/score/
// isActive (never joinToken, never any other candidate). Used by the candidate
// tablet waiting screen to show the contestant's own name + logo on connect.
router.get('/:id/public', (req, res) => {
  const candidate = get('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }
  return res.json(toPublicCandidate(candidate));
});

router.use(requireAdmin);

// GET /api/candidates
router.get('/', (req, res) => {
  const candidates = all('SELECT * FROM candidates ORDER BY name');
  return res.json(candidates.map(toAdminCandidate));
});

// POST /api/candidates
router.post('/', (req, res) => {
  const candidate = req.body || {};
  const id = crypto.randomUUID();
  const joinToken = crypto.randomUUID();

  run(
    'INSERT INTO candidates (id, name, logoUrl, score, isActive, joinToken) VALUES (?, ?, ?, ?, ?, ?)',
    [id, candidate.name, candidate.logoUrl === undefined ? null : candidate.logoUrl, 0, 1, joinToken]
  );

  return res.status(201).json(toAdminCandidate(get('SELECT * FROM candidates WHERE id = ?', [id])));
});

// PUT /api/candidates/:id
router.put('/:id', (req, res) => {
  const existingCandidate = get('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
  if (!existingCandidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  const patch = req.body || {};
  const fields = ['name', 'logoUrl'].filter((field) => patch[field] !== undefined);
  if (fields.length > 0) {
    const assignments = fields.map((field) => `${field} = ?`).join(', ');
    run(
      `UPDATE candidates SET ${assignments} WHERE id = ?`,
      [...fields.map((field) => patch[field]), req.params.id]
    );
  }

  return res.json(toAdminCandidate(get('SELECT * FROM candidates WHERE id = ?', [req.params.id])));
});

// DELETE /api/candidates/:id
router.delete('/:id', (req, res) => {
  const candidate = get('SELECT id FROM candidates WHERE id = ?', [req.params.id]);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  run('UPDATE candidates SET isActive = 0 WHERE id = ?', [req.params.id]);
  return res.status(204).end();
});

// POST /api/candidates/:id/logo
router.post('/:id/logo', upload.single('logo'), (req, res) => {
  const candidate = get('SELECT id FROM candidates WHERE id = ?', [req.params.id]);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'A logo file is required.' });
  }

  const logoUrl = saveLogo(req.file);
  run('UPDATE candidates SET logoUrl = ? WHERE id = ?', [logoUrl, req.params.id]);

  return res.json(toAdminCandidate(get('SELECT * FROM candidates WHERE id = ?', [req.params.id])));
});

module.exports = router;
module.exports.toPublicCandidate = toPublicCandidate;
