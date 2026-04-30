# Phase 5: Scoring - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 11
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `server/routes/attempts.js` | route/controller | request-response | `server/routes/attempts.js` (publish handler, lines 88-100) | exact |
| `server/routes/projects.js` | route/controller | request-response | `server/routes/projects.js` (POST /, lines 29-40) | exact |
| `server/schema.sql` | migration | n/a | `server/schema.sql` (projects table, lines 13-21) | exact |
| `server/db.js` | config/reference | n/a | `server/routes/attempts.js` (upsert transaction, lines 58-83) | role-match |
| `puzzle-fragments/src/pages/ProjectDetailPage.jsx` | component | request-response | `ProjectDetailPage.jsx` (AttemptRow + showPublishConfirm modal, lines 586-673) | exact |
| `puzzle-fragments/src/pages/ProjectsPage.jsx` | component | request-response | `ProjectsPage.jsx` (new-project-form, lines 86-117) | exact |
| `puzzle-fragments/src/store/useProjectStore.js` | store | request-response | `useProjectStore.js` (publishAttempt + closeProject, lines 129-189) | exact |
| `puzzle-fragments/src/store/authStore.js` | store | request-response | `authStore.js` (full file) | exact |
| `puzzle-fragments/src/App.jsx` | component | request-response | `App.jsx` (CanvasApp header with role/token guards, lines 14-52) | exact |
| `puzzle-fragments/src/App.css` | style | n/a | `App.css` (.admin-badge, lines 575-587) | exact |
| `puzzle-fragments/src/pages/ProjectDetailPage.css` | style | n/a | `ProjectDetailPage.css` (.attempt-modal, lines 215-285) | exact |

---

## Pattern Assignments

### server/routes/attempts.js - add POST approve and POST reject endpoints

**Analog:** `server/routes/attempts.js` (publish handler lines 86-100) and PATCH layout transaction in `server/routes/projects.js` (lines 127-152)

**Imports/router setup** (lines 1-10 of attempts.js):

```javascript
'use strict'

const express = require('express')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)
```

**requireRole import and per-route guard** - requireRole('admin') added per-route (from projects.js lines 9, 29):

```javascript
const { requireAuth, requireRole } = require('../middleware/auth')
// Per-route on the approve/reject handlers:
router.post('/attempts/:id/approve', requireRole('admin'), (req, res) => { ... })
router.post('/attempts/:id/reject',  requireRole('admin'), (req, res) => { ... })
```

**IDOR guard before mutation** (lines 88-92 of attempts.js - adapt for admin role):

```javascript
const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(Number(req.params.id))
if (!attempt) return res.status(404).json({ error: 'Attempt not found.' })
if (attempt.status !== 'published') return res.status(409).json({ error: 'Only published attempts can be approved.' })
```

**db.transaction() four-write approve pattern** - modeled on upsert transaction (lines 58-83 of attempts.js):

```javascript
const doApprove = db.transaction((attemptId) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId)
  if (!attempt || attempt.status !== 'published') return null

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(attempt.project_id)
  if (!project) return null

  const now = new Date().toISOString()

  db.prepare("UPDATE attempts SET status = 'approved', reviewed_at = ? WHERE id = ?")
    .run(now, attemptId)
  db.prepare("UPDATE projects SET status = 'closed', closed_at = ? WHERE id = ?")
    .run(now, attempt.project_id)
  db.prepare('INSERT INTO scores (user_id, attempt_id, project_id, points) VALUES (?, ?, ?, ?)')
    .run(attempt.user_id, attemptId, attempt.project_id, project.reward)
  db.prepare('UPDATE users SET score = score + ? WHERE id = ?')
    .run(project.reward, attempt.user_id)

  return db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId)
})

const updated = doApprove(Number(req.params.id))
if (!updated) return res.status(409).json({ error: 'Attempt cannot be approved.' })
return res.json(updated)
```

**Reject pattern** - single-write, mirrors publish handler (lines 94-98):

