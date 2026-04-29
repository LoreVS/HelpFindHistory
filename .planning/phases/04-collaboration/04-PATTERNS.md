# Phase 4: Collaboration - Pattern Map

**Mapped:** 2026-04-26
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `server/routes/projects.js` | route (modify) | request-response | itself (refactor) | self-refactor |
| `server/routes/attempts.js` | route (new) | CRUD + request-response | `server/routes/projects.js` | role-match |
| `server/index.js` | config (modify) | — | itself (line 35 pattern) | self-extend |
| `puzzle-fragments/src/store/useProjectStore.js` | store (modify) | request-response | itself (existing actions) | self-extend |
| `puzzle-fragments/src/pages/ProjectDetailPage.jsx` | component (modify) | request-response + event-driven | itself (existing patterns) | self-extend |
| `puzzle-fragments/src/pages/ProjectDetailPage.css` | config (modify) | — | itself (existing classes) | self-extend |

---

## Pattern Assignments

### `server/routes/projects.js` (route, self-refactor)

**Change:** Remove router-level `router.use(requireAuth, requireRole('admin'))` and add inline middleware to each route.

**Current state** (lines 1-14):
```javascript
'use strict'

const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')

const db = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

// All routes require auth + admin role (D-19)
router.use(requireAuth, requireRole('admin'))
```

**Target pattern — remove line 14, add inline guards:**
```javascript
// REMOVE this line entirely:
router.use(requireAuth, requireRole('admin'))

// GET / — open to all authenticated users; filter by role server-side
router.get('/', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'admin'
  const projects = db.prepare(`
    SELECT p.*, COUNT(f.id) AS fragment_count
    FROM projects p
    LEFT JOIN fragments f ON f.project_id = p.id
    ${isAdmin ? '' : "WHERE p.status = 'open'"}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all()
  return res.json(projects)
})

// GET /:id — open to all authenticated users; inject solution when closed
router.get('/:id', requireAuth, (req, res) => {
  // ... existing body ...
  let solution = null
  if (project.status === 'closed') {
    solution = db.prepare(`
      SELECT a.layout, u.email AS submitter_email
      FROM attempts a
      JOIN users u ON u.id = a.user_id
      WHERE a.project_id = ? AND a.status = 'approved'
      ORDER BY a.reviewed_at DESC
      LIMIT 1
    `).get(req.params.id)
    if (solution) {
      try { solution = { ...solution, layout: JSON.parse(solution.layout) } } catch { /* leave as string */ }
    }
  }
  return res.json({ ...project, fragments: fragsWithMeta, attempts, solution })
})

// All write routes remain admin-only — inline guard added to each:
router.post('/', requireAuth, requireRole('admin'), (req, res) => { /* unchanged body */ })
router.post('/:id/fragments', requireAuth, requireRole('admin'), upload.single('file'), (req, res) => { /* unchanged body */ })
router.patch('/:id/layout', requireAuth, requireRole('admin'), (req, res) => { /* unchanged body */ })
router.post('/:id/close', requireAuth, requireRole('admin'), (req, res) => { /* unchanged body */ })
```

**Existing metadata JSON parse pattern** (lines 67-70) — reuse for solution layout:
```javascript
metadata: (() => { try { return JSON.parse(f.metadata) } catch { return {} } })(),
```

**Existing attempts JOIN query** (lines 73-79) — analog for solution JOIN:
```javascript
const attempts = db.prepare(`
  SELECT a.id, a.status, a.submitted_at, u.email AS submitter_email
  FROM attempts a
  JOIN users u ON u.id = a.user_id
  WHERE a.project_id = ? AND a.status IN ('published', 'approved', 'rejected')
  ORDER BY a.submitted_at DESC
`).all(req.params.id)
```

**ISO timestamp pattern** (line 146, `closeProject` route):
```javascript
const closedAt = new Date().toISOString()
```

---

### `server/routes/attempts.js` (route, new file — CRUD)

**Analog:** `server/routes/projects.js` (same router structure, same db import, same middleware imports)

**File scaffold pattern** (copy from projects.js lines 1-11):
```javascript
'use strict'

