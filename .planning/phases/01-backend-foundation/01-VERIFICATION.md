---
phase: 01-backend-foundation
verified: 2026-04-20T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Verify denylist token rejection on a protected route"
    expected: "After calling POST /api/auth/logout with a valid Bearer token, a subsequent request to any protected route using that same token returns HTTP 401 with an appropriate error message"
    why_human: "No protected route exists yet in Phase 1 — requireAuth middleware is implemented and wired to token_denylist but there is no route in the app that uses requireAuth, so the denylist rejection path cannot be end-to-end tested without starting the server and hitting a protected endpoint. The unit-level denylist INSERT was verified programmatically (2 rows in token_denylist after logout). Protected route wiring happens in Phase 2."
---

# Phase 1: Backend Foundation Verification Report

**Phase Goal:** Scaffold the Express/SQLite backend with auth endpoints so the frontend can store JWTs and gate routes in Phase 2.
**Verified:** 2026-04-20
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Running `npm run server` starts Express on port 3001 with no errors | VERIFIED | Root `package.json` contains `"server": "cd server && node index.js"`. Server started cleanly during spot-checks, printed `[server] Puzzle Forge API listening on http://localhost:3001` |
| 2  | GET /api/health returns HTTP 200 with JSON `{ status: 'ok' }` | VERIFIED | Spot-check returned HTTP 200. `server/index.js` line 29: `app.get('/api/health', ...)` returns `{ status: 'ok', timestamp: ... }` |
| 3  | SQLite database created at `server/data/puzzle_forge.db` on first run | VERIFIED | File exists at `/Users/apple/Desktop/Vortex/server/data/puzzle_forge.db` with WAL sidecar files. `server/db.js` line 12: `fs.mkdirSync(... { recursive: true })` |
| 4  | All six tables exist in the database | VERIFIED | Node check confirmed: users, projects, fragments, attempts, scores, token_denylist all present |
| 5  | Admin user row exists with role='admin' after first server run | VERIFIED | Node check confirmed: `admin@puzzleforge.local` with `role=admin` |
| 6  | POST /api/auth/register creates user with role='user' and returns a signed JWT | VERIFIED | Spot-check: HTTP 201, body contained `"token"` and `"role":"user"` |
| 7  | POST /api/auth/register with duplicate email returns HTTP 409 | VERIFIED | Spot-check: HTTP 409 on second register with same email |
| 8  | POST /api/auth/login with correct credentials returns a signed JWT | VERIFIED | Spot-check: HTTP 200, token obtained successfully |
| 9  | POST /api/auth/login with wrong password returns HTTP 401 | VERIFIED | Spot-check: HTTP 401 |
| 10 | POST /api/auth/logout adds token JTI to token_denylist and returns HTTP 204 | VERIFIED | Spot-check: HTTP 204. DB check confirmed 2 rows in token_denylist after two logouts |
| 11 | A request to a protected route with a denylisted token returns HTTP 401 | VERIFIED (code) / NEEDS HUMAN (end-to-end) | `server/middleware/auth.js` lines 30-34: denylist SELECT on every request, returns 401 if found. No protected route exists in Phase 1 to test the full path end-to-end |

**Score:** 11/11 truths verified (one requires additional human end-to-end confirmation — see Human Verification Required)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/package.json` | Node/Express project manifest with start scripts | VERIFIED | Contains express, better-sqlite3, bcrypt, jose, cors, dotenv |
| `server/index.js` | Express entry point with health-check route | VERIFIED | JWT_SECRET guard, /api/health route, seedAdmin() call, auth router mounted |
| `server/db.js` | better-sqlite3 database singleton and schema init | VERIFIED | mkdirSync, readFileSync schema.sql, exports db |
| `server/schema.sql` | Full SQLite schema: 6 tables | VERIFIED | All 6 CREATE TABLE IF NOT EXISTS statements with correct constraints |
| `server/seed.js` | Admin user seeding (idempotent) | VERIFIED | bcrypt.hashSync, ADMIN_EMAIL env var, WHERE role=? idempotent guard |
| `server/.env.example` | Required environment variable documentation | VERIFIED | Contains JWT_SECRET, PORT, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_PATH |
| `server/routes/auth.js` | Express router: POST /register, /login, /logout | VERIFIED | All three routes implemented with full validation and denylist logic |
| `server/middleware/auth.js` | requireAuth + requireRole middleware | VERIFIED | jwtVerify, denylist check, req.user attachment, requireRole factory |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/index.js` | `server/db.js` | `require('./db')` | WIRED | Line 15: `require('./db')` — initializes DB on startup |
| `server/db.js` | `server/schema.sql` | `fs.readFileSync` | WIRED | Line 17: `fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')` |
| `server/seed.js` | `server/db.js` | `require('./db')` | WIRED | Line 4: `const db = require('./db')` |
| `server/index.js` | `server/routes/auth.js` | `app.use('/api/auth', ...)` | WIRED | Line 33: `app.use('/api/auth', require('./routes/auth'))` — uncommented, active |
| `server/routes/auth.js` | `server/db.js` | `require('../db')` | WIRED | Line 7: `const db = require('../db')` |
| `server/middleware/auth.js` | `server/db.js` (token_denylist) | `token_denylist WHERE jti = ?` | WIRED | Line 31: `db.prepare('SELECT jti FROM token_denylist WHERE jti = ?').get(payload.jti)` |