```javascript
const now = new Date().toISOString()
db.prepare("UPDATE attempts SET status = 'rejected', reviewed_at = ? WHERE id = ?")
  .run(now, Number(req.params.id))
const updated = db.prepare('SELECT * FROM attempts WHERE id = ?').get(Number(req.params.id))
return res.json(updated)
```

**NOTE: GET /api/projects/:id attempts query** (projects.js lines 73-79) does NOT currently select `a.layout`. Add it for Phase 5 canvas preview:

```javascript
// Change SELECT a.id, a.status, a.submitted_at, u.email AS submitter_email
// To:     SELECT a.id, a.layout, a.status, a.submitted_at, u.email AS submitter_email
```

---

### server/routes/projects.js - add reward field to POST /api/projects

**Analog:** `server/routes/projects.js` POST / handler (lines 29-40)

**Current handler** (lines 29-40):

```javascript
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { name, description = '' } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required.' })
  }
  const result = db.prepare(
    'INSERT INTO projects (owner_id, name, description) VALUES (?, ?, ?)'
  ).run(req.user.id, name.trim(), description.trim())

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json(project)
})
```

**Modifications needed:**

```javascript
const { name, description = '', reward = 1 } = req.body
// Add after name check:
const rewardNum = Number(reward)
if (!Number.isInteger(rewardNum) || rewardNum < 1) {
  return res.status(400).json({ error: 'reward must be an integer >= 1.' })
}
// Update INSERT:
'INSERT INTO projects (owner_id, name, description, reward) VALUES (?, ?, ?, ?)'
// .run(req.user.id, name.trim(), description.trim(), rewardNum)
```

---

### server/schema.sql - add reward column to projects table

**Analog:** `server/schema.sql` projects table (lines 13-21) and users.score column (line 9)

**Pattern for new column** - follow `score INTEGER NOT NULL DEFAULT 0` on users (line 9):

```sql
reward      INTEGER NOT NULL DEFAULT 1,
```

Insert after the `description` line inside the projects CREATE TABLE block.

**Migration guard** - follow the `CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique` pattern (line 54) for existing databases. Append a separate ALTER TABLE after the main DDL block, since SQLite `CREATE TABLE IF NOT EXISTS` does not add columns to existing tables:

```sql
-- Migration: add reward column to existing databases (safe to run repeatedly via try/catch in db.js)
ALTER TABLE projects ADD COLUMN reward INTEGER NOT NULL DEFAULT 1;
```

This needs to be wrapped in a try/catch in db.js or executed as a separate idempotent step, since SQLite throws if the column already exists.

---

### server/db.js - reference only (no modification needed)

`db.transaction()` is already available on the exported `db` instance (better-sqlite3 synchronous API). No changes to db.js.

**Transaction call pattern** - from attempts.js lines 58, 81:

```javascript
const upsert = db.transaction(() => {
  // synchronous SQLite calls - no await
  return result
})
const attempt = upsert()   // call the transaction
```

**Multi-argument transaction** (for approve):

```javascript
const doApprove = db.transaction((attemptId) => { ... })
const updated = doApprove(Number(req.params.id))
```

---

### puzzle-fragments/src/pages/ProjectDetailPage.jsx - fill AttemptRow stubs, add confirmation modal, wire canvas preview

**Analog:** `ProjectDetailPage.jsx` - AttemptRow stub (lines 617-673) and showPublishConfirm modal (lines 586-612)

**AttemptRow local state additions** - extend lines 618-619 with Phase 5 state:

```jsx
function AttemptRow({ attempt, currentProject }) {
  const [showModal,   setShowModal]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [approving,   setApproving]   = useState(false)
  const [rejecting,   setRejecting]   = useState(false)
  const role = useRole()
  const { approveAttempt, rejectAttempt } = useProjectStore()
```

**Canvas preview inside AttemptRow modal** - reuse COLLAB-05 solution hydration pattern (lines 270-278):

