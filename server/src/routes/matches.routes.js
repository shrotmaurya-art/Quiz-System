'use strict';

const crypto = require('crypto');
const express = require('express');
const { db, all, get, run } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function formatMatch(match) {
  if (!match) return match;
  return {
    ...match,
    candidateIds: JSON.parse(match.candidateIds || '[]'),
  };
}

/**
 * If game_state currently references the given matchId, reset it to IDLE so
 * dangling FK references (currentQuestionId, currentRoundId) don't cause
 * crashes when the match's data is cascade-deleted or its candidates change.
 */
function resetGameStateIfActive(matchId) {
  const gs = get('SELECT matchId FROM game_state WHERE id = 1');
  if (gs && gs.matchId === matchId) {
    run(
      `UPDATE game_state SET
        phase = 'IDLE',
        currentRoundId = NULL,
        currentQuestionId = NULL,
        timerStartedAt = NULL,
        gapStartedAt = NULL,
        timeLimitSeconds = 30,
        gapEnabled = 1,
        gapSeconds = 10,
        locks = '{}',
        judgements = '{}',
        winnerCandidateId = NULL,
        resultsRevealed = 0,
        matchId = NULL
      WHERE id = 1`
    );
  }
}

// GET /api/matches/:id/scoreboard — PUBLIC, no auth
// Returns match_scores joined with candidate name/logo, same public-safe shape
// as /api/candidates/public (no joinToken).
router.get('/:id/scoreboard', (req, res) => {
  const match = get('SELECT id FROM matches WHERE id = ?', [req.params.id]);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  const rows = all(
    `SELECT ms.candidateId AS id, c.name, c.logoUrl, ms.score, c.isActive
     FROM match_scores ms
     JOIN candidates c ON c.id = ms.candidateId
     WHERE ms.matchId = ?
     ORDER BY ms.score DESC, c.rowid ASC`,
    [req.params.id]
  );

  return res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl,
      score: r.score,
      isActive: Boolean(r.isActive),
    }))
  );
});

// All remaining routes require admin auth
router.use(requireAdmin);

// GET /api/matches — list all matches
router.get('/', (req, res) => {
  const matches = all('SELECT * FROM matches ORDER BY "order" ASC');
  return res.json(matches.map(formatMatch));
});

// POST /api/matches — create a match
router.post('/', (req, res) => {
  const { name, candidateIds } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Match name is required.' });
  }
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return res.status(400).json({ error: 'candidateIds must be a non-empty array.' });
  }

  // Validate all candidate IDs exist and are active
  for (const cid of candidateIds) {
    const candidate = get('SELECT id FROM candidates WHERE id = ? AND isActive = 1', [cid]);
    if (!candidate) {
      return res.status(400).json({ error: `Candidate "${cid}" not found or inactive.` });
    }
  }

  const id = crypto.randomUUID();
  const maxRow = get('SELECT MAX("order") AS maxOrder FROM matches');
  const order = (maxRow?.maxOrder ?? 0) + 1;

  const createMatch = db.transaction(() => {
    run(
      `INSERT INTO matches (id, name, "order", candidateIds, status) VALUES (?, ?, ?, ?, ?)`,
      [id, name.trim(), order, JSON.stringify(candidateIds), 'not_started']
    );

    // Create match_scores rows for each candidate (score starts at 0)
    for (const cid of candidateIds) {
      run(
        'INSERT INTO match_scores (matchId, candidateId, score) VALUES (?, ?, 0)',
        [id, cid]
      );
    }
  });
  createMatch();

  return res.status(201).json(formatMatch(get('SELECT * FROM matches WHERE id = ?', [id])));
});

// PUT /api/matches/:id — edit match (name, candidateIds) before it starts
router.put('/:id', (req, res) => {
  const match = get('SELECT * FROM matches WHERE id = ?', [req.params.id]);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }
  if (match.status !== 'not_started') {
    return res.status(400).json({ error: 'Cannot edit a match that has already started or completed.' });
  }

  const patch = req.body || {};

  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || patch.name.trim().length === 0) {
      return res.status(400).json({ error: 'Match name must be a non-empty string.' });
    }
    run('UPDATE matches SET name = ? WHERE id = ?', [patch.name.trim(), req.params.id]);
  }

  if (patch.candidateIds !== undefined) {
    if (!Array.isArray(patch.candidateIds) || patch.candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array.' });
    }
    for (const cid of patch.candidateIds) {
      const candidate = get('SELECT id FROM candidates WHERE id = ? AND isActive = 1', [cid]);
      if (!candidate) {
        return res.status(400).json({ error: `Candidate "${cid}" not found or inactive.` });
      }
    }

    const updateCandidates = db.transaction(() => {
      run('UPDATE matches SET candidateIds = ? WHERE id = ?', [
        JSON.stringify(patch.candidateIds),
        req.params.id,
      ]);
      // Rebuild match_scores: delete old rows, insert new
      run('DELETE FROM match_scores WHERE matchId = ?', [req.params.id]);
      for (const cid of patch.candidateIds) {
        run('INSERT INTO match_scores (matchId, candidateId, score) VALUES (?, ?, 0)', [
          req.params.id,
          cid,
        ]);
      }
    });
    updateCandidates();
  }

  return res.json(formatMatch(get('SELECT * FROM matches WHERE id = ?', [req.params.id])));
});

// DELETE /api/matches/:id — delete match and cascade rounds/questions/match_scores
router.delete('/:id', (req, res) => {
  const match = get('SELECT id FROM matches WHERE id = ?', [req.params.id]);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }

  // Clear game_state FK references that can block deletion
  run('UPDATE game_state SET currentRoundId = NULL, currentQuestionId = NULL WHERE id = 1');
  resetGameStateIfActive(req.params.id);

  const deleteMatch = db.transaction((matchId) => {
    // Delete questions for all rounds in this match
    const roundIds = all('SELECT id FROM rounds WHERE matchId = ?', [matchId]);
    for (const r of roundIds) {
      run('DELETE FROM questions WHERE roundId = ?', [r.id]);
    }
    // Delete rounds, match_scores, score_log entries, then the match itself
    run('DELETE FROM rounds WHERE matchId = ?', [matchId]);
    run('DELETE FROM match_scores WHERE matchId = ?', [matchId]);
    run('DELETE FROM score_log WHERE matchId = ?', [matchId]);
    run('DELETE FROM matches WHERE id = ?', [matchId]);
  });
  deleteMatch(req.params.id);

  return res.status(204).end();
});

// POST /api/matches/:id/reset — reset a completed match back to not_started
router.post('/:id/reset', (req, res) => {
  const match = get('SELECT * FROM matches WHERE id = ?', [req.params.id]);
  if (!match) {
    return res.status(404).json({ error: 'Match not found.' });
  }
  if (match.status !== 'completed') {
    return res.status(400).json({ error: 'Only completed matches can be reset.' });
  }

  resetGameStateIfActive(req.params.id);

  const resetMatch = db.transaction((matchId) => {
    run("UPDATE matches SET status = 'not_started', winnerCandidateId = NULL WHERE id = ?", [matchId]);
    run('UPDATE match_scores SET score = 0 WHERE matchId = ?', [matchId]);
  });
  resetMatch(req.params.id);

  return res.json(formatMatch(get('SELECT * FROM matches WHERE id = ?', [req.params.id])));
});

module.exports = router;
