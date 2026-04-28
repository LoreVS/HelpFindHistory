---
phase: quick
plan: 260429-2ey
subsystem: server-scripts, frontend-projects
tags: [dev-tooling, ui-filter, sqlite, react]
dependency_graph:
  requires: []
  provides:
    - server/scripts/clear-data.js (dev reset script)
    - filtered main projects grid on ProjectsPage
  affects:
    - puzzle-fragments/src/pages/ProjectsPage.jsx
tech_stack:
  added: []
  patterns:
    - better-sqlite3 synchronous DELETE for dev-reset script
    - Set-based filter derived from Zustand store slice (myAttempts)
key_files:
  created:
    - server/scripts/clear-data.js
  modified:
    - puzzle-fragments/src/pages/ProjectsPage.jsx
decisions:
  - Delete in attempts → fragments → projects order to respect FK constraints even with CASCADE
  - finishedProjectIds Set computed in component body — no store change needed, myAttempts already has the data
  - visibleProjects extracted as const to avoid duplicating the filter expression for empty-state check
metrics:
  duration: ~5 minutes
  completed: 2026-04-28
---

# Phase quick Plan 260429-2ey: Clear-data Script and Filter Submitted Projects Summary

## One-liner

Dev-reset script that truncates attempts/fragments/projects via better-sqlite3, plus a Set-based filter on ProjectsPage that hides the current user's already-finished projects from the main grid.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create server/scripts/clear-data.js dev-reset script | d1930b8 | server/scripts/clear-data.js (created) |
| 2 | Filter finished projects from ProjectsPage main grid | ebc160f | puzzle-fragments/src/pages/ProjectsPage.jsx |

## What Was Built

**Task 1 — clear-data.js**

A Node script at `server/scripts/clear-data.js` that uses better-sqlite3's synchronous API to DELETE all rows from `attempts`, `fragments`, and `projects` in that order (satisfying FK constraints). Prints per-table row counts and exits 0. Users, scores, and token_denylist are untouched.

Run with: `node server/scripts/clear-data.js`

**Task 2 — ProjectsPage filter**

In `ProjectsPage.jsx`, two new constants are derived immediately after the `useProjectStore` destructure:

- `finishedProjectIds` — a `Set` of `project_id` values from `myAttempts` (status: published/approved/rejected)
- `visibleProjects` — `projects` with finished projects filtered out

The main grid and empty-state check now use `visibleProjects`. The "My Finished Projects" section (`myAttempts.map(...)`) is untouched. For admin users, `myAttempts` is always `[]` so `finishedProjectIds` is an empty Set and the filter is a no-op.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced.

## Self-Check: PASSED

- `server/scripts/clear-data.js` exists and runs without error (exit 0)
- Commits d1930b8 and ebc160f exist in git log
- `npm run lint` passes with 0 errors (2 pre-existing warnings in unrelated files)