const express = require('express')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// All attempt routes require auth only — no admin role
router.use(requireAuth)
```

**GET /projects/:id/attempts/me — fetch current user's draft:**
```javascript
router.get('/projects/:id/attempts/me', (req, res) => {
  const attempt = db.prepare(
    "SELECT * FROM attempts WHERE project_id = ? AND user_id = ? AND status = 'draft'"
  ).get(Number(req.params.id), req.user.id)
  if (!attempt) return res.status(404).json({ error: 'No draft found.' })
  return res.json({
    ...attempt,
    layout: (() => { try { return JSON.parse(attempt.layout) } catch { return {} } })(),
  })
})
```

**POST /projects/:id/attempts — upsert draft (db.transaction pattern):**

Analog for `db.transaction` is `PATCH /:id/layout` handler (projects.js lines 123-133):
```javascript
const updateStmt = db.prepare('UPDATE fragments SET metadata = ? WHERE id = ? AND project_id = ?')
const updateAll = db.transaction((items) => {
  for (const item of items) {
    if (!item.id || !item.metadata) continue
    updateStmt.run(JSON.stringify(item.metadata), item.id, Number(req.params.id))
  }
})
updateAll(fragments)
```

Full upsert route:
```javascript
router.post('/projects/:id/attempts', (req, res) => {
  const projectId = Number(req.params.id)
  const userId = req.user.id
  const { layout } = req.body

  if (!layout) return res.status(400).json({ error: 'layout is required.' })

  // Validate project exists and is open
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  if (project.status === 'closed') {
    return res.status(409).json({ error: 'Cannot save attempt on a closed project.' })
  }

  const upsert = db.transaction(() => {
    const existing = db.prepare(
      "SELECT id FROM attempts WHERE project_id = ? AND user_id = ? AND status = 'draft'"
    ).get(projectId, userId)

    if (existing) {
      db.prepare("UPDATE attempts SET layout = ? WHERE id = ?")
        .run(JSON.stringify(layout), existing.id)
      return db.prepare('SELECT * FROM attempts WHERE id = ?').get(existing.id)
    } else {
      const result = db.prepare(
        'INSERT INTO attempts (project_id, user_id, layout, status) VALUES (?, ?, ?, ?)'
      ).run(projectId, userId, JSON.stringify(layout), 'draft')
      return db.prepare('SELECT * FROM attempts WHERE id = ?').get(result.lastInsertRowid)
    }
  })

  const attempt = upsert()
  return res.json(attempt)
})
```

**POST /attempts/:id/publish — owner check + status transition:**

Analog for `req.user.id` ownership check: `requireAuth` attaches `req.user = { id: Number(payload.sub), role: payload.role }` (auth.js line 41). Analog for status update + ISO timestamp: `closeProject` route (projects.js lines 146-152).

```javascript
router.post('/attempts/:id/publish', (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(req.params.id)
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' })
  if (attempt.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' })
  if (attempt.status !== 'draft') return res.status(409).json({ error: 'Only draft attempts can be published.' })

  const submittedAt = new Date().toISOString()
  db.prepare("UPDATE attempts SET status = 'published', submitted_at = ? WHERE id = ?")
    .run(submittedAt, Number(req.params.id))

  const updated = db.prepare('SELECT * FROM attempts WHERE id = ?').get(req.params.id)
  return res.json(updated)
})

module.exports = router
```

---

### `server/index.js` (config, line addition)

**Analog:** Line 35 in the existing file:
```javascript
app.use('/api/projects', require('./routes/projects'));
```

**New line to add** — mount attempts router at `/api` (the attempts router uses full sub-paths `/projects/:id/attempts` and `/attempts/:id/publish`):
```javascript
app.use('/api', require('./routes/attempts'));
```

**Placement:** Add immediately after line 35 (`app.use('/api/projects', ...)`), before the uploads static middleware.

---

### `puzzle-fragments/src/store/useProjectStore.js` (store, extend)

**Analog:** All existing actions in the same file. The three new actions follow the exact same fetch/error/return shape.

**authHeaders pattern** (lines 6-11 — the canonical pattern all new actions must use):
```javascript
function authHeaders() {
  const token = useAuthStore.getState().token
  return {
    Authorization: `Bearer ${token}`,
  }
}
```

**GET action pattern** — analog is `fetchProject` (lines 36-46):
```javascript
async fetchProject(id) {
  set({ loading: true, error: null, currentProject: null })
  try {
    const res = await fetch(`${API}/api/projects/${id}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const project = await res.json()
    set({ currentProject: project, loading: false })
  } catch (err) {
    set({ error: err.message, loading: false })
  }
},
```

**POST action with JSON body pattern** — analog is `createProject` / `saveLayout` (lines 49-62 / 101-112):
```javascript
const res = await fetch(`${API}/api/projects`, {
  method: 'POST',
  headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, description }),
})
if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error || `HTTP ${res.status}`)
}
return await res.json()
```

**POST action no body pattern** — analog is `closeProject` (lines 115-133):
```javascript
const res = await fetch(`${API}/api/projects/${projectId}/close`, {
  method: 'POST',
  headers: authHeaders(),
})
if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error || `HTTP ${res.status}`)
}
```

**Three new actions to add** (place after `closeProject`, before `updateLocalFragment`):
```javascript
/** GET /api/projects/:id/attempts/me — fetch current user's draft (returns null if none) */
async fetchUserDraft(projectId) {
  try {
    const res = await fetch(`${API}/api/projects/${projectId}/attempts/me`, {
      headers: authHeaders(),
    })
    if (res.status === 404) return null   // no draft yet — not an error
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[fetchUserDraft]', err)
    return null
  }
},

/** POST /api/projects/:id/attempts — upsert draft layout */
async saveDraft(projectId, layout) {
  const res = await fetch(`${API}/api/projects/${projectId}/attempts`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return await res.json()
},

/** POST /api/attempts/:id/publish — lock attempt as published */
async publishAttempt(attemptId) {
  const res = await fetch(`${API}/api/attempts/${attemptId}/publish`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return await res.json()
},
```

---

### `puzzle-fragments/src/pages/ProjectDetailPage.jsx` (component, extend)

**Analog:** The file itself. All new patterns are extensions of established patterns within.

**Store destructure — add new actions** (analog: line 218):
```javascript
// Existing:
const { currentProject, loading, error, fetchProject, saveLayout, closeProject } = useProjectStore()

// Extended:
const { currentProject, loading, error, fetchProject, saveLayout, closeProject,
        fetchUserDraft, saveDraft, publishAttempt } = useProjectStore()
```

**New local state variables** (analog: lines 221-225 — existing state declarations):
```javascript
const [canvasFragments, setCanvasFragments] = useState([])
const [saving, setSaving]   = useState(false)
const [saveMsg, setSaveMsg] = useState(null)
const [closing, setClosing] = useState(false)
// ADD:
const [currentAttemptId, setCurrentAttemptId] = useState(null)
const [isPublished, setIsPublished] = useState(false)
const [showPublishConfirm, setShowPublishConfirm] = useState(false)
const [publishing, setPublishing] = useState(false)
```

**Canvas hydration useEffect — three-way load** (replaces lines 231-236):

Existing pattern to extend:
```javascript
// Existing (lines 231-236):
useEffect(() => {
  if (!currentProject) return
  const mapped = currentProject.fragments.map((f, i) => toCanvasFragment(f, i))
  setCanvasFragments(mapped)
}, [currentProject])
```

Extended to three-way:
```javascript
useEffect(() => {
  if (!currentProject) return

  if (currentProject.status === 'closed') {
    // COLLAB-05: load approved solution layout (read-only)
    const sol = currentProject.solution
    if (sol?.layout && currentProject.fragments.length) {
      const mapped = currentProject.fragments.map((f, i) => {
        const pos = Array.isArray(sol.layout) ? sol.layout.find(l => l.id === f.id) : null
        const base = toCanvasFragment(f, i)
        return pos ? { ...base, ...pos } : base
      })
      setCanvasFragments(mapped)
    } else {
      setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
    }
    return
  }

  if (role !== 'admin') {
    // COLLAB-02/03: fetch user draft; hydrate from draft or reference layout
    fetchUserDraft(currentProject.id).then((draft) => {
      if (draft?.layout && Array.isArray(draft.layout)) {
        const mapped = currentProject.fragments.map((f, i) => {
          const pos = draft.layout.find(l => l.id === f.id)
          const base = toCanvasFragment(f, i)
          return pos ? { ...base, ...pos } : base
        })
        setCanvasFragments(mapped)
        setCurrentAttemptId(draft.id)
        if (draft.status === 'published') setIsPublished(true)
      } else {
        setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
      }
    })
    return
  }

  // Admin: existing behavior unchanged
  setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
}, [currentProject, role])
```

**Note on layout key field** (Pitfall 2 from RESEARCH.md): `toCanvasFragment` sets `id: String(serverFrag.id)` (line 29) and `dbId: serverFrag.id` (line 30). When serializing layout for `saveDraft`, use `dbId` as the numeric key. When rehydrating, match on `l.id === f.id` where `f.id` is the numeric DB id. The safest serialization uses `dbId` as `id` in the stored layout:

```javascript
// Serialization for saveDraft — use numeric dbId as the key:
const layoutToSave = canvasFragments.map((f) => ({
  id: f.dbId,   // numeric DB id — matches f.id in fragments array
  x: f.x, y: f.y, rotation: f.rotation,
  scaleX: f.scaleX, scaleY: f.scaleY,
}))
```

**handleSaveAttempt — analog is handleSaveLayout** (lines 252-275):
```javascript
async function handleSaveLayout() {
  if (!currentProject) return
  setSaving(true)
  setSaveMsg(null)
  try {
    const updates = canvasFragments.map((f) => ({
      id: f.dbId,
      metadata: { x: f.x, y: f.y, rotation: f.rotation,
                  scaleX: f.scaleX, scaleY: f.scaleY,
                  width: f.width, height: f.height,
                  originalWidth: f.originalWidth, originalHeight: f.originalHeight },
    }))
    await saveLayout(currentProject.id, updates)
    setSaveMsg('Layout saved.')
    setTimeout(() => setSaveMsg(null), 3000)
  } catch (err) {
    setSaveMsg('Save failed: ' + err.message)
  } finally {
    setSaving(false)
  }
}
```

New `handleSaveAttempt` follows the same structure:
```javascript
async function handleSaveAttempt() {
  if (!currentProject) return
  setSaving(true)
  setSaveMsg(null)
  try {
    const layoutToSave = canvasFragments.map((f) => ({
      id: f.dbId, x: f.x, y: f.y, rotation: f.rotation,
      scaleX: f.scaleX, scaleY: f.scaleY,
    }))
    const attempt = await saveDraft(currentProject.id, layoutToSave)
    setCurrentAttemptId(attempt.id)
    setSaveMsg('Attempt saved.')
    setTimeout(() => setSaveMsg(null), 3000)
  } catch (err) {
    setSaveMsg('Save failed: ' + err.message)
  } finally {
    setSaving(false)
  }
}
```

**handlePublishAttempt — confirmation guard analog is handleClose** (lines 278-289):
```javascript
async function handleClose() {
  if (!currentProject) return
  if (!window.confirm('Close this project? It will become read-only.')) return
  setClosing(true)
  try {
    await closeProject(currentProject.id)
  } catch (err) {
    alert('Close failed: ' + err.message)
  } finally {
    setClosing(false)
  }
}
```

New `handlePublishAttempt` uses modal state instead of `window.confirm` (per UI-SPEC):
```javascript
async function handlePublishAttempt() {
  if (!currentAttemptId) return
  setPublishing(true)
  setSaveMsg(null)
  setShowPublishConfirm(false)
  try {
    await publishAttempt(currentAttemptId)
    setIsPublished(true)
    setSaveMsg('Attempt published.')
    setTimeout(() => setSaveMsg(null), 3000)
  } catch (err) {
    setSaveMsg('Publish failed: ' + err.message)
  } finally {
    setPublishing(false)
  }
}
```

**isClosed derivation** (line 296 — existing):
```javascript
const isClosed = currentProject?.status === 'closed'
```

**Role-conditional rendering pattern** (lines 360-380 — existing admin toolbar):
```jsx
{role === 'admin' && (
  <button className="btn-save-layout" onClick={handleSaveLayout}
    disabled={saving || isClosed} type="button">
    {saving ? 'Saving…' : 'Save Layout'}
  </button>
)}
{role === 'admin' && !isClosed && (
  <button className="btn-close-project" onClick={handleClose}
    disabled={closing} type="button">
    {closing ? 'Closing…' : 'Close Project'}
  </button>
)}
```

New user toolbar (same pattern, new classes):
```jsx
{role !== 'admin' && !isClosed && (
  <>
    {saveMsg && <span className={`save-msg${saveMsg.startsWith('Save failed') || saveMsg.startsWith('Publish failed') ? ' save-msg--error' : ''}`}>{saveMsg}</span>}
    <button className="btn-save-attempt" onClick={handleSaveAttempt}
      disabled={saving} type="button">
      {saving ? 'Saving…' : 'Save Attempt'}
    </button>
    {!isPublished && (
      <button className="btn-publish-attempt" onClick={() => setShowPublishConfirm(true)}
        disabled={publishing} type="button">
        {publishing ? 'Publishing…' : 'Publish Attempt'}
      </button>
    )}
  </>
)}
```

**ProjectCanvas call site** — add `readOnly` prop (analog: line 385):
```jsx
// Existing:
<ProjectCanvas fragments={canvasFragments} onFragmentUpdate={handleFragmentUpdate} />

// Extended:
<ProjectCanvas
  fragments={canvasFragments}
  onFragmentUpdate={handleFragmentUpdate}
  readOnly={isClosed}
/>
```

**ProjectCanvas component — accept readOnly prop** (analog: line 121 signature):
```jsx
// Existing:
function ProjectCanvas({ fragments, onFragmentUpdate }) {

// Extended:
function ProjectCanvas({ fragments, onFragmentUpdate, readOnly = false }) {
```

**Conditional Transformer** (analog: lines 196-204):
```jsx
// Existing:
<Transformer ref={trRef} rotateEnabled ... />

// Extended (conditional):
{!readOnly && (
  <Transformer ref={trRef} rotateEnabled
    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
    borderStroke="#e8b84b" borderStrokeWidth={1.5}
    anchorStroke="#e8b84b" anchorFill="#111111"
    anchorSize={9} anchorCornerRadius={2} rotateAnchorOffset={20}
  />
)}
```

**Pass readOnly to FragmentNode** (analog: lines 184-195 in ProjectCanvas render):
```jsx
<FragmentNode
  key={fragment.id}
  fragment={fragment}
  isSelected={isSelected}
  ownSegments={ownSegments}
  matchSegments={matchSegs}
  onSelect={readOnly ? () => {} : setSelectedId}
  onUpdate={onFragmentUpdate}
  readOnly={readOnly}
/>
```

**FragmentNode — accept readOnly prop** (analog: line 50 signature, Group at line 72):
```jsx
// Existing (line 50):
function FragmentNode({ fragment, isSelected, ownSegments, matchSegments, onSelect, onUpdate }) {

// Extended:
function FragmentNode({ fragment, isSelected, ownSegments, matchSegments, onSelect, onUpdate, readOnly = false }) {

// Group draggable and handlers (analog: lines 72-83):
// Existing:
<Group ref={groupRef} id={fragment.id} x={fragment.x} y={fragment.y}
  rotation={fragment.rotation} scaleX={fragment.scaleX} scaleY={fragment.scaleY}
  draggable
  onClick={() => onSelect(fragment.id)}
  onTap={() => onSelect(fragment.id)}
  onDragEnd={(e) => onUpdate(fragment.id, { x: e.target.x(), y: e.target.y() })}
  onTransformEnd={() => { ... onUpdate(fragment.id, {...}) }}
>

// Extended:
<Group ref={groupRef} id={fragment.id} x={fragment.x} y={fragment.y}
  rotation={fragment.rotation} scaleX={fragment.scaleX} scaleY={fragment.scaleY}
  draggable={!readOnly}
  onClick={readOnly ? undefined : () => onSelect(fragment.id)}
  onTap={readOnly ? undefined : () => onSelect(fragment.id)}
  onDragEnd={readOnly ? undefined : (e) => onUpdate(fragment.id, { x: e.target.x(), y: e.target.y() })}
  onTransformEnd={readOnly ? undefined : () => { const node = groupRef.current; if (!node) return; onUpdate(fragment.id, { x: node.x(), y: node.y(), rotation: node.rotation(), scaleX: node.scaleX(), scaleY: node.scaleY() }) }}
>
```

**ProjectDropzone sidebar — already gated; extend to hide for all non-admin** (analog: line 344):
```jsx
// Existing (always rendered):
<ProjectDropzone projectId={currentProject.id} onFragmentUploaded={handleFragmentUploaded} disabled={isClosed} />

// Extended (admin only):
{role === 'admin' && (
  <ProjectDropzone projectId={currentProject.id} onFragmentUploaded={handleFragmentUploaded} disabled={isClosed} />
)}
```

**Solver attribution — add below canvas wrap, inside `.detail-canvas-area`:**
```jsx
{isClosed && currentProject.solution && (
  <div className="canvas-solver">
    SOLVED BY: <span className="canvas-solver-email">{currentProject.solution.submitter_email}</span>
  </div>
)}
```

**Attempts section — gate as admin-only** (analog: line 392):
```jsx
// Existing (always rendered):
<div className="detail-attempts-section">

// Extended (admin only):
{role === 'admin' && (
  <div className="detail-attempts-section">
    ...
  </div>
)}
```

**Publish confirmation modal** — rendered at page root (analog: `AttemptRow` modal at lines 441-474):
```jsx
{showPublishConfirm && (
  <div className="attempt-modal-backdrop" onClick={() => setShowPublishConfirm(false)}>
    <div className="attempt-modal" onClick={(e) => e.stopPropagation()}>
      <h3>Publish attempt?</h3>
      <p className="publish-confirm-body">
        Once published, your arrangement is locked and cannot be edited.
      </p>
      <div className="attempt-modal-actions">
        <button className="btn-publish-confirm" onClick={handlePublishAttempt} type="button">
          Publish now
        </button>
        <button className="btn-modal-close" onClick={() => setShowPublishConfirm(false)} type="button">
          Keep editing
        </button>
      </div>
    </div>
  </div>
)}
```

**Canvas toolbar read-only label for closed projects (user view):**
```jsx
{isClosed && role !== 'admin' && (
  <span className="canvas-toolbar-readonly">READ-ONLY · Approved Solution</span>
)}
```

---

### `puzzle-fragments/src/pages/ProjectDetailPage.css` (config, extend)

**Analog:** Existing classes in the same file. All new classes follow the same token values.

**Button pattern to copy** (lines 116-129 — `btn-save-layout`):
```css
.btn-save-layout {
  background: transparent;
  border: 1px solid #e8b84b;
  color: #e8b84b;
  padding: 5px 14px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-save-layout:hover:not(:disabled) { background: #e8b84b; color: #111; }
.btn-save-layout:disabled { opacity: 0.4; cursor: not-allowed; }
```

**Nine new classes to add** (all defined in UI-SPEC `04-UI-SPEC.md`, section "New Phase 4 UI Elements"):

```css
/* ── Phase 4: User Attempt Toolbar ──────────────────────────────── */

/* Matches .btn-save-layout — amber outline, fills on hover; 0.78rem per Phase 4 typography contract */
.btn-save-attempt {
  background: transparent;
  border: 1px solid #e8b84b;
  color: #e8b84b;
  padding: 4px 16px;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-save-attempt:hover:not(:disabled) { background: #e8b84b; color: #111; }
.btn-save-attempt:disabled { opacity: 0.4; cursor: not-allowed; }

/* Identical to .btn-save-attempt — distinguished only by label, not color */
.btn-publish-attempt {
  background: transparent;
  border: 1px solid #e8b84b;
  color: #e8b84b;
  padding: 4px 16px;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-publish-attempt:hover:not(:disabled) { background: #e8b84b; color: #111; }
.btn-publish-attempt:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Phase 4: Publish Confirm Dialog ─────────────────────────────── */

/* Solid amber fill — permanent action severity (not destructive) */
.btn-publish-confirm {
  background: #e8b84b;
  color: #111111;
  border: none;
  padding: 8px 16px;
  font-family: 'Courier New', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-publish-confirm:hover { opacity: 0.88; }

/* Override italic on .attempt-modal-placeholder for publish dialog warning copy */
.publish-confirm-body {
  color: #d4c5a9;
  font-size: 0.83rem;
  font-style: normal;
  line-height: 1.5;
  margin: 0;
}

/* ── Phase 4: Error feedback modifier ────────────────────────────── */

.save-msg--error {
  color: #e05c5c;
}

/* ── Phase 4: Draft status badge ─────────────────────────────────── */

.attempt-status--draft {
  background: #1a1a2a;
  color: #888;
  border: 1px solid #2a2a4a;
}

/* ── Phase 4: Read-only canvas toolbar label ─────────────────────── */

.canvas-toolbar-readonly {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: #555;
  text-transform: uppercase;
  font-style: normal;
}

/* ── Phase 4: Solver attribution (closed project) ────────────────── */

.canvas-solver {
  padding: 8px 16px;
  font-size: 0.78rem;
  color: #888;
  letter-spacing: 0.06em;
  border-top: 1px solid #222;
  background: #141414;
  flex-shrink: 0;
}

.canvas-solver-email {
  color: #d4c5a9;
  font-weight: 400;
}
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `server/middleware/auth.js` lines 16-63
**Apply to:** `server/routes/attempts.js` (all routes via `router.use(requireAuth)`)

```javascript
// requireAuth attaches req.user = { id: Number(payload.sub), role: payload.role }
// requireRole(role) checks req.user.role === role → 403 if mismatch
const { requireAuth, requireRole } = require('../middleware/auth')
```

### Database Driver Pattern
**Source:** `server/db.js` and usage throughout `server/routes/projects.js`
**Apply to:** `server/routes/attempts.js`

```javascript
// better-sqlite3 is synchronous — no await, no .then()
const db = require('../db')
const row = db.prepare('SELECT * FROM table WHERE id = ?').get(id)    // single row
const rows = db.prepare('SELECT * FROM table').all()                   // array
const result = db.prepare('INSERT INTO ...').run(...)                  // { lastInsertRowid }
const tx = db.transaction((args) => { /* sync ops */ })
tx(args)  // execute
```

### Express Router File Shape
**Source:** `server/routes/auth.js` lines 1-9, `server/routes/projects.js` lines 1-14
**Apply to:** `server/routes/attempts.js`

```javascript
'use strict'
const express = require('express')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const router = express.Router()
// ... routes ...
module.exports = router
```

### Frontend authHeaders
**Source:** `puzzle-fragments/src/store/useProjectStore.js` lines 6-11
**Apply to:** All three new store actions (`fetchUserDraft`, `saveDraft`, `publishAttempt`)

```javascript
function authHeaders() {
  const token = useAuthStore.getState().token
  return { Authorization: `Bearer ${token}` }
}
```

### Error Handling (fetch actions)
**Source:** `useProjectStore.js` lines 54-58 (createProject pattern)
**Apply to:** `saveDraft`, `publishAttempt`

```javascript
if (!res.ok) {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error || `HTTP ${res.status}`)
}
```

### Role-Conditional JSX
**Source:** `ProjectDetailPage.jsx` lines 334, 360-380
**Apply to:** All new conditional UI sections in ProjectDetailPage

```jsx
{role === 'admin' && <AdminOnlyElement />}
{role !== 'admin' && !isClosed && <UserOpenProjectElement />}
{isClosed && condition && <ClosedProjectElement />}
```

### Feedback Message + Timeout Clear
**Source:** `ProjectDetailPage.jsx` lines 265-270
**Apply to:** `handleSaveAttempt`, `handlePublishAttempt`

```javascript
setSaveMsg('Layout saved.')
setTimeout(() => setSaveMsg(null), 3000)
```

### ISO Timestamp
**Source:** `server/routes/projects.js` line 146
**Apply to:** `POST /attempts/:id/publish` in `server/routes/attempts.js`

```javascript
const submittedAt = new Date().toISOString()
```

---

## No Analog Found

All 6 files have analogs within the codebase. No file requires falling back to RESEARCH.md patterns exclusively.

---

## Critical Pitfalls (from RESEARCH.md — must be checked during implementation)

| Pitfall | File | Guard |
|---------|------|-------|
| Layout key field mismatch (`id` string vs `dbId` numeric) | `useProjectStore.js` saveDraft + `ProjectDetailPage.jsx` hydration | Store positional objects using `id: f.dbId` (numeric); rehydrate with `l.id === f.id` |
| `solution` is null on closed project with no approved attempt | `ProjectDetailPage.jsx` | Guard all solution accesses: `{isClosed && currentProject.solution && ...}` |
| Publish button not removed after publishing | `ProjectDetailPage.jsx` | Gate Publish button on `{!isPublished && ...}` — set `isPublished(true)` after `publishAttempt()` resolves |
| `fetchUserDraft` called for admin | `ProjectDetailPage.jsx` useEffect | Wrap entire draft-fetch branch with `if (role !== 'admin')` |
| Attempts router not registered | `server/index.js` | `app.use('/api', require('./routes/attempts'))` must be added |
| `router.use(requireRole('admin'))` blocks all new routes | `server/routes/projects.js` | Remove line 14 entirely before adding inline guards |

---

## Metadata

**Analog search scope:** `server/routes/`, `server/middleware/`, `server/`, `puzzle-fragments/src/store/`, `puzzle-fragments/src/pages/`, `puzzle-fragments/src/hooks/`
**Files read:** projects.js, auth.js (middleware), auth.js (routes), index.js, db.js, schema.sql, useProjectStore.js, ProjectDetailPage.jsx, ProjectDetailPage.css, useRole.js, 04-UI-SPEC.md
**Pattern extraction date:** 2026-04-26
