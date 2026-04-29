# Phase 4: Collaboration - Research

**Researched:** 2026-04-26
**Domain:** Express route access control, SQLite upsert patterns, Konva read-only canvas, Zustand store extension, role-conditional React rendering
**Confidence:** HIGH — all findings sourced from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**User Project View (COLLAB-02)**
- D-01: Reuse `/projects/:id` (ProjectDetailPage) with role-based conditional UI — no separate route for users.
- D-02: Admin view is unchanged: upload sidebar (ProjectDropzone), Save Layout button, Close Project button, submitted attempts table.
- D-03: User view: full-width canvas (no upload sidebar), Save Attempt button, Publish Attempt button. All admin-only controls hidden via `useRole()`.
- D-04: User's canvas starts from the admin's saved fragment layout (loaded from `fragments.metadata` as reference starting position). If the user has a prior draft, load their draft layout instead.

**Project List for Users (COLLAB-01)**
- D-05: Open `GET /api/projects` to all authenticated users (remove `requireRole('admin')` from that route). Admin receives all projects (open + closed); regular users receive only open projects — filter in backend based on `req.user.role`.
- D-06: `/projects` (ProjectsPage) is the same page for both roles. Admin sees "New Project" button and all projects; user sees only open projects, no create button. Existing role gating via `useRole()` already handles the button.
- D-07: Individual project routes (POST create, POST upload, PATCH layout, POST close) remain admin-only. Only GET list and GET single are opened to users.

**Attempt Save & Publish Flow (COLLAB-03, COLLAB-04)**
- D-08: One draft attempt per user per project at a time. No multiple-draft history.
- D-09: Draft attempt row is created in the DB on the user's first explicit "Save Attempt" click — not on project open.
- D-10: Two separate buttons: Save Attempt (persists draft layout, stays in `draft` status) and Publish Attempt (sets status to `published`, locks from further editing). Matches the admin's Save Layout pattern.
- D-11: Once published, the attempt is locked — no further edits. The Publish button disappears or disables after publishing.
- D-12: If a user opens a project where they already have a `draft` attempt, load their draft's `layout` JSON instead of admin's reference layout.
- D-13: New backend routes needed for attempts:
  - `POST /api/projects/:id/attempts` — upsert draft (create if no draft exists, update `layout` if draft exists). Requires `requireAuth` (no admin role needed). Returns the attempt row.
  - `POST /api/attempts/:id/publish` — set status to `published`, set `submitted_at`. Requires `requireAuth` + must be the owner.
- D-14: `GET /api/projects/:id` must also be opened to all authenticated users (not just admin) so users can load project + fragments when they open a project detail page.

**Closed Project View (COLLAB-05)**
- D-15: Closed projects use the same `/projects/:id` route, showing the canvas in read-only mode (no drag, no rotate, no Save/Publish buttons).
- D-16: Canvas for a closed project loads the approved attempt's `layout` JSON to display the winning arrangement — not the admin's saved fragment layout.
- D-17: Show the solver's identity below or alongside the canvas: "Solved by: [email]". Backend must return the approved attempt's submitter email when the project is closed.
- D-18: Non-interactive canvas for closed projects — fragments are visible but dragging and transforming are disabled.

### Claude's Discretion
- Exact wording of "Save Attempt" / "Publish Attempt" button labels (e.g., "Save Progress" / "Submit").
- Confirmation dialog before publishing (recommended: yes, to prevent accidental publish).
- Loading state / feedback messages for Save and Publish actions.
- CSS styling for the user attempt section — match existing dark industrial aesthetic.
- Where exactly "Solved by: [email]" appears in the closed project layout.
- Exact backend upsert logic (UPSERT vs SELECT-then-INSERT/UPDATE for draft creation).

