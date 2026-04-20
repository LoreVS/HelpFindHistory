'use strict';

const path = require('path');
const fs   = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_PATH = process.env.DATABASE_PATH || './data/puzzle_forge.db';
const resolvedPath = path.resolve(__dirname, DB_PATH);

// Ensure the data directory exists before opening the database
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);

// Apply schema — all statements use IF NOT EXISTS so this is safe to call on every startup
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.prepare('PRAGMA journal_mode=WAL').run();
db.prepare('PRAGMA foreign_keys=ON').run();
// Run schema DDL statements (splitting on semicolons, skipping PRAGMA lines already applied)
schema.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('PRAGMA')).forEach(s => {
  db.prepare(s).run();
});

module.exports = db;
