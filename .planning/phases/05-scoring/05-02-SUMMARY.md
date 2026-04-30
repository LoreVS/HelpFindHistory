---
phase: 05-scoring
plan: 02
subsystem: frontend-stores
tags: [scoring, zustand, authStore, useProjectStore, reward, approve, reject]
dependency_graph:
  requires:
    - 05-01 (POST /api/attempts/:id/approve, POST /api/attempts/:id/reject, GET /api/users/me)
  provides:
    - authStore.setScore(score) — updates user.score without overwriting other user fields
    - useProjectStore.createProject(name, description, reward) — sends reward in POST body
    - useProjectStore.approveAttempt(id) — POSTs to approve endpoint, updates local project/attempt state
    - useProjectStore.rejectAttempt(id) — POSTs to reject endpoint, updates local attempt state
    - useProjectStore.fetchUserScore() — syncs score from /api/users/me into authStore
  affects:
    - puzzle-fragments/src/store/authStore.js
    - puzzle-fragments/src/store/useProjectStore.js
tech_stack:
  added: []
  patterns:
    - setScore merges score into user via spread — avoids full user object replacement
    - fetchUserScore calls useAuthStore.getState().setScore() — cross-store communication via getState()
    - approveAttempt/rejectAttempt follow publishAttempt error-handling pattern exactly
    - createProject reward defaults to 1 — backward-compatible with callers that omit the param
key_files:
  created: []
  modified:
    - puzzle-fragments/src/store/authStore.js
    - puzzle-fragments/src/store/useProjectStore.js
decisions:
  - setScore placed after init() inside the persist callback — consistent ordering with existing actions
  - fetchUserScore uses try/catch with console.error (not throw) — score sync is a best-effort operation, not load-blocking
  - reward = 1 default in createProject signature — callers that omit reward (existing UI) continue to work
metrics:
  duration: "~2 minutes"
  completed: "2026-04-30"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 5 Plan 02: Frontend Store Scoring Actions Summary

**One-liner:** Extended authStore with setScore and useProjectStore with approveAttempt, rejectAttempt, fetchUserScore, and reward-aware createProject — wiring the frontend stores to the Phase 5 backend endpoints.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add setScore action to authStore | 9e86cb0 | puzzle-fragments/src/store/authStore.js |
| 2 | Add approveAttempt, rejectAttempt, fetchUserScore; update createProject | bca4569 | puzzle-fragments/src/store/useProjectStore.js |

## What Was Built

### authStore.setScore (Task 1)

Added `setScore(score)` inside the `persist((set, get) => ({ ... }))` callback after the `init()` method:

```javascript
setScore(score) {
  set((state) => ({
    user: state.user ? { ...state.user, score } : state.user,
  }))
},
```

- Merges only the `score` field into the existing user object using spread
- Guards against null user (does nothing if not logged in)
- The existing `partialize` configuration already persists the full `user` object to localStorage — no change needed there

### useProjectStore updates (Task 2)

**createProject** — signature extended with `reward = 1` default parameter; `JSON.stringify` body now includes `reward`:
```javascript
async createProject(name, description, reward = 1) { ... body: JSON.stringify({ name, description, reward }) }
```

**approveAttempt(attemptId)** — POSTs to `/api/attempts/${attemptId}/approve`, then on success updates `currentProject.status = 'closed'` and maps the approved attempt to `status: 'approved'` in the attempts array.

**rejectAttempt(attemptId)** — POSTs to `/api/attempts/${attemptId}/reject`, maps the rejected attempt to `status: 'rejected'` in the attempts array (project status unchanged).

**fetchUserScore()** — GETs `/api/users/me`, calls `useAuthStore.getState().setScore(data.score)` on success. Wrapped in try/catch — failure is logged but does not throw (score sync is non-blocking).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all store actions are fully implemented. The UI layer (wave 3, plan 03) will call these actions.

## Threat Flags

None — no new security surface. Client-side store actions rely entirely on server-side RBAC guards (requireRole('admin') on approve/reject endpoints, requireAuth on /users/me) as specified in T-05-07, T-05-08, T-05-09.

## Self-Check: PASSED

- puzzle-fragments/src/store/authStore.js: FOUND
- puzzle-fragments/src/store/useProjectStore.js: FOUND
- Commit 9e86cb0: FOUND
- Commit bca4569: FOUND
