---
phase: 04-collaboration
plan: 01
subsystem: backend-api
tags: [collaboration, attempts, rbac, idor-guard, role-filter]
dependency_graph:
  requires: [server/middleware/auth.js, server/db.js, server/schema.sql]
  provides: [server/routes/attempts.js, server/routes/projects.js (refactored)]
  affects: [server/index.js]
tech_stack:
  added: []
  patterns: [inline-rbac-middleware, db.transaction-upsert, role-filtered-sql]
key_files:
  created: [server/routes/attempts.js]
  modified: [server/routes/projects.js, server/index.js]
decisions:
  - Inline requireRole('admin') per write route replaces router-level guard (T-04-02)
  - Role-filtered SQL via template literal conditional — avoids parameterized injection risk for static string (T-04-04)
  - db.transaction wraps upsert to prevent race-condition duplicate drafts
  - IDOR guard uses strict equality on attempt.user_id vs req.user.id before any UPDATE (T-04-01)
  - Publish status hardcoded as 'published' string — body fields beyond layout ignored (T-04-05)
metrics:
  duration: 8m
  completed: 2026-04-27
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 4 Plan 01: Backend Collaboration Routes Summary

**One-liner:** Role-filtered project listing, solution injection for closed projects, and full attempt CRUD (draft upsert + ownership-checked publish) via new attempts.js router.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor projects.js — inline guards, open GET routes, inject solution | fde035e | server/routes/projects.js |
| 2 | Create server/routes/attempts.js and register in server/index.js | 438f408 | server/routes/attempts.js, server/index.js |

## What Was Built

### Task 1 — projects.js refactor

- Removed `router.use(requireAuth, requireRole('admin'))` router-level guard
- Added inline `requireAuth` + `requireRole('admin')` to all 4 write routes: POST /, POST /:id/fragments, PATCH /:id/layout, POST /:id/close
- `GET /api/projects` now open to all authenticated users with role-based SQL filter: admin sees all projects, users see only `status='open'` ones (COLLAB-01, T-04-04)
- `GET /api/projects/:id` now open to all authenticated users (COLLAB-02)
- `GET /api/projects/:id` injects `solution: { layout, submitter_email }` from the most-recently-reviewed approved attempt when `project.status === 'closed'`; `solution: null` otherwise (COLLAB-05, D-16, D-17)

### Task 2 — attempts.js (new) + index.js

- `GET /api/projects/:id/attempts/me` — returns current user's draft attempt (status='draft') or 404; layout parsed from JSON string to object
- `POST /api/projects/:id/attempts` — upsert: creates draft on first call, updates layout on subsequent calls; scoped by project_id AND user_id (T-04-03); validates project exists and is open (T-04-06)
- `POST /api/attempts/:id/publish` — checks ownership (attempt.user_id === req.user.id, T-04-01), checks status is 'draft' (idempotency, T-04-05), transitions to 'published' with submitted_at timestamp
- All three routes protected by `router.use(requireAuth)` — no admin role required
- Router mounted at `/api` in server/index.js, after projects router, before 404 catch-all

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

All threats from the plan's STRIDE register were addressed:

| Threat ID | Mitigation Implemented |
|-----------|----------------------|
| T-04-01 | `attempt.user_id !== req.user.id` → 403 before UPDATE in publish route |
| T-04-02 | Inline `requireRole('admin')` on all 4 write routes in projects.js |
| T-04-03 | SELECT and INSERT/UPDATE both scope by `project_id = ? AND user_id = ?` |
| T-04-04 | Role-based SQL filter: `WHERE p.status = 'open'` when not admin |
| T-04-05 | Hardcoded `status = 'published'` in UPDATE — body ignored for status |
| T-04-06 | Layout validated as object/array; 400 returned on invalid input |

## Known Stubs

None — no stub values or placeholder data in the implemented routes.

## Self-Check: PASSED

- `server/routes/attempts.js` exists: FOUND
- `server/routes/projects.js` contains `let solution = null`: FOUND
- `server/index.js` contains `require('./routes/attempts')`: FOUND
- Commit fde035e exists: FOUND
- Commit 438f408 exists: FOUND
