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
