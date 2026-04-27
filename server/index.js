'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Guard: refuse to start without a JWT secret
if (!process.env.JWT_SECRET) {
  console.error('[startup] FATAL: JWT_SECRET environment variable is not set. Set it in server/.env');
  process.exit(1);
}

const express = require('express');
const cors    = require('cors');

// Initialize database and run schema (side-effect of require)
require('./db');

// Seed admin account on startup (idempotent)
const { seedAdmin } = require('./seed');
seedAdmin();

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/attempts'));

// Serve uploaded fragment images
app.use('/uploads', express.static(require('path').join(__dirname, 'data/uploads')));

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('[server] Puzzle Forge API listening on http://localhost:' + PORT);
});

module.exports = app;