### Deferred Ideas (OUT OF SCOPE)
- User viewing their own published/rejected attempt history
- Multiple attempts per user per project
- Real-time updates
- Score display for users (Phase 5)
- Admin approval/rejection of attempts (Phase 5)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COLLAB-01 | User can browse all open projects | D-05: remove `requireRole('admin')` from `GET /api/projects`; filter by role server-side. Frontend ProjectsPage already role-gates New Project button. |
| COLLAB-02 | User can open a project and work on the reconstruction canvas | D-01/D-03/D-04/D-14: open `GET /api/projects/:id`, hide admin UI, load draft or reference layout as starting position. |
| COLLAB-03 | User can save their in-progress attempt | D-08/D-09/D-13: `POST /api/projects/:id/attempts` upsert endpoint; `saveDraft` action in store; Save Attempt button in toolbar. |
| COLLAB-04 | User can publish a completed reconstruction attempt | D-10/D-11/D-13: `POST /api/attempts/:id/publish` endpoint; confirmation dialog; Publish Attempt button removed from DOM after publish. |
| COLLAB-05 | Closed projects are viewable in read-only mode (shows approved solution and solver) | D-15/D-16/D-17/D-18: backend injects `solution` field in project response; Konva canvas passes `draggable={false}`; Transformer not rendered; solver attribution shown. |

</phase_requirements>

---

## Summary

Phase 4 extends two layers of the existing stack: the Express backend (two new routes + two unlocked GET routes) and the React frontend (ProjectDetailPage gains user-specific canvas state, action buttons, and read-only mode). No new pages, no new routes in the React router, no new dependencies — the entire phase is additive changes to existing files plus one new router file on the backend.

The central complexity is the three-way canvas loading path: (1) no prior draft — load admin's fragment `metadata` as starting positions via existing `toCanvasFragment`; (2) prior draft exists — parse the attempt's `layout` JSON and apply those positions over the same fragment list; (3) closed project — load the approved attempt's `layout` JSON in read-only mode. All three paths map over the same `canvasFragments` local state; only the data source and the `draggable` prop differ.

The security surface is narrow but important: the publish route must verify `attempt.user_id === req.user.id` to prevent one user from publishing another's draft (IDOR), and the list/detail GET routes must enforce role-based filtering server-side rather than trusting the client.

**Primary recommendation:** Build back-to-front in two waves — Wave 1 unlocks and adds backend routes; Wave 2 extends the frontend. This isolates the backend contract before any UI code is written against it.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project list filtering (open-only for users) | API / Backend | — | Role is known server-side via JWT; filtering in backend prevents information leakage to the client. |
| Draft attempt upsert | API / Backend | — | Persistence is owned by the DB layer; upsert logic belongs in the route handler. |
| Publish attempt lock | API / Backend | — | Status transitions are authoritative state; must be enforced server-side to prevent unauthorized publish. |
| Owner check (IDOR guard) | API / Backend | — | `req.user.id` is the authoritative identity; the UI cannot enforce this. |
| Canvas starting position selection (draft vs reference) | Frontend | API / Backend | Frontend decides which of the two data shapes to load; backend provides both (fragments.metadata + attempt.layout). |
| Read-only canvas (closed project) | Frontend | — | Konva `draggable` prop and Transformer presence are pure render-time decisions; no server involvement. |
| Approved attempt / solver data injection | API / Backend | — | The `solution` field must be assembled by the backend JOIN; frontend only renders what it receives. |
| User attempt state (draft in progress) | Frontend | — | `canvasFragments` local state in ProjectDetailPage; no auto-save, explicit button only. |

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | installed | HTTP routing for new attempt routes | Already the server framework |
| better-sqlite3 | installed | Synchronous SQLite driver for upsert | Already the DB driver; synchronous API is perfect for upsert patterns |
| jose | installed | JWT verification in requireAuth | Already used in auth middleware |
| react-konva / konva | installed | Canvas rendering, `draggable` prop, Transformer | Already the canvas library |
| zustand | installed | Attempt state actions in useProjectStore | Already the state management library |

