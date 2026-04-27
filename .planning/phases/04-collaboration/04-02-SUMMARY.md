---
phase: 04-collaboration
plan: 02
subsystem: frontend-store
tags: [zustand, fetch, async-actions, collaboration]
dependency_graph:
  requires: [04-01]
  provides: [fetchUserDraft, saveDraft, publishAttempt store actions]
  affects: [puzzle-fragments/src/pages/ProjectDetailPage.jsx]
tech_stack:
  added: []
  patterns: [authHeaders fetch pattern, POST JSON body pattern, POST no-body pattern]
key_files:
  created: []
  modified:
    - puzzle-fragments/src/store/useProjectStore.js
decisions:
  - fetchUserDraft returns null on both 404 and network errors — never throws (component handles null as no-draft state)
  - saveDraft and publishAttempt throw on non-OK responses so the calling component can manage error state
  - No new store state slices added — actions return data directly; component owns currentAttemptId and isPublished state
  - Removed unused 'get' parameter from create() callback to fix pre-existing no-unused-vars lint error
metrics:
  duration: ~5 minutes
  completed: 2026-04-28
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 4 Plan 02: Store Extension — fetchUserDraft, saveDraft, publishAttempt Summary

**One-liner:** Three async store actions added to useProjectStore following the established authHeaders/fetch pattern, decoupling the attempt API contract from the ProjectDetailPage component.

## What Was Built

Three new async actions in `puzzle-fragments/src/store/useProjectStore.js`, inserted after `closeProject` and before `updateLocalFragment`:

- **`fetchUserDraft(projectId)`** — GET `/api/projects/:id/attempts/me`; returns draft attempt row or `null` on 404/error (never throws)
- **`saveDraft(projectId, layout)`** — POST `/api/projects/:id/attempts` with `{ layout }` JSON body; returns upserted attempt row; throws on non-OK
- **`publishAttempt(attemptId)`** — POST `/api/attempts/:id/publish` with no request body; returns updated attempt row; throws on non-OK

All three use `authHeaders()` which reads the token via `useAuthStore.getState().token` on every invocation (T-04-FE-03 mitigation — always fresh token, never stale closure).

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add fetchUserDraft, saveDraft, publishAttempt to useProjectStore | 18d401c | puzzle-fragments/src/store/useProjectStore.js |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing no-unused-vars lint error on `get` parameter**
- **Found during:** Task 1 verification (npm run lint)
- **Issue:** `create((set, get) => ...)` — `get` was defined but never used; caused lint to exit with error code 1, failing the plan's acceptance criteria
- **Fix:** Removed `get` from the parameter list: `create((set) => ...)`
- **Files modified:** puzzle-fragments/src/store/useProjectStore.js
- **Commit:** 18d401c (included in same commit)

## Known Stubs

None. The three actions contain no stubs, hardcoded returns, or placeholder values.

## Threat Surface Scan

No new network endpoints or auth paths introduced in the frontend. The three actions call backend endpoints already defined in Plan 01. `authHeaders()` correctly reads the current token on every invocation per the existing pattern.

## Self-Check

- [x] `puzzle-fragments/src/store/useProjectStore.js` — exists and modified
- [x] Commit 18d401c exists in git log
- [x] `grep fetchUserDraft` shows function at line 136
- [x] `grep saveDraft` shows function at line 151
- [x] `grep publishAttempt` shows function at line 165
- [x] `return null` appears twice in fetchUserDraft (404 branch + catch branch)
- [x] `npm run lint` exits 0 errors

## Self-Check: PASSED