```jsx
// Map attempt.layout positions onto project fragments (mirrors solution canvas, lines 270-278):
const previewFragments = useMemo(() => {
  if (!currentProject?.fragments || !attempt.layout) return []
  return currentProject.fragments.map((f, i) => {
    const pos = attempt.layout.find(l => l.id === f.id)
    const base = toCanvasFragment(f, i)
    return pos ? { ...base, ...pos } : base
  })
}, [currentProject, attempt.layout])

// Inside modal JSX:
<div className="attempt-modal-canvas">
  <ProjectCanvas
    fragments={previewFragments}
    onFragmentUpdate={() => {}}
    readOnly={true}
  />
</div>
```

**Approve button - replaces stub** - triggers confirmation modal (not direct action):

```jsx
// Replace line 649-651:
{role === 'admin' && (
  <button
    className="btn-approve"
    onClick={() => setShowConfirm(true)}
    disabled={attempt.status !== 'published'}
    type="button"
  >
    Approve
  </button>
)}
```

**Reject button - replaces stub** - immediate action, no confirm (mirrors publish handler pattern):

```jsx
// Replace lines 656-660:
{role === 'admin' && (
  <button
    className="btn-reject"
    onClick={async () => {
      setRejecting(true)
      try { await rejectAttempt(attempt.id) } catch (e) { console.error(e) }
      setRejecting(false)
      setShowModal(false)
    }}
    disabled={rejecting || attempt.status !== 'published'}
    type="button"
  >
    {rejecting ? 'Rejecting...' : 'Reject'}
  </button>
)}
```

**Confirmation modal** - copies showPublishConfirm pattern (lines 586-611):

```jsx
{showConfirm && (
  <div className="attempt-modal-backdrop" onClick={() => setShowConfirm(false)}>
    <div className="attempt-modal" onClick={(e) => e.stopPropagation()}>
      <h3>Approve this attempt?</h3>
      <p className="publish-confirm-body">
        This will close the project and award {currentProject?.reward ?? '?'} pts to {attempt.submitter_email}.
      </p>
      <div className="attempt-modal-actions">
        <button
          className="btn-approve"
          onClick={async () => {
            setApproving(true)
            try { await approveAttempt(attempt.id) } catch (e) { console.error(e) }
            setApproving(false)
            setShowConfirm(false)
            setShowModal(false)
          }}
          disabled={approving}
          type="button"
        >
          {approving ? 'Approving...' : 'Confirm Approve'}
        </button>
        <button className="btn-modal-close" onClick={() => setShowConfirm(false)} type="button">
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

**Rejected attempt re-enable** - extend the useEffect hydration (line 295). No change needed: `rejected` falls through the existing condition and the canvas stays editable:

```jsx
// Existing (line 295):
if (draft.status === 'published' || draft.status === 'approved') setIsPublished(true)
// 'rejected' status is not in this condition, so isPublished stays false => canvas + Save/Publish buttons remain active
```

---

### puzzle-fragments/src/pages/ProjectsPage.jsx - add reward number input to New Project form

**Analog:** `ProjectsPage.jsx` New Project form (lines 86-117) and form state (lines 19-23)

**Add reward state** (after line 22):

```jsx
const [newReward, setNewReward] = useState(1)
```

**handleCreate modification** (line 41) - pass reward to createProject:

```jsx
const project = await createProject(newName.trim(), newDesc.trim(), Number(newReward))
```

**New reward form field** - copy form-group pattern (lines 88-99), insert after description textarea block (after line 108):

```jsx
<div className="form-group">
  <label htmlFor="proj-reward">Reward (points)</label>
  <input
    id="proj-reward"
    type="number"
    min={1}
    value={newReward}
    onChange={(e) => setNewReward(e.target.value)}
    required
  />
