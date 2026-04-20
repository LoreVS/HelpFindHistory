---
phase: 01-backend-foundation
plan: "01"
subsystem: backend
tags: [express, sqlite, schema, seed, node]
dependency_graph:
  requires: []
  provides: [server-scaffold, sqlite-schema, admin-seed, health-check]
  affects: [01-02-PLAN.md]
tech_stack:
  added: [express, better-sqlite3, bcrypt, cors, dotenv, jose]
  patterns: [commonjs-modules, sqlite-singleton, dotenv-config, idempotent-seed]
key_files:
  created:
    - server/package.json
    - server/index.js
    - server/db.js
    - server/schema.sql
    - server/seed.js
    - server/.env.example
    - server/.gitignore
    - package.json
  modified: []
decisions:
  - better-sqlite3 synchronous API chosen over async sqlite3 for simplicity
  - CORS origin pinned to http://localhost:5173 (Vite dev origin), not wildcard
  - JWT_SECRET guard uses process.exit(1) at startup to prevent insecure operation
  - Admin seed uses idempotent WHERE role=? check to prevent duplicate rows
  - Schema applied by splitting SQL on semicolons and skipping PRAGMA lines
metrics:
  duration: "~4 minutes"
  completed: "2026-04-20"
  tasks_completed: 3
  files_created: 8
---

# Phase 1 Plan 01: Server Scaffold, SQLite Schema, Express Health-Check, Admin Seed

Express server with better-sqlite3 singleton, 6-table SQLite schema initialized on startup, idempotent admin seed, and JWT_SECRET startup guard.

## What Was Built

A complete Express server directory at `server/` that:
- Loads environment variables via dotenv from `server/.env`
- Refuses to start if `JWT_SECRET` is missing (process.exit 1 guard)
- Initializes a SQLite database at `server/data/puzzle_forge.db` on startup (creates directory if needed)
- Applies the full schema idempotently using `CREATE TABLE IF NOT EXISTS` for all 6 tables
- Seeds an admin user from env vars on first run; subsequent runs skip the seed
- Exposes `GET /api/health` returning `{"status":"ok","timestamp":"..."}` with HTTP 200
- Has CORS pinned to `http://localhost:5173` with credentials enabled

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Initialize server package and install dependencies | 6d76a13 | server/package.json, server/.env.example, server/.gitignore, package.json |
| 2 | Write SQLite schema and database singleton | 24ba275 | server/schema.sql, server/db.js |
| 3 | Express entry point, health-check route, and admin seed | 158c5e8 | server/index.js, server/seed.js |

## Verification Results

All success criteria confirmed:

- `npm run server` from project root starts Express on port 3001 with no errors
- `GET /api/health` returns HTTP 200 with `{"status":"ok","timestamp":"..."}`
- `server/data/puzzle_forge.db` created at first run
- All 6 tables present: users, projects, fragments, attempts, scores, token_denylist
- Admin row exists with email=admin@puzzleforge.local, role=admin
- Second server run prints `[seed] Admin account already exists — skipping.` (idempotent)
- Missing JWT_SECRET causes exit code 1 with clear error message

## Schema Tables

| Table | Purpose |
|-------|---------|
| users | Email/password accounts with role (admin/user) and cumulative score |
| projects | Reconstruction projects owned by admin users |
| fragments | Fragment photos uploaded to projects |
| attempts | User reconstruction layouts for a project (draft/published/approved/rejected) |
| scores | Points awarded when an attempt is approved |
| token_denylist | JTI-indexed logout token invalidation store |

## Threat Model Coverage

All STRIDE mitigations from the plan's threat register are implemented:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-01-02: ADMIN_PASSWORD in .env | .env in .gitignore; logs only email, never password |
| T-01-03: JWT_SECRET in .env | process.exit(1) guard; .env excluded from git; never logged |
| T-01-04: Admin elevation of privilege | Idempotent WHERE role=? guard in seed.js |
| T-01-06: CORS spoofing | Origin pinned to http://localhost:5173, not wildcard |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - this plan is pure infrastructure with no UI stubs.

## Self-Check: PASSED

Files confirmed:
- server/package.json: FOUND
- server/index.js: FOUND
- server/db.js: FOUND
- server/schema.sql: FOUND
- server/seed.js: FOUND
- server/.env.example: FOUND
- server/.gitignore: FOUND
- package.json: FOUND
- server/data/puzzle_forge.db: FOUND

Commits confirmed:
- 6d76a13: chore(01-01): initialize server package and install dependencies
- 24ba275: feat(01-01): add SQLite schema and database singleton
- 158c5e8: feat(01-01): add Express entry point, health-check route, and admin seed
