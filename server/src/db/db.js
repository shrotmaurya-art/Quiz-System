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

module.exports = db;
