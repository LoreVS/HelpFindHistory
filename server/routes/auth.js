'use strict';

const express = require('express');
const bcrypt  = require('bcrypt');
const { SignJWT, jwtVerify } = require('jose');

const db = require('../db');

const router = express.Router();

const SALT_ROUNDS  = 12;
const JWT_SECRET   = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_EXPIRES  = process.env.JWT_EXPIRES_IN || '7d';

// Precomputed dummy hash — used in login to ensure constant-time comparison
// even when the user is not found, preventing user-enumeration timing attacks.
const DUMMY_HASH = bcrypt.hashSync('__dummy__', SALT_ROUNDS);

// Helper: sign a JWT for a user row
async function signToken(user) {
  return new SignJWT({ sub: String(user.id), role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .setJti(crypto.randomUUID())
    .sign(JWT_SECRET);
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
// AUTH-01: User can register with email and password
// ROLE-02: Self-registered users receive role='user' automatically
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check for duplicate (case-insensitive via COLLATE NOCASE on schema)
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const hash   = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)'
    ).run(email.trim().toLowerCase(), hash, 'user');

    const newUser = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token   = await signToken(newUser);

    return res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
// AUTH-02: User can log in with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT id, email, password, role FROM users WHERE email = ?').get(
      typeof email === 'string' ? email.trim() : ''
    );

    // Use constant-time comparison to prevent user-enumeration timing attacks.
    // Always call bcrypt.compare (against DUMMY_HASH when no user found) so both
    // code paths take the same amount of time, preventing timing-based enumeration.
    const candidateHash = user ? user.password : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(
      typeof password === 'string' ? password : '',
      candidateHash
    );
    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = await signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// AUTH-03: User can log out (token added to server-side denylist)
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
    } catch {
      // Token is invalid or expired — nothing to denylist, treat as already logged out
      return res.status(204).send();
    }

    const jti       = payload.jti;
    const expiresAt = new Date(payload.exp * 1000).toISOString();

    if (jti) {
      // INSERT OR IGNORE handles the case where the same token is used to logout twice
      db.prepare(
        'INSERT OR IGNORE INTO token_denylist (jti, expires_at) VALUES (?, ?)'
      ).run(jti, expiresAt);
    }

    return res.status(204).send();
  } catch (err) {
    console.error('[auth/logout]', err);
    return res.status(500).json({ error: 'Logout failed.' });
  }
});

module.exports = router;
