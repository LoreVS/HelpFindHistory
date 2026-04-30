---
phase: 05-scoring
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - server/schema.sql
  - server/db.js
  - server/routes/projects.js
  - server/routes/attempts.js
  - puzzle-fragments/src/store/authStore.js
  - puzzle-fragments/src/store/useProjectStore.js
  - puzzle-fragments/src/pages/ProjectsPage.jsx
  - puzzle-fragments/src/pages/ProjectDetailPage.jsx
  - puzzle-fragments/src/pages/ProjectDetailPage.css
  - puzzle-fragments/src/App.jsx
  - puzzle-fragments/src/App.css
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-30
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase delivers the scoring and attempt-review workflow: admins can approve or reject submitted attempts; approval atomically awards points, closes the project, and records a score row. The implementation is generally solid — the atomic transaction in `attempts.js` correctly serializes the four writes, and the UNIQUE constraint on `scores(user_id, attempt_id)` prevents double-awarding. However, one critical logic gap exists in the approve transaction (it does not guard against approving an attempt that belongs to an already-closed project), and several warning-level issues affect reliability and data integrity.

---

## Critical Issues

### CR-01: Approve transaction does not check whether project is already closed

**File:** `server/routes/attempts.js:116-135`
**Issue:** The `doApprove` transaction fetches the project row but only checks that the attempt status is `'published'`. It does not verify that `project.status === 'open'`. If two admin sessions race to approve two different published attempts on the same project simultaneously, the first approval closes the project and the second approval will still pass the `attempt.status !== 'published'` guard (the second attempt is still `'published'`), causing a second `scores` row to be inserted and the user score to be incremented again. The UNIQUE index on `scores(user_id, attempt_id)` prevents duplicate rows for the *same* attempt, but it does not block two distinct attempts from both being approved and both awarding points before either UPDATE is visible.

**Fix:**
```js
const doApprove = db.transaction((id) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id)
  if (!attempt || attempt.status !== 'published') return null

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(attempt.project_id)
  if (!project || project.status !== 'open') return null  // <-- add this guard

  const now = new Date().toISOString()
  // ... rest of writes unchanged
})
```

---

## Warnings

### WR-01: `handleApprove` in `AttemptRow` does not await `fetchProject` — error is silently swallowed

