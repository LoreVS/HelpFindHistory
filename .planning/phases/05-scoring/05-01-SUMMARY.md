---
phase: 05-scoring
plan: 01
subsystem: backend
tags: [scoring, sqlite, migration, rbac, transactions]
dependency_graph:
  requires: []
  provides:
    - POST /api/projects accepts reward field and validates integer >= 1
    - GET /api/projects/:id returns attempt rows with parsed layout JSON
    - POST /api/attempts/:id/approve (admin-only, atomic 4-write transaction)
    - POST /api/attempts/:id/reject (admin-only, status guard)
    - GET /api/users/me returns { id, score } for authenticated user
    - projects table reward column with DEFAULT 1
  affects:
    - server/schema.sql
    - server/db.js
    - server/routes/projects.js
    - server/routes/attempts.js
tech_stack:
  added: []
  patterns:
    - db.transaction() for 4-write atomic approve operation
    - try/catch ALTER TABLE migration guard for idempotent column add
    - requireRole('admin') per-route RBAC guard on approve/reject
key_files:
  created: []
  modified:
    - server/schema.sql
    - server/db.js
    - server/routes/projects.js
    - server/routes/attempts.js
decisions:
  - reward defaults to 1 in both schema DDL and migration guard — consistent behavior on fresh vs existing DBs
  - db.prepare().run() used for ALTER TABLE (not db.exec) — consistent with better-sqlite3 synchronous API
  - doApprove transaction re-fetches attempt and project inside transaction — avoids TOCTOU race
  - GET /api/users/me placed in attempts.js router (already requireAuth at router level) — no new router file needed
metrics:
  duration: "~2 minutes"
  completed: "2026-04-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 5 Plan 01: Scoring Backend Endpoints Summary

**One-liner:** Backend scoring layer — reward column with idempotent migration, 4-write atomic approve transaction with RBAC, reject endpoint, and GET /api/users/me for score display.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add reward column to schema and apply migration guard in db.js | 60c6299 | server/schema.sql, server/db.js |
| 2 | Update projects.js — reward field in POST /, layout in GET /:id | c22b0ce | server/routes/projects.js |
| 3 | Add approve, reject, and /users/me endpoints to attempts.js | 288a764 | server/routes/attempts.js |

## What Was Built

### Schema Change (Task 1)
- Added `reward INTEGER NOT NULL DEFAULT 1` column to the `projects` CREATE TABLE block in `server/schema.sql`, between `description` and `status`
- Added an idempotent migration block in `server/db.js` using `db.prepare().run()` wrapped in try/catch — existing databases receive the column without error; fresh databases get it from the DDL

### projects.js Updates (Task 2)
- POST `/api/projects` now destructures `reward` from `req.body` (default 1), validates it as an integer >= 1, and passes `rewardNum` as the 4th argument to the INSERT
- GET `/api/projects/:id` attempts query now SELECTs `a.layout`; results mapped through `attemptsWithLayout` with `JSON.parse` so the frontend receives a parsed array (not raw JSON string) for canvas preview

### New Endpoints in attempts.js (Task 3)
- `GET /api/users/me` — returns `{ id, score }` for the authenticated user; protected by router-level `requireAuth`; returns 404 if user row missing
- `POST /api/attempts/:id/approve` — admin-only (`requireRole('admin')`); wraps 4 writes in `db.transaction()`: UPDATE attempts (approved + reviewed_at), UPDATE projects (closed + closed_at), INSERT scores row with `project.reward` points, UPDATE users.score += project.reward; returns 409 if attempt is not `published`
- `POST /api/attempts/:id/reject` — admin-only; status guard (409 if not published); sets `status='rejected'` and `reviewed_at`; returns updated attempt row

## Threat Mitigations Applied

| Threat ID | Applied |
|-----------|---------|
| T-05-01 | `requireRole('admin')` on both approve and reject routes |
| T-05-02 | `if (attempt.status !== 'published') return null` inside doApprove transaction |
| T-05-03 | All 4 approve writes wrapped in single `db.transaction()` |
| T-05-04 | `if (attempt.status !== 'published')` guard on reject route returns 409 |
| T-05-05 | GET /api/users/me returns only `{ id, score }` — no email, password, or role |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all endpoints are fully implemented with real database queries.

## Threat Flags

None — no new security surface beyond what was specified in the plan's threat model.

## Self-Check: PASSED

- server/schema.sql: FOUND
- server/db.js: FOUND
- server/routes/projects.js: FOUND
- server/routes/attempts.js: FOUND
- Commit 60c6299: FOUND
- Commit c22b0ce: FOUND
- Commit 288a764: FOUND
