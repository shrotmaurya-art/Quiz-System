// This is the single place other files import the database from; no other file should open its own quiz.sqlite connection.
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'quiz.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

const settings = db.prepare('SELECT * FROM global_settings WHERE id = 1').get();
if (!settings) {
  db.prepare(
    'INSERT INTO global_settings (id, defaultTimeLimitSeconds, defaultGapEnabled, defaultGapSeconds) VALUES (1, 30, 1, 10)'
  ).run();
}

// ---------------------------------------------------------------------------
// Schema migrations — add matchId columns to existing tables.
// SQLite errors on duplicate ADD COLUMN; we swallow that specific error.
// ---------------------------------------------------------------------------
function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  } catch (err) {
    // "duplicate column name" is expected on re-run — anything else should propagate.
    if (!err.message.includes('duplicate column')) throw err;
  }
}

safeAddColumn('rounds', 'matchId TEXT REFERENCES matches(id)');
safeAddColumn('game_state', 'matchId TEXT');
safeAddColumn('score_log', 'matchId TEXT');
safeAddColumn('game_state', 'gapStartedAt INTEGER');

safeAddColumn('global_settings', 'schoolName TEXT NOT NULL DEFAULT \'Quiz Competition\'');
safeAddColumn('global_settings', 'brandLogoUrl TEXT');
safeAddColumn('global_settings', 'brandColor TEXT');
safeAddColumn('global_settings', 'soundEffectsEnabled INTEGER NOT NULL DEFAULT 1');

// Check if score_log check constraint includes 'question_replay_reversal'
const scoreLogSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='score_log'").get();
if (scoreLogSql && !scoreLogSql.sql.includes('question_replay_reversal')) {
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      // 1. Rename existing table
      db.prepare('ALTER TABLE score_log RENAME TO score_log_old').run();

      // 2. Create the new score_log table with updated check constraint
      db.prepare(`
        CREATE TABLE score_log (
          id TEXT PRIMARY KEY,
          questionId TEXT NOT NULL,
          candidateId TEXT NOT NULL,
          pointsChange INTEGER NOT NULL,
          reason TEXT NOT NULL CHECK (reason IN ('timed_ranking_win', 'manual_adjustment', 'question_replay_reversal')),
          timestamp INTEGER NOT NULL,
          matchId TEXT,
          FOREIGN KEY (questionId) REFERENCES questions(id),
          FOREIGN KEY (candidateId) REFERENCES candidates(id),
          FOREIGN KEY (matchId) REFERENCES matches(id) ON DELETE CASCADE
        )
      `).run();

      // 3. Copy rows from old to new
      db.prepare(`
        INSERT INTO score_log (id, questionId, candidateId, pointsChange, reason, timestamp, matchId)
        SELECT id, questionId, candidateId, pointsChange, reason, timestamp, matchId
        FROM score_log_old
      `).run();

      // 4. Drop the old table
      db.prepare('DROP TABLE score_log_old').run();
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

// ---------------------------------------------------------------------------
// Orphaned-round migration: any round without a matchId gets assigned to an
// auto-created "Match 1" so the system never has dangling rounds.
// ---------------------------------------------------------------------------
const crypto = require('crypto');

const orphanedRounds = db.prepare('SELECT id FROM rounds WHERE matchId IS NULL').all();
if (orphanedRounds.length > 0) {
  const matchId = crypto.randomUUID();
  const activeCandidates = db.prepare('SELECT id FROM candidates WHERE isActive = 1').all();
  const candidateIds = activeCandidates.map((c) => c.id);

  db.prepare(
    `INSERT OR IGNORE INTO matches (id, name, "order", candidateIds, status) VALUES (?, ?, ?, ?, ?)`
  ).run(matchId, 'Match 1', 1, JSON.stringify(candidateIds), 'not_started');

  // Create match_scores rows
  for (const cid of candidateIds) {
    db.prepare(
      'INSERT OR IGNORE INTO match_scores (matchId, candidateId, score) VALUES (?, ?, 0)'
    ).run(matchId, cid);
  }

  // Assign orphaned rounds
  db.prepare('UPDATE rounds SET matchId = ? WHERE matchId IS NULL').run(matchId);
}

function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

function getGlobalSettings() {
  return get('SELECT * FROM global_settings WHERE id = 1');
}

function updateGlobalSettings(patch) {
  const allowedFields = [
    'defaultTimeLimitSeconds',
    'defaultGapEnabled',
    'defaultGapSeconds',
    'schoolName',
    'brandLogoUrl',
    'brandColor',
    'soundEffectsEnabled',
  ];
  const fields = allowedFields.filter((field) => patch[field] !== undefined);

  if (fields.length === 0) {
    return getGlobalSettings();
  }

  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  run(
    `UPDATE global_settings SET ${assignments} WHERE id = 1`,
    fields.map((field) => patch[field])
  );

  return getGlobalSettings();
}

module.exports = {
  db,
  run,
  get,
  all,
  getGlobalSettings,
  updateGlobalSettings,
};
