---
phase: "03"
plan: "02"
subsystem: frontend
tags: [zustand, react-router, store, routing, projects-api]
dependency_graph:
  requires: [puzzle-fragments/src/store/authStore.js, puzzle-fragments/src/components/ProtectedRoute.jsx]
  provides: [puzzle-fragments/src/store/useProjectStore.js, puzzle-fragments/src/App.jsx]
  affects: [puzzle-fragments/src/pages/ProjectsPage.jsx (plan 03), puzzle-fragments/src/pages/ProjectDetailPage.jsx (plan 04)]
tech_stack:
  added: []
  patterns: [zustand create() with async actions, authHeaders() getState() pattern, React Router v6 nested protected routes]
key_files:
  created: [puzzle-fragments/src/store/useProjectStore.js]
  modified: [puzzle-fragments/src/App.jsx]
decisions:
  - authHeaders() reads token via useAuthStore.getState().token — fresh token on every request (T-03-09 mitigation)
  - No persist middleware on useProjectStore — project state is session-scoped
  - / redirects to /projects via Navigate replace (D-01)
  - /canvas kept at original path for backwards compatibility (D-03)
  - ProjectsPage and ProjectDetailPage imports will show build warning until plans 03/04 create those files
metrics:
  duration: "3m"
  completed: "2026-04-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 2: Frontend Project Store + App Routing Summary

Zustand project store with 6 API actions (Bearer token auth, full CRUD + multipart upload + layout persistence + close) and updated App.jsx routing tree that places /projects and /projects/:id inside ProtectedRoute with / redirecting to /projects.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create useProjectStore with API actions | c3c7e84 | puzzle-fragments/src/store/useProjectStore.js (created) |
| 2 | Update App.jsx with /projects and /projects/:id routes | ee13203 | puzzle-fragments/src/App.jsx |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- `authHeaders()` calls `useAuthStore.getState().token` on every request — ensures freshest token, mitigates T-03-09 (Spoofing)
- No `persist` middleware on `useProjectStore` — project list and detail state are session-scoped; stale data on reload is handled by re-fetching from API
- `/ → /projects` redirect uses `replace` so browser history is not polluted (navigating back from /projects does not loop)
- `/canvas` route kept for backwards compatibility (D-03) — existing bookmarks/tests continue to work

## Known Stubs

- `puzzle-fragments/src/pages/ProjectsPage.jsx` — not yet created (will be created in plan 03). Import in App.jsx will produce a build error until that file exists.
- `puzzle-fragments/src/pages/ProjectDetailPage.jsx` — not yet created (will be created in plan 04). Same caveat.

These stubs are intentional and expected per plan specification. Plans 03 and 04 will resolve them.

## Threat Flags

None — authHeaders() pattern mirrors existing authStore pattern; no new trust boundary surfaces introduced beyond what the plan's threat model covers.

## Self-Check: PASSED

- puzzle-fragments/src/store/useProjectStore.js exists: FOUND
- puzzle-fragments/src/App.jsx contains Navigate to="/projects": FOUND
- Commit c3c7e84 exists: FOUND
- Commit ee13203 exists: FOUND