[VERIFIED: direct codebase inspection of server/package.json and puzzle-fragments/package.json]

**No new npm packages are required for Phase 4.**

### New File to Create
| File | Purpose |
|------|---------|
| `server/routes/attempts.js` | Houses `POST /api/projects/:id/attempts` and `POST /api/attempts/:id/publish` — keeps projects.js cohesive |

### Alternative Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `server/routes/attempts.js` | Add attempt routes directly to `projects.js` | projects.js already has router-level `requireRole('admin')` applied via `router.use()` — attempt routes require `requireAuth` only, so they CANNOT be added to the existing projects router without refactoring that middleware application. New file is required. |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (User)
     |
     | GET /api/projects            (role-filtered list)
     | GET /api/projects/:id        (project + fragments + solution if closed)
     | POST /api/projects/:id/attempts   (upsert draft)
     | POST /api/attempts/:id/publish    (lock attempt)
     v
Express Server
     |
     |-- requireAuth middleware (all routes)
     |
     |-- projects.js router ← GET routes opened to all auth users (D-05, D-14)
     |      |
     |      |-- GET /  →  filter by role: admin gets all, user gets open only
     |      |-- GET /:id  →  inject solution{layout, submitter_email} when closed
     |      |-- POST, PATCH, close  →  still admin-only via requireRole guard
     |
     |-- attempts.js router (NEW)  ← requireAuth only, no requireRole
            |
            |-- POST /api/projects/:id/attempts  →  upsert draft in attempts table
            |-- POST /api/attempts/:id/publish   →  owner check + status=published

SQLite (better-sqlite3)
     |
     |-- attempts table: id, project_id, user_id, layout, status, submitted_at
     |-- projects + fragments (unchanged schema)
     v
React Frontend
     |
     |-- useProjectStore.fetchProject()  →  loads currentProject (unchanged shape + solution field)
     |-- useProjectStore.fetchUserDraft(projectId)  →  GET /api/projects/:id/attempts/me (or inline in fetchProject)
     |-- useProjectStore.saveDraft(projectId, layout)  →  POST upsert
     |-- useProjectStore.publishAttempt(attemptId)  →  POST publish
     |
     v
ProjectDetailPage.jsx
     |
     |-- role === 'admin'  →  existing admin view (unchanged)
     |-- role !== 'admin', project open, no draft  →  load admin reference layout
     |-- role !== 'admin', project open, draft exists  →  load draft.layout
     |-- role !== 'admin', project closed  →  load solution.layout, read-only canvas
```

### Recommended Project Structure (additions only)
```
server/routes/
├── attempts.js          # NEW — POST upsert draft, POST publish

puzzle-fragments/src/store/
├── useProjectStore.js   # EXTEND — add saveDraft, publishAttempt, fetchUserDraft

puzzle-fragments/src/pages/
├── ProjectDetailPage.jsx   # EXTEND — user attempt state, user toolbar, read-only canvas
├── ProjectDetailPage.css   # EXTEND — 9 new CSS classes per UI-SPEC
```

### Pattern 1: Router-Level Middleware Override (the critical backend insight)

**What:** The existing `projects.js` applies `requireRole('admin')` to ALL routes via `router.use(requireAuth, requireRole('admin'))` at line 14. The new GET routes and all attempt routes cannot be added there.

**Solution:** Two changes in `projects.js`:
1. Remove the router-level `router.use(requireAuth, requireRole('admin'))` line.
2. Add `requireAuth, requireRole('admin')` inline to every route that must remain admin-only (POST create, POST fragments, PATCH layout, POST close).
3. Add `requireAuth` inline (no role check) to GET / and GET /:id.

All attempt routes live in the new `server/routes/attempts.js` with `router.use(requireAuth)` and per-route owner checks.

[VERIFIED: server/routes/projects.js line 14 — `router.use(requireAuth, requireRole('admin'))`]

**Example — refactored projects.js pattern:**
```javascript
// BEFORE (line 14, remove this):
router.use(requireAuth, requireRole('admin'))