</div>
```

---

### puzzle-fragments/src/store/useProjectStore.js - add approveAttempt, rejectAttempt, fetchUserScore

**Analog:** `useProjectStore.js` - publishAttempt (lines 179-189) for rejectAttempt shape; closeProject (lines 129-147) for approveAttempt local state update

**approveAttempt** - combines POST pattern + state update:

```javascript
async approveAttempt(attemptId) {
  const res = await fetch(`${API}/api/attempts/${attemptId}/approve`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const updated = await res.json()
  set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        status: 'closed',
        attempts: state.currentProject.attempts.map((a) =>
          a.id === attemptId ? { ...a, status: 'approved' } : a
        ),
      },
    }
  })
  return updated
},
```

**rejectAttempt** - mirrors publishAttempt (lines 179-189) exactly:

```javascript
async rejectAttempt(attemptId) {
  const res = await fetch(`${API}/api/attempts/${attemptId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const updated = await res.json()
  set((state) => {
    if (!state.currentProject) return {}
    return {
      currentProject: {
        ...state.currentProject,
        attempts: state.currentProject.attempts.map((a) =>
          a.id === attemptId ? { ...a, status: 'rejected' } : a
        ),
      },
    }
  })
  return updated
},
```

**fetchUserScore** - mirrors fetchMyAttempts error-silent pattern (lines 37-47):

```javascript
async fetchUserScore() {
  try {
    const res = await fetch(`${API}/api/users/me`, { headers: authHeaders() })
    if (!res.ok) return
    const data = await res.json()
    useAuthStore.getState().setScore(data.score)
  } catch (err) {
    console.error('[fetchUserScore]', err)
  }
},
```

**createProject modification** - add reward param (lines 63-77):

```javascript
async createProject(name, description, reward = 1) {
  const res = await fetch(`${API}/api/projects`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, reward }),
  })
  // ... rest unchanged
```

---

### puzzle-fragments/src/store/authStore.js - add setScore action and score to user shape

**Analog:** `authStore.js` - login/logout actions (lines 11-17)

**login pattern** (lines 11-13) - user object shape:

```javascript
login(token, user) {
  set({ token, user })
},
```

**Add setScore action** - follows same set() pattern:

```javascript
setScore(score) {
  set((state) => ({
    user: state.user ? { ...state.user, score } : state.user,
  }))
},
```

The `score` field will be present on the user object returned by login (server should include it). No change to partialize - `score` is part of `user` which is already persisted.

---

### puzzle-fragments/src/App.jsx - add score chip to headers

**Analog:** `App.jsx` - CanvasApp header role conditional (lines 30-32); `ProjectDetailPage.jsx` header right section (lines 448-453); `ProjectsPage.jsx` header right section (lines 63-68)

**Role-conditional admin badge pattern** (App.jsx lines 30-32):

```jsx
{role === 'admin' && (
  <span className="admin-badge">ADMIN</span>
)}
```

**Score chip - same conditional pattern, role=user**:

```jsx
{role === 'user' && (
  <span className="score-chip">★ {user?.score ?? 0}</span>
)}
```

**user read from authStore** - use same selector pattern as useRole.js:

```jsx
const user = useAuthStore((state) => state.user)
```

**Apply in both page headers:**

- `ProjectsPage.jsx` - insert before END SESSION button in `.projects-header-right` (line 65)
- `ProjectDetailPage.jsx` - insert before END SESSION button in `.detail-header-right` (line 450)

Score stays fresh by calling `fetchUserScore()` inside the same `useEffect` that calls `fetchProjects()` / `fetchProject()` on mount (role=user branch only).

---

### puzzle-fragments/src/App.css - score chip CSS

**Analog:** `App.css` - `.admin-badge` (lines 575-587); CSS variable `--green: #4ecb71` (line 13)

**admin-badge** (lines 575-587):

```css
.admin-badge {
  background: rgba(232, 184, 75, 0.15);
  border: 1px solid rgba(232, 184, 75, 0.4);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.08em;
  line-height: 1;
  flex-shrink: 0;
}
```

**score-chip** - copy admin-badge, swap accent color for green:

```css
.score-chip {
  background: rgba(78, 203, 113, 0.12);
  border: 1px solid rgba(78, 203, 113, 0.35);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--green);
  letter-spacing: 0.08em;
  line-height: 1;
  flex-shrink: 0;
}
```

---

### puzzle-fragments/src/pages/ProjectDetailPage.css - canvas-in-modal and wide modal CSS

**Analog:** `ProjectDetailPage.css` - `.attempt-modal` (lines 227-236), `.attempt-modal-backdrop` (lines 217-225)

The confirmation modal (D-07, second overlay) reuses `.attempt-modal-backdrop` and `.attempt-modal` unchanged - no new classes needed for it.

**New classes needed:**

```css
/* Wide variant for the review modal that contains the canvas preview */
.attempt-modal--wide {
  min-width: 560px;
  max-width: 860px;
  width: 90vw;
}

/* Canvas container inside the review modal */
.attempt-modal-canvas {
  width: 100%;
  height: 380px;
  border: 1px solid #2a2a2a;
  background: #111;
  position: relative;
  overflow: hidden;
}

/* Override canvas-wrap sizing within modal context */
.attempt-modal-canvas .canvas-wrap {
  width: 100%;
  height: 100%;
}
```

The `.publish-confirm-body` class (already in ProjectDetailPage.css near line 351) is reused for confirmation modal body text - no new class needed.

---

## Shared Patterns

### Authentication Headers
**Source:** `puzzle-fragments/src/store/useProjectStore.js` lines 6-11
**Apply to:** approveAttempt, rejectAttempt, fetchUserScore, updated createProject

```javascript
function authHeaders() {
  const token = useAuthStore.getState().token
  return { Authorization: `Bearer ${token}` }
}
```

### requireAuth + requireRole('admin') middleware
**Source:** `server/middleware/auth.js` lines 16-61; usage in `server/routes/projects.js` lines 9, 29
**Apply to:** POST /api/attempts/:id/approve and POST /api/attempts/:id/reject

```javascript
const { requireAuth, requireRole } = require('../middleware/auth')
router.post('/attempts/:id/approve', requireRole('admin'), (req, res) => { ... })
router.post('/attempts/:id/reject',  requireRole('admin'), (req, res) => { ... })
```

### Role-conditional rendering
**Source:** `puzzle-fragments/src/pages/ProjectDetailPage.jsx` lines 449, 476, 560
**Apply to:** Score chip (role=user), Approve/Reject buttons (role=admin)

```jsx
{role === 'admin' && <AdminControl />}
{role === 'user' && <UserControl />}
```

### db.transaction() for multi-write backend operations
**Source:** `server/routes/attempts.js` lines 58-83; `server/routes/projects.js` lines 143-149
**Apply to:** POST /api/attempts/:id/approve (4-write approve operation)

```javascript
const op = db.transaction((arg) => {
  // synchronous better-sqlite3 calls only - no await
  return result
})
const result = op(value)
if (!result) return res.status(409).json({ error: '...' })
```

### Store action error pattern
**Source:** `puzzle-fragments/src/store/useProjectStore.js` lines 68-71
**Apply to:** approveAttempt, rejectAttempt

```javascript
if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error || `HTTP ${res.status}`)
}
```

### Status badge CSS naming
**Source:** `puzzle-fragments/src/pages/ProjectDetailPage.css` lines 206-208
**Apply to:** No new statuses. `attempt-status--rejected` already styled.

---

## No Analog Found

All 11 files have direct analogs. One net-new endpoint has no existing route file counterpart:

| Item | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `GET /api/users/me` (new endpoint in attempts.js or a new users router) | route | request-response | No /users/ routes exist yet. Pattern: `db.prepare('SELECT id, score FROM users WHERE id = ?').get(req.user.id)` protected by `requireAuth` only, returning `{ id, score }`. |

---

## Metadata

**Analog search scope:** `server/routes/`, `server/middleware/`, `server/schema.sql`, `server/db.js`, `puzzle-fragments/src/store/`, `puzzle-fragments/src/pages/`, `puzzle-fragments/src/App.{jsx,css}`
**Files scanned:** 11 source files read in full or targeted sections
**Pattern extraction date:** 2026-04-29
