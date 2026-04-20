'use strict';

const { jwtVerify } = require('jose');
const db = require('../db');

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * requireAuth — Express middleware
 * Validates Bearer token, checks denylist, attaches req.user = { id, role }.
 * Returns 401 for missing/invalid/expired/denylisted tokens.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Check server-side denylist (handles logout)
    if (payload.jti) {
      const denied = db.prepare('SELECT jti FROM token_denylist WHERE jti = ?').get(payload.jti);
      if (denied) {
        return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
      }
    }

    // Attach user context for downstream route handlers
    req.user = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch (err) {
    console.error('[middleware/auth]', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}

/**
 * requireRole(role) — factory middleware for role-based access control
 * Must be used AFTER requireAuth.
 * Usage: router.get('/admin-route', requireAuth, requireRole('admin'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