**File:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx:644-656`
**Issue:** `fetchProject(currentProject.id)` is called without `await`, so its result is never checked. If the re-fetch fails (e.g., network error), the UI state will be stale — the just-approved attempt may continue to appear as `'published'` and the admin can attempt to approve it again from stale state. Additionally, the outer `catch` logs the approve error but never surfaces it to the user via `setSaveMsg` or similar, leaving the admin with no feedback on failure.

**Fix:**
```jsx
async function handleApprove() {
  setApproving(true)
  try {
    await approveAttempt(attempt.id)
    if (currentProject?.id) await fetchProject(currentProject.id)  // await + propagate
    setShowModal(false)
  } catch (e) {
    console.error('[AttemptRow] approve failed:', e)
    // Surface error to the user — add an error state prop or lift state
  } finally {
    setApproving(false)
    setShowConfirm(false)
  }
}
```

### WR-02: `useProjectStore.approveAttempt` does not refresh `closed_at` or solution data after approval

**File:** `puzzle-fragments/src/store/useProjectStore.js:217-230`
**Issue:** After `approveAttempt` succeeds, the local store optimistically marks `status: 'closed'` and updates the attempt row, but does not set `closed_at`, `solution`, or `reward` on the `currentProject`. Because `ProjectDetailPage` reads `currentProject.solution` to display the solver attribution block and `AttemptRow` reads `currentProject.reward` for the confirmation copy, these values remain stale after approval. The solver attribution panel will not appear until the next full `fetchProject` call.

**Fix:** Either call `fetchProject` in `approveAttempt` to replace the full object, or explicitly merge the fields returned by the server:
```js
const updated = await res.json()
set((state) => {
  if (!state.currentProject) return {}
  return {
    currentProject: {
      ...state.currentProject,
      status: 'closed',
      closed_at: updated.reviewed_at ?? new Date().toISOString(),
      attempts: state.currentProject.attempts.map((a) =>
        a.id === attemptId ? { ...a, status: 'approved' } : a
      ),
    },
  }
})
```

### WR-03: `req.params.id` used directly as a SQLite bind value without numeric coercion in `projects.js`

**File:** `server/routes/projects.js:63, 68, 83, 93`
**Issue:** Several queries in `GET /api/projects/:id` pass `req.params.id` (a string) directly to `db.prepare(...).get(req.params.id)` and `.all(req.params.id)`. While `better-sqlite3` handles type coercion silently for integer primary keys, the inconsistency is a latent bug: if SQLite ever treats the string `'3abc'` differently from `3` in an integer column comparison (or if the ORM is swapped), queries will return wrong results rather than 404. The same `req.params.id` string is used as a URL segment to build the upload directory path in `multer.diskStorage.destination` (line 16), which does not sanitize it.

The upload directory path issue is more significant: a crafted project ID parameter such as `../../../etc` would resolve to an arbitrary directory outside `data/uploads/`. Multer's `diskStorage.destination` calls `fs.mkdirSync` on the constructed path.

**Fix for path traversal in multer destination:**
```js
destination(req, _file, cb) {
  const safeId = String(Number(req.params.id))  // coerce — NaN → 'NaN' which is harmless since project lookup will 404
  if (safeId === 'NaN') return cb(new Error('Invalid project id'), null)
  const dir = path.join(__dirname, '../data/uploads', safeId)
  fs.mkdirSync(dir, { recursive: true })
  cb(null, dir)
},
```

**Fix for query coercion (cosmetic but consistent):** wrap all `req.params.id` usages in `Number()` as already done for the close and layout routes.

### WR-04: `isPublished` flag is only set from the initial draft load; rejected attempts that later resume drafts will be incorrectly locked

**File:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx:297`
**Issue:** `setIsPublished(true)` is set when `draft.status === 'published' || draft.status === 'approved'`. However, if an attempt is `'rejected'`, the flag is never set to `false` on re-load — the code simply enters the `if (draft?.layout …)` branch and sets `isPublished(true)` only on published/approved. This is correct. But the inverse path is also problematic: when a user returns after a rejection, `isPublished` remains whatever it was initialised to (`false`), which is correct. The actual bug is more subtle: `isPublished` is never reset to `false` between `fetchProject` calls within the same component lifecycle. If the same `ProjectDetailPage` instance is reused via React Router (unlikely but possible with keep-alive patterns), and the user navigates from a published project to an open one, `isPublished` retains the previous value. The effect at line 266 has no cleanup of these attempt-specific derived flags. This is low-severity in current React Router usage but is a state-management smell.

More concretely: the "Publish Attempt" button is hidden via `{!isPublished && ...}` but "Save Attempt" is disabled via `disabled={saving || isPublished}`. If `isPublished` is `true` when it should be `false` (stale state), the user cannot save but cannot see why.

**Fix:** Reset attempt-specific flags inside the hydration effect:
```js
useEffect(() => {
  if (!currentProject) return
  setCurrentAttemptId(null)   // reset on project change
  setIsPublished(false)       // reset on project change
  // ... existing logic
}, [currentProject, role])
```

---

## Info

### IN-01: Hardcoded localhost base URL in store and component

**File:** `puzzle-fragments/src/store/useProjectStore.js:4`, `puzzle-fragments/src/pages/ProjectDetailPage.jsx:14`
**Issue:** `const API = 'http://localhost:3001'` and `const SERVER = 'http://localhost:3001'` are duplicated in two files as magic strings. This works in development but breaks in any other environment without a code change.

**Fix:** Extract to a Vite env variable (`import.meta.env.VITE_API_URL`) and set it in `.env.development` / `.env.production`.

### IN-02: `console.error` used for non-critical paths without user-visible feedback in store

**File:** `puzzle-fragments/src/store/useProjectStore.js:44, 159, 265`
**Issue:** `fetchMyAttempts`, `fetchUserDraft`, and `fetchUserScore` all catch errors with `console.error` and silently degrade (empty array or no-op). While graceful degradation is correct here, the debug `console.error` calls will appear in production browser consoles.

**Fix:** Replace with a no-op (or conditional logging) for production, e.g. wrap in `if (import.meta.env.DEV) console.error(...)`.

### IN-03: Duplicate `useProjectStore()` call in `AttemptRow` extracts two separate subscriptions

**File:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx:628-629`
**Issue:** `AttemptRow` calls `useProjectStore()` twice on consecutive lines to destructure `approveAttempt`/`rejectAttempt` and `fetchProject` respectively. Each call creates a separate store subscription, which is harmless functionally but is unnecessary overhead.

**Fix:** Merge into a single call:
```js
const { approveAttempt, rejectAttempt, fetchProject } = useProjectStore()
```

---

_Reviewed: 2026-04-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