// AFTER — inline guards per route:
router.get('/', requireAuth, (req, res) => { /* role-filtered */ })
router.get('/:id', requireAuth, (req, res) => { /* open to all auth */ })
router.post('/', requireAuth, requireRole('admin'), (req, res) => { /* admin only */ })
router.post('/:id/fragments', requireAuth, requireRole('admin'), upload.single('file'), (req, res) => { /* admin only */ })
router.patch('/:id/layout', requireAuth, requireRole('admin'), (req, res) => { /* admin only */ })
router.post('/:id/close', requireAuth, requireRole('admin'), (req, res) => { /* admin only */ })
```

[VERIFIED: pattern matches requireRole factory in server/middleware/auth.js]

### Pattern 2: Role-Filtered List Query

**What:** `GET /api/projects` must return all projects for admin, only open for users.

```javascript
// Source: server/routes/projects.js (extend GET /)
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
```

[VERIFIED: existing query structure in projects.js lines 46-54; better-sqlite3 synchronous .all() pattern confirmed]

### Pattern 3: Solution Injection in GET /api/projects/:id

**What:** For closed projects, the response must include a `solution` object with `layout` and `submitter_email` from the approved attempt.

```javascript
// Extend GET /:id response
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
```

[VERIFIED: attempts table has status='approved' and reviewed_at column per schema.sql; JOIN pattern matches existing GET /:id attempts query]

### Pattern 4: Draft Upsert (better-sqlite3 transaction)

**What:** `POST /api/projects/:id/attempts` — create if no draft exists, update layout if draft exists.

```javascript
// Source: server/routes/attempts.js (new file)
router.post('/projects/:id/attempts', (req, res) => {
  const projectId = Number(req.params.id)
  const userId = req.user.id
  const { layout } = req.body

  if (!layout) return res.status(400).json({ error: 'layout is required.' })

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

[VERIFIED: better-sqlite3 db.transaction() pattern matches existing PATCH /layout handler in projects.js lines 127-133; attempts table columns confirmed in schema.sql]

### Pattern 5: Publish with Owner Check (IDOR guard)

**What:** `POST /api/attempts/:id/publish` — verify requester owns the attempt before transitioning status.

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
```

[VERIFIED: pattern matches requireAuth attaching `req.user = { id, role }` in auth.js line 41; ISO timestamp pattern matches `closeProject` route in projects.js line 146]

### Pattern 6: Zustand Store Extension

**What:** Add three actions to `useProjectStore` following the exact existing pattern.

```javascript
// Source: useProjectStore.js — add alongside existing actions

/** GET /api/projects/:id/attempts/me — fetch current user's draft for a project */
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

[VERIFIED: authHeaders() pattern, error handling pattern, and fetch conventions match lines 23-133 of useProjectStore.js exactly]

### Pattern 7: Draft Route for Fetching Current User's Attempt

**What:** The store needs a `fetchUserDraft` endpoint. The simplest approach is a dedicated sub-route.

```javascript
// In attempts.js — GET /api/projects/:id/attempts/me
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

[VERIFIED: pattern mirrors metadata JSON parsing in GET /:id in projects.js lines 67-70; attempts table confirmed in schema.sql]

### Pattern 8: Canvas Loading Logic in ProjectDetailPage

**What:** Three-way canvas hydration on project load. The existing `useEffect` that calls `toCanvasFragment` must be extended.

```javascript
// Extend the existing useEffect in ProjectDetailPage.jsx
useEffect(() => {
  if (!currentProject) return

  if (currentProject.status === 'closed') {
    // COLLAB-05: load approved solution layout
    const sol = currentProject.solution
    if (sol?.layout && currentProject.fragments.length) {
      const mapped = currentProject.fragments.map((f, i) => {
        const pos = Array.isArray(sol.layout)
          ? sol.layout.find(l => l.id === f.id)
          : null
        const base = toCanvasFragment(f, i)
        return pos ? { ...base, ...pos } : base
      })
      setCanvasFragments(mapped)
    }
    return
  }

  if (role !== 'admin') {
    // COLLAB-02/03: fetch user draft, hydrate from draft or reference layout
    fetchUserDraft(currentProject.id).then((draft) => {
      if (draft?.layout && Array.isArray(draft.layout)) {
        const mapped = currentProject.fragments.map((f, i) => {
          const pos = draft.layout.find(l => l.id === f.id)
          const base = toCanvasFragment(f, i)
          return pos ? { ...base, ...pos } : base
        })
        setCanvasFragments(mapped)
        setCurrentAttemptId(draft.id)
      } else {
        // No draft — use admin's reference layout (default toCanvasFragment behavior)
        setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
      }
    })
    return
  }

  // Admin: existing behavior unchanged
  setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
}, [currentProject, role])
```

[VERIFIED: existing hydration useEffect is at ProjectDetailPage.jsx lines 233-236; toCanvasFragment is at lines 24-46; role via useRole() is at line 215]

### Pattern 9: Read-Only Canvas via Props

**What:** Pass `readOnly` prop to ProjectCanvas; `FragmentNode` conditionally applies `draggable` and omits drag/transform handlers.

```jsx
// ProjectCanvas call site in ProjectDetailPage:
<ProjectCanvas
  fragments={canvasFragments}
  onFragmentUpdate={handleFragmentUpdate}
  readOnly={isClosed}    // NEW prop
/>

// Inside ProjectCanvas, pass down to FragmentNode:
<FragmentNode
  ...
  readOnly={readOnly}    // NEW prop
/>

// Inside FragmentNode Group:
<Group
  draggable={!readOnly}                          // CHANGED
  onDragEnd={readOnly ? undefined : handleDragEnd}   // CHANGED
  onTransformEnd={readOnly ? undefined : handleTransformEnd}  // CHANGED
  ...
>

// Inside ProjectCanvas, conditional Transformer:
{!readOnly && (
  <Transformer ref={trRef} ... />
)}
```

[VERIFIED: FragmentNode uses `draggable` on Group at line 81; Transformer is rendered at lines 197-204; CONTEXT.md specifics section recommends this exact approach]

### Anti-Patterns to Avoid

- **Router-level role guard on the same router:** The attempt routes cannot be bolted onto the existing projects router because `router.use(requireAuth, requireRole('admin'))` blocks all non-admin requests. Must create a separate router.
- **Auto-saving on fragment drag:** The existing explicit-save model (D-16) must be preserved for user attempts. Do not add `onDragEnd` → `saveDraft()` — only the Save Attempt button triggers a network write.
- **Sending `layout` as a raw JS object to SQLite:** better-sqlite3 does not serialize objects automatically. Always `JSON.stringify(layout)` before storing.
- **Trusting the client for ownership:** The publish route must check `attempt.user_id !== req.user.id` server-side. UI hiding is not a security control.
- **Rendering the Attempts section for users:** The existing `<div className="detail-attempts-section">` with the full attempts table must remain admin-only (D-03). The role-gating matrix in UI-SPEC.md is the authority.
- **Hydrating from `solution.layout` when no solution exists:** A closed project may theoretically lack an approved attempt (edge case). Guard with `if (sol?.layout)` before using it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic upsert | Manual SELECT + conditional INSERT/UPDATE without transaction | `db.transaction()` wrapping SELECT+INSERT/UPDATE | better-sqlite3 transactions prevent race conditions on concurrent saves |
| JWT verification | Custom token parsing | `requireAuth` middleware (already exists) | Auth is already solved; reuse the middleware for all new routes |
| Role checking | Inline `if (req.user.role !== 'admin')` in route handlers | `requireRole('admin')` middleware | Consistent with every existing admin route |
| Canvas read-only | CSS `pointer-events: none` on the canvas container | Konva `draggable={false}` + no Transformer | CSS blocks events at the DOM level but Konva operates on an HTML canvas element — pointer-events CSS does not prevent Konva event handling reliably |

---

## Common Pitfalls

### Pitfall 1: Router-Level Admin Guard Blocks New Routes
**What goes wrong:** Developer adds new attempt routes to `server/routes/projects.js` and wonders why regular users get 403.
**Why it happens:** Line 14 of projects.js applies `requireRole('admin')` to every route on that router via `router.use()`.
**How to avoid:** Create `server/routes/attempts.js` as a new router. In projects.js, remove the router-level middleware and add inline guards per route.
**Warning signs:** 403 responses from authenticated non-admin users on the new routes.

### Pitfall 2: Layout JSON Shape Mismatch Between Save and Load
**What goes wrong:** `saveDraft` sends `canvasFragments` array directly; `fetchUserDraft` returns it and `fetchUserDraft` tries `layout.find(l => l.id === f.id)` — but `id` in canvasFragments is a string (Konva), while `f.id` from the DB is numeric.
**Why it happens:** `toCanvasFragment` sets `id: String(serverFrag.id)` (line 29) and `dbId: serverFrag.id` (line 30). Layout positions need to key off `dbId` to match the DB fragment id when rehydrating.
**How to avoid:** When serializing layout for save, use `dbId` as the key field (not `id`). When rehydrating, match `layout.find(l => l.id === f.id)` where both use numeric ids, OR use `l.dbId === f.id`.
**Warning signs:** Canvas loads all fragments at default positions even when a draft exists.

### Pitfall 3: Closed Project Has No Approved Attempt
**What goes wrong:** `project.solution` is null but JSX tries to render `solution.submitter_email` or `solution.layout` — runtime crash.
**Why it happens:** The UI-SPEC and CONTEXT.md both note "if solution exists" conditions, but it's easy to miss.
**How to avoid:** Guard every access: `{isClosed && solution && <div className="canvas-solver">...`}. Backend returns `solution: null` when no approved attempt exists.
**Warning signs:** White screen / React error boundary catch on closed project pages.

### Pitfall 4: Publish Button Not Removed After Publishing
**What goes wrong:** User publishes, gets success feedback, but Publish button is still present and clickable; second click hits the server and gets a 409.
**Why it happens:** D-11 says button is removed from DOM once published. If state tracks `published: false` optimistically and the Zustand action doesn't update currentAttemptStatus, the button persists.
**How to avoid:** After `publishAttempt()` succeeds, set local `isPublished` state to `true`. Gate the Publish button on `{!isPublished && <button ...>}`.
**Warning signs:** Double-publish network requests, 409 responses after successful publish.

### Pitfall 5: fetchUserDraft Called for Admin Users
**What goes wrong:** Admin opens a project, `fetchUserDraft` is called, returns 404 or an empty state — canvas hydration takes the wrong branch.
**Why it happens:** If the canvas loading `useEffect` doesn't check `role !== 'admin'` before calling `fetchUserDraft`, both branches execute.
**How to avoid:** Guard with `if (role !== 'admin')` before calling fetchUserDraft. Admin hydration uses the existing `toCanvasFragment` path unchanged.
**Warning signs:** Admin canvas shows default positions instead of saved metadata positions.

### Pitfall 6: server/index.js Needs to Register the Attempts Router
**What goes wrong:** Attempts routes return 404 even after creating `server/routes/attempts.js`.
**Why it happens:** New routers must be mounted in `server/index.js`.
**How to avoid:** Add `app.use('/api', require('./routes/attempts'))` in index.js. The attempts router uses full paths (`/projects/:id/attempts` and `/attempts/:id/publish`) so it can be mounted at `/api`.
**Warning signs:** All attempts API calls return `{ error: 'Not found' }` from the 404 catch-all.

---

## Code Examples

### Existing Pattern: Fragment Metadata Parsing (reuse for layout)
```javascript
// Source: server/routes/projects.js lines 67-70
const fragsWithMeta = fragments.map(f => ({
  ...f,
  metadata: (() => { try { return JSON.parse(f.metadata) } catch { return {} } })(),
}))
```
Apply the same pattern when returning attempt layout JSON.

### Existing Pattern: toCanvasFragment (reuse for draft/solution hydration)
```javascript
// Source: ProjectDetailPage.jsx lines 24-46
function toCanvasFragment(serverFrag, index) {
  const meta = serverFrag.metadata || {}
  // ...returns { id: String, dbId: Number, src, x, y, rotation, scaleX, scaleY, ... }
}
```
Draft layout positions override `toCanvasFragment` defaults via object spread.

### Existing Pattern: Confirm Before Destructive Action
```javascript
// Source: ProjectDetailPage.jsx line 283 — handleClose pattern
if (!window.confirm('Close this project? It will become read-only.')) return
```
Publish confirm uses a modal per UI-SPEC rather than `window.confirm`, but the guard pattern is the same.

### Existing Pattern: Status Update + Local Store Sync
```javascript
// Source: useProjectStore.js closeProject lines 126-131
set((state) => ({
  currentProject: state.currentProject?.id === projectId
    ? { ...state.currentProject, status: 'closed', ... }
    : state.currentProject,
}))
```
After publishAttempt succeeds, update `currentProject.userAttemptStatus` or equivalent local state.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin-only `GET /api/projects` | Role-filtered: admin sees all, user sees open only | Phase 4 (this phase) | Users can now browse projects without seeing admin's closed/historical work |
| Admin-only `GET /api/projects/:id` | Open to all authenticated users + solution field injection | Phase 4 (this phase) | Users can load project detail for collaboration |
| No attempts write path | Draft upsert + publish transition via new routes | Phase 4 (this phase) | Users can persist work-in-progress and submit formal attempts |
| Canvas always interactive | `readOnly` prop disables drag/transform for closed projects | Phase 4 (this phase) | Closed projects become display-only archaeology records |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `layout` field in the `attempts` table stores a JSON array of fragment position objects | Architecture Patterns (upsert pattern) | If the shape is different, the save/load hydration logic needs adjustment. Impact: medium. Mitigation: layout column is `TEXT NOT NULL DEFAULT '{}'` — shape is fully determined by what the app writes; Phase 4 defines the canonical shape. |
| A2 | `GET /api/projects/:id/attempts/me` is the cleanest endpoint for fetching the current user's draft | Store Extension pattern | Could alternatively embed the user's draft in the `GET /api/projects/:id` response when role === 'user'. The separate endpoint is cleaner for the frontend's loading sequence. Impact: low. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

Both assumptions have low impact and are implementation choices, not external dependencies.

---

## Open Questions

1. **Layout JSON array shape — what fields to include per fragment position**
   - What we know: `canvasFragments` objects contain `{ id (string), dbId (number), x, y, rotation, scaleX, scaleY, width, height, originalWidth, originalHeight, src, segments, centroid }`.
   - What's unclear: Which fields should be stored in `attempt.layout`? Storing everything bloats the DB. Storing only position fields requires re-merging with fragment data on load.
   - Recommendation: Store only positional fields + `id` (using `dbId` as the numeric key): `{ id: f.dbId, x, y, rotation, scaleX, scaleY }`. Re-merge with `toCanvasFragment` output on load. This matches how admin layout is stored in `fragments.metadata`.

2. **Where to mount the attempts router in index.js**
   - What we know: `server/index.js` has `app.use('/api/projects', require('./routes/projects'))`. The new attempts router has routes at `/projects/:id/attempts` and `/attempts/:id/publish`.
   - Recommendation: Mount at `/api` — `app.use('/api', require('./routes/attempts'))` — so the router uses full sub-paths. Alternatively mount at `/api/projects` for the project-scoped route and `/api/attempts` for the attempt-scoped route as two separate mounts. Single `/api` mount is simpler.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 4 has no new external dependencies. All tools (Node.js, Express, better-sqlite3, React, Konva, Zustand) are already installed and operational from Phases 1-3.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — treated as enabled.
> However, the frontend CLAUDE.md states: "No test runner is configured." No test files exist.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COLLAB-01 | `GET /api/projects` returns only open projects for user role | manual | curl / browser check | No test infrastructure |
| COLLAB-02 | User canvas loads from draft if exists, else admin reference layout | manual | browser check | No test infrastructure |
| COLLAB-03 | `POST /api/projects/:id/attempts` creates draft, updates layout on second call | manual | curl check | No test infrastructure |
| COLLAB-04 | `POST /api/attempts/:id/publish` locks attempt, returns 403 for non-owner | manual | curl check | No test infrastructure |
| COLLAB-05 | Closed project shows approved layout, solver attribution, no drag | manual | browser check | No test infrastructure |

### Wave 0 Gaps
No test infrastructure exists. All verification is manual (browser + curl). This is pre-existing project constraint per CLAUDE.md.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAuth` middleware (existing, reused) |
| V3 Session Management | no | Stateless JWT — no new session changes |
| V4 Access Control | yes | `requireRole('admin')` inline on write routes; owner check `attempt.user_id === req.user.id` on publish |
| V5 Input Validation | yes | Validate `layout` is present and is object/array before stringifying; validate `project_id` existence before creating attempt |
| V6 Cryptography | no | No new crypto — JWT already handled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: user publishes another user's attempt by guessing attempt ID | Tampering | `attempt.user_id !== req.user.id` → 403 in publish route |
| Privilege escalation: user POSTs to admin-only routes (create, upload, layout, close) | Elevation of Privilege | `requireRole('admin')` inline on all write routes after router-level guard is removed |
| Information disclosure: user retrieves closed projects via list endpoint | Information Disclosure | Role-based filter in `GET /api/projects` — users only see open projects |
| Layout injection: user sends malformed JSON as layout | Tampering | `JSON.stringify()` on input; if layout is not an object/array, return 400 |
| Attempt status bypass: user sends `status: 'approved'` in publish body | Tampering | Publish route hardcodes `status = 'published'` — body fields other than nothing are ignored |
| Cross-project draft: user posts attempt to a project they don't have access to | Tampering | Project existence check + project must be `open` before allowing draft creation |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `server/routes/projects.js` — complete route structure, middleware pattern, query patterns
- `server/middleware/auth.js` — `requireAuth` / `requireRole` implementation
- `server/schema.sql` — exact `attempts` table schema (id, project_id, user_id, layout, status, submitted_at, reviewed_at, created_at)
- `server/db.js` — better-sqlite3 setup, synchronous API confirmed
- `server/index.js` — router mounting pattern
- `puzzle-fragments/src/pages/ProjectDetailPage.jsx` — canvas component structure, fragment hydration, local state pattern
- `puzzle-fragments/src/store/useProjectStore.js` — authHeaders pattern, fetch/error conventions
- `puzzle-fragments/src/hooks/useRole.js` — role hook implementation
- `puzzle-fragments/src/store/authStore.js` — token storage, persist middleware
- `.planning/phases/04-collaboration/04-CONTEXT.md` — all D-01 through D-18 decisions
- `.planning/phases/04-collaboration/04-UI-SPEC.md` — complete role-gating matrix, CSS classes, copywriting contract
- `puzzle-fragments/src/pages/ProjectDetailPage.css` — existing class names and tokens confirmed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated architectural decisions from Phases 1-3

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all packages verified via direct file inspection
- Architecture: HIGH — route structure and component structure verified from source
- Pitfalls: HIGH — identified from direct code inspection (router-level guard, id type mismatch, null solution guard)
- Security: HIGH — threat model derived from confirmed code patterns

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable stack; no fast-moving dependencies)
