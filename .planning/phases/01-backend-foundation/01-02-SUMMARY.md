---
phase: 01-backend-foundation
plan: "02"
subsystem: backend
tags: [express, jwt, bcrypt, jose, auth, middleware, sqlite]
dependency_graph:
  requires: [server-scaffold, sqlite-schema, admin-seed]
  provides: [auth-endpoints, jwt-middleware, rbac-middleware]
  affects: [02-01-PLAN.md]
tech_stack:
  added: []
  patterns: [jwt-hs256, bcrypt-hash, token-denylist, bearer-auth, express-middleware-factory]
key_files:
  created:
    - server/routes/auth.js
    - server/middleware/auth.js
  modified:
    - server/index.js
decisions:
  - SALT_ROUNDS=12 chosen for bcrypt (secure default, acceptable latency on local hardware)
  - role hardcoded to 'user' in register INSERT — no API parameter accepted (T-02-06 mitigation)
  - Constant-time bcrypt.compare used even on unknown email (dummy false path) to prevent timing-based user enumeration
  - INSERT OR IGNORE used for denylist to safely handle double-logout without error
  - requireRole factory pattern allows RBAC to be composed with requireAuth in later phases
metrics:
  duration: "~2 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 1 Plan 02: Auth Endpoints (register, login, logout) and JWT Middleware

Three Express auth endpoints with bcrypt password hashing, jose JWT signing, and server-side token denylist — plus a reusable requireAuth + requireRole middleware pair.

## What Was Built

- `server/routes/auth.js`: Express router mounted at `/api/auth` with:
  - `POST /register` — validates email + password (min 8 chars), rejects duplicates with 409, bcrypt hashes with cost 12, inserts user with `role='user'`, returns signed JWT + user object
  - `POST /login` — constant-time bcrypt compare (prevents timing-based user enumeration), returns JWT on success, 401 on failure
  - `POST /logout` — verifies Bearer token, inserts JTI into `token_denylist`, returns 204; invalid/expired tokens also return 204 (already logged out)
- `server/middleware/auth.js`: Two exported middleware functions:
  - `requireAuth` — verifies HS256 JWT signature + expiry, checks `token_denylist`, attaches `req.user = { id, role }`
  - `requireRole(role)` — factory middleware for role-based access control, used after requireAuth
- `server/index.js`: Auth router mounted at `/api/auth` (comment placeholder replaced)

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Implement auth routes (register, login, logout) | a41aebb | server/routes/auth.js |
| 2 | JWT middleware and wire auth router into Express app | 6dfbeb4 | server/middleware/auth.js, server/index.js |

## Verification Results

All 7 end-to-end checks confirmed (server started, all curl checks passed):

1. `GET /api/health` — HTTP 200, `{"status":"ok","timestamp":"..."}`
2. `POST /api/auth/register` — HTTP 201, returns JWT + `{"id":2,"email":"test@example.com","role":"user"}`
3. Duplicate register — HTTP 409, `{"error":"An account with that email already exists."}`
4. `POST /api/auth/login` (correct credentials) — HTTP 200, returns JWT + role=user
5. `POST /api/auth/login` (wrong password) — HTTP 401, `{"error":"Invalid email or password."}`
6. `POST /api/auth/logout` — HTTP 204, JTI inserted into token_denylist
7. Admin login — HTTP 200, `"role":"admin"` confirmed (ROLE-01 end-to-end verified)

## Threat Model Coverage

All STRIDE mitigations from the plan's threat register are implemented:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-02-01: Login timing attack | bcrypt.compare called even for unknown email (dummy false path prevents timing leak) |
| T-02-02: JWT role tampering | jwtVerify in requireAuth rejects tampered tokens with 401 |
| T-02-03: Logout without invalidation | token_denylist INSERT on logout; requireAuth checks denylist on every request |
| T-02-04: Password in DB | bcrypt hash (cost 12) stored; raw password never logged or returned |
| T-02-05: Brute-force login | Accepted (rate limiting deferred — local-only tool) |
| T-02-06: Self-registration with admin role | role='user' hardcoded; no API parameter accepted |
| T-02-07: Expired tokens in denylist | jwtVerify checks exp before denylist lookup; expired tokens rejected at jose layer |
| T-02-08: Stack traces in 500 responses | catch blocks log to console, return only generic message string |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — this plan is pure backend with no UI stubs.

## Threat Flags

None — no new security surface beyond what is documented in the plan's threat model.

## Self-Check: PASSED

Files confirmed:
- server/routes/auth.js: FOUND
- server/middleware/auth.js: FOUND
- server/index.js: FOUND (modified — auth router mounted)

Commits confirmed:
- a41aebb: feat(01-02): implement auth routes (register, login, logout)
- 6dfbeb4: feat(01-02): add JWT middleware and mount auth router in Express app
