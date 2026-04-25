---
phase: "03"
plan: "01"
subsystem: backend
tags: [express, multer, projects-api, fragments, sqlite, better-sqlite3]
dependency_graph:
  requires: [server/middleware/auth.js, server/db.js, server/schema.sql]
  provides: [server/routes/projects.js]
  affects: [server/index.js]
tech_stack:
  added: [multer@1.x (multipart/form-data disk storage)]
  patterns: [blanket router middleware, db.transaction for atomic batch updates, per-project upload subdirectory]
key_files:
  created: [server/routes/projects.js]
  modified: [server/index.js, server/package.json]
decisions:
  - owner_id taken from req.user.id (server-side), never from request body — prevents IDOR ownership hijacking (T-03-04)
  - multer diskStorage with per-project subdirectory server/data/uploads/{projectId}/ — scoped to project (T-03-02)
  - fileSize limit 20MB per upload (T-03-05)
  - db.transaction used for layout PATCH to ensure atomicity across multiple fragment metadata updates
  - fragment project_id validated in UPDATE WHERE clause (id = ? AND project_id = ?) — prevents cross-project tampering (T-03-03)
  - Closed project guard on fragment upload and layout PATCH returns 409 — prevents mutations after close
metrics:
  duration: "2m"
  completed: "2026-04-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 3 Plan 1: Backend Project & Fragment API Routes Summary

Six REST routes providing the full project management data layer: project CRUD, multipart fragment upload with multer to scoped disk subdirectory, atomic layout persistence via better-sqlite3 transactions, and project closure with timestamp recording.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install multer and create projects router with all 6 routes | 5364c01 | server/routes/projects.js (created), server/package.json |
| 2 | Register projects router in index.js and serve uploads directory | 8a41de9 | server/index.js |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- `owner_id` set server-side from `req.user.id`, never accepted from request body (T-03-04 IDOR mitigation)
- multer `diskStorage` writes to `server/data/uploads/{projectId}/` — numerically-scoped directory prevents path traversal (T-03-07)
- `fileSize: 20 * 1024 * 1024` (20MB) hard limit on each upload (T-03-05 DoS mitigation)
- `db.transaction()` wraps the layout PATCH loop for atomicity — all-or-nothing fragment metadata updates
- `UPDATE fragments ... WHERE id = ? AND project_id = ?` ties fragment to project — prevents cross-project metadata tampering (T-03-03)
- Closed-project guard on both `POST /:id/fragments` and `PATCH /:id/layout` returns 409 Conflict

## Known Stubs

None.

## Threat Flags

None — all surfaces covered by plan's threat model (T-03-01 through T-03-07).

## Self-Check: PASSED

- server/routes/projects.js exists: FOUND
- server/index.js contains /api/projects registration: FOUND
- Commit 5364c01 exists: FOUND
- Commit 8a41de9 exists: FOUND
