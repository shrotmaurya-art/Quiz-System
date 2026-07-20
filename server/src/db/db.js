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
