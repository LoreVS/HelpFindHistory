'use strict';

const bcrypt = require('bcrypt');
const db = require('./db');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@puzzleforge.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const SALT_ROUNDS    = 12;

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (existing) {
    console.log('[seed] Admin account already exists — skipping.');
    return;
  }
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);
  db.prepare(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
  ).run(ADMIN_EMAIL, hash, 'admin');
  console.log('[seed] Admin account created: ' + ADMIN_EMAIL);
}

module.exports = { seedAdmin };
