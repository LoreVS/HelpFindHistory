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
// Use db.pragma() (idiomatic better-sqlite3 API) and db.exec() for DDL so that
// multi-statement SQL (triggers, BEGIN…END blocks, string literals with semicolons)
// is handled correctly without fragile manual splitting.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
// Strip PRAGMA lines already applied above, then execute all DDL atomically:
const ddl = schema.replace(/^\s*PRAGMA[^;]+;\s*/gim, '').trim();
db.exec(ddl);

module.exports = db;