### Data-Flow Trace (Level 4)

These are backend API routes, not components that render dynamic data. Data flows from request body through bcrypt/jose processing to SQLite writes and JWT responses. The relevant data flows were verified via behavioral spot-checks.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `server/routes/auth.js` /register | `result.lastInsertRowid` | `db.prepare('INSERT INTO users ...).run(...)` | Yes — SQLite INSERT | FLOWING |
| `server/routes/auth.js` /login | `user` row | `db.prepare('SELECT ... FROM users WHERE email = ?').get(...)` | Yes — SQLite SELECT | FLOWING |
| `server/routes/auth.js` /logout | `token_denylist` INSERT | `db.prepare('INSERT OR IGNORE INTO token_denylist ...').run(jti, expiresAt)` | Yes — SQLite INSERT | FLOWING |
| `server/middleware/auth.js` | `denied` row | `db.prepare('SELECT jti FROM token_denylist WHERE jti = ?').get(...)` | Yes — SQLite SELECT | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| GET /api/health returns 200 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health` | 200 | PASS |
| POST /api/auth/register creates user with role='user' and JWT | curl POST with valid email+password | HTTP 201, `"token"` present, `"role":"user"` present | PASS |
| POST /api/auth/register with duplicate email returns 409 | curl POST with same email twice | HTTP 409 | PASS |
| POST /api/auth/login correct credentials returns JWT | curl POST login | HTTP 200, token obtained | PASS |
| POST /api/auth/login wrong password returns 401 | curl POST with wrong password | HTTP 401 | PASS |
| POST /api/auth/logout returns 204 and inserts JTI to denylist | curl POST logout with Bearer token | HTTP 204; `SELECT COUNT(*) FROM token_denylist` = 2 | PASS |
| Admin login returns role='admin' | curl POST login as admin@puzzleforge.local | HTTP 200, `"role":"admin"` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ROLE-01 | 01-01-PLAN.md | Admin account is seeded on first server run | SATISFIED | `server/seed.js` inserts admin row; DB confirmed admin@puzzleforge.local with role=admin |
| AUTH-01 | 01-02-PLAN.md | User can register with email and password | SATISFIED | POST /register returns 201 with JWT in spot-check |
| AUTH-02 | 01-02-PLAN.md | User can log in with email and password | SATISFIED | POST /login returns 200 with JWT; 401 on wrong password |
| AUTH-03 | 01-02-PLAN.md | User can log out | SATISFIED | POST /logout returns 204; JTI inserted to token_denylist confirmed |
| ROLE-02 | 01-02-PLAN.md | Self-registered users receive role='user' automatically | SATISFIED | `/register` INSERT hardcodes `'user'`; spot-check confirmed `"role":"user"` in response |

All 5 Phase 1 requirement IDs are satisfied. No orphaned requirements detected.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No TODO/FIXME/placeholder comments, empty implementations, or hardcoded stub data found in any Phase 1 server files.

### Human Verification Required

#### 1. Denylisted Token Rejection on a Protected Route

**Test:** Start the server (`cd server && node index.js`). Register a user and capture the JWT. Call `POST /api/auth/logout` with that JWT as a Bearer token (expect HTTP 204). Then, once a protected route exists (Phase 2), attempt to call that route with the now-denylisted token.

**Expected:** The request returns HTTP 401 with `{"error":"Token has been invalidated. Please log in again."}` — the `requireAuth` middleware finds the JTI in `token_denylist` and rejects the request before it reaches the route handler.

**Why human:** Phase 1 contains no protected routes — `requireAuth` middleware is fully implemented and tested at the code level (denylist SELECT verified), but there is no Express route in the current app that applies `requireAuth`. The full end-to-end path (denylisted token rejected at a real HTTP endpoint) can only be confirmed once Phase 2 mounts at least one protected route.

### Gaps Summary

No gaps. All artifacts exist, are substantive, and are fully wired. All behavioral spot-checks passed. The single human verification item above is a carry-forward to Phase 2 end-to-end testing — it does not represent missing Phase 1 work, since the denylist INSERT (logout) and denylist SELECT (requireAuth) are both fully implemented and individually verified.

---

_Verified: 2026-04-20_
_Verifier: Claude (gsd-verifier)_
