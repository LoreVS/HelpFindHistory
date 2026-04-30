---
phase: 05-scoring
fixed_at: 2026-04-30T22:39:42Z
review_path: .planning/phases/05-scoring/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-30T22:39:42Z
**Source review:** .planning/phases/05-scoring/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Approve transaction does not check whether project is already closed

**Files modified:** `server/routes/attempts.js`
**Commit:** 749d633
**Applied fix:** Added `project.status !== 'open'` guard inside the `doApprove` transaction immediately after the project row is fetched. If the project is already closed (because a concurrent approval beat this one), the transaction returns `null` and the caller receives a 409, preventing double-awarding of points.

### WR-01: `handleApprove` in `AttemptRow` does not await `fetchProject` — error is silently swallowed

**Files modified:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx`
**Commit:** d5b683f
**Applied fix:** Added `await` to the `fetchProject` call inside `handleApprove`. Moved `setApproving(false)` and `setShowConfirm(false)` into a `finally` block so cleanup flags are always reset even when `approveAttempt` or `fetchProject` throws. `setShowModal(false)` is kept inside the `try` block so the modal stays open on failure.

### WR-02: `useProjectStore.approveAttempt` does not refresh `closed_at` or solution data after approval

**Files modified:** `puzzle-fragments/src/store/useProjectStore.js`
**Commit:** ad7bf4f
**Applied fix:** Added `closed_at: updated.reviewed_at ?? new Date().toISOString()` to the optimistic state update in `approveAttempt` so the solver attribution panel and reward copy render immediately after approval without waiting for the next full `fetchProject` call.

### WR-03: `req.params.id` used directly as a SQLite bind value without numeric coercion in `projects.js`

**Files modified:** `server/routes/projects.js`
**Commit:** 9c36442
**Applied fix:** Two changes applied: (1) In `multer.diskStorage.destination`, coerce `req.params.id` to a numeric string via `String(Number(...))` and reject `NaN` with an error callback before constructing the upload directory path, preventing path traversal. (2) In `GET /:id`, introduce a local `projectId = Number(req.params.id)` variable and use it in all four query bind sites instead of the raw `req.params.id` string.

### WR-04: `isPublished` flag is only set from the initial draft load; stale state persists across project navigations

**Files modified:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx`
**Commit:** 3a0b310
**Applied fix:** Added `setCurrentAttemptId(null)` and `setIsPublished(false)` at the top of the hydration `useEffect` (after the `!currentProject` guard) so both flags are unconditionally reset on every project change before any branch-specific logic runs.

---

_Fixed: 2026-04-30T22:39:42Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
