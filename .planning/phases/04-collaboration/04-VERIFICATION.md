---
phase: 04-collaboration
verified: 2026-04-28T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "COLLAB-01 — Regular user sees only open projects in the project list"
    expected: "Logged-in user with role 'user' navigates to /projects and sees only projects with status='open'; closed projects do not appear."
    why_human: "Role-filtered SQL is correct in code but the actual browser session, JWT role claim, and list rendering must be exercised end-to-end to confirm no rendering path leaks closed projects."
  - test: "COLLAB-02 — User opens a project and sees the canvas with draggable fragments"
    expected: "Clicking an open project card takes the user to the detail page; the canvas shows all uploaded fragments; fragments are draggable and rotatable; no upload sidebar or Save Layout / Close Project buttons are visible."
    why_human: "Canvas fragment loading depends on server images being served correctly (CORS, storage_path resolution) and the readOnly=false path being followed — requires visual confirmation."
  - test: "COLLAB-03 — User saves a draft and returns to find it preserved"
    expected: "Arrange fragments, click Save Attempt, 'Attempt saved.' message appears; navigate away and return to the same project; fragments appear at the previously saved positions."
    why_human: "Round-trip persistence (draft upsert + fetchUserDraft rehydration) requires a live database and real network calls to confirm layout is preserved across page loads."
  - test: "COLLAB-04 — User publishes attempt via two-click confirm flow"
    expected: "Click Publish Attempt, confirm dialog appears with 'Publish now' / 'Keep editing'; clicking Keep editing closes modal with no action; clicking Publish now shows 'Attempt published.' and removes the Publish Attempt button from the DOM."
    why_human: "Publish requires a prior saved draft (currentAttemptId must be set); the handlePublishAttempt guard silently returns if no draft exists — this UX edge case needs human confirmation of correct sequencing."
  - test: "COLLAB-05 — Closed project shows read-only canvas with approved solution and solver attribution"
    expected: "A closed project (with an approved attempt) shows the approved fragment arrangement on the canvas; 'READ-ONLY · Approved Solution' appears in the toolbar; solver attribution 'SOLVED BY: {email}' appears below the canvas; fragments cannot be dragged or rotated; no Save/Publish buttons."
    why_human: "Requires a project to have been closed after an attempt was approved — this state cannot be checked statically and needs end-to-end validation of the solution injection path."
  - test: "Admin view is completely unchanged on open projects"
    expected: "Admin sees ProjectDropzone upload sidebar, Save Layout button, Close Project button, and Submitted Attempts table; no Save Attempt or Publish Attempt buttons appear."
    why_human: "Role-gating is in code but the admin rendering path (all three gating conditions simultaneously true/false) must be visually confirmed."
---

# Phase 4: Collaboration Verification Report

**Phase Goal:** Regular users can browse open projects, open a project's reconstruction canvas, save an in-progress attempt, publish a completed attempt, and view the approved solution for closed projects.
**Verified:** 2026-04-28T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A logged-in user can see a list of all open projects and open any one of them | VERIFIED | `GET /api/projects` has `requireAuth` (no role guard); role-filtered SQL `WHERE p.status = 'open'` applied when `!isAdmin`; `router.use(requireAuth, requireRole('admin'))` router-level guard confirmed absent |
| 2 | A user who opens a project sees the fragment reconstruction canvas with all project fragments | VERIFIED | `GET /api/projects/:id` has `requireAuth` only; ProjectDetailPage hydrates `canvasFragments` from `currentProject.fragments`; `ProjectCanvas` renders `FragmentNode` per fragment; `readOnly={isClosed}` gates drag behaviour |
| 3 | A user can save their in-progress arrangement and return later to find it preserved | VERIFIED | `POST /api/projects/:id/attempts` upsert route exists with `db.transaction()`, scoped by `project_id AND user_id`; `handleSaveAttempt` in UI serializes layout with `id: f.dbId`; `fetchUserDraft` rehydrates on load with `draft.layout.find(l => l.id === f.id)` |
| 4 | A user can publish their completed arrangement, making it visible to the admin | VERIFIED | `POST /api/attempts/:id/publish` route exists with IDOR guard (`attempt.user_id !== req.user.id` → 403), draft-only check, hardcoded `status='published'`; `handlePublishAttempt` calls `publishAttempt(currentAttemptId)`; `setIsPublished(true)` removes Publish button from DOM on success |
| 5 | A closed project is viewable in read-only mode showing the approved solution layout and solver name | VERIFIED | `GET /api/projects/:id` injects `solution: { layout, submitter_email }` from approved attempt when `status='closed'`; three-way hydration loads solution layout when `status === 'closed'`; `readOnly={isClosed}` disables drag/transform; solver attribution renders when `isClosed && currentProject.solution` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/routes/projects.js` | Refactored with inline guards, role-filtered GET /, solution-injected GET /:id | VERIFIED | Router-level guard absent; 4x `requireRole('admin')` on write routes; `let solution = null` block at line 82; role-filtered SQL with template literal conditional |
| `server/routes/attempts.js` | Three routes: GET me, POST upsert, POST publish | VERIFIED | All three routes present; `router.use(requireAuth)` at top; `db.transaction()` wraps upsert; IDOR guard on publish; `module.exports = router` present |
| `server/index.js` | Attempts router mounted at `/api` after projects and before 404 | VERIFIED | Line 35: projects mounted; line 36: `app.use('/api', require('./routes/attempts'))`; 404 catch-all at line 42 |
| `puzzle-fragments/src/store/useProjectStore.js` | fetchUserDraft, saveDraft, publishAttempt actions | VERIFIED | All three async actions present at lines 136, 151, 165; `fetchUserDraft` returns null on 404 (line 141) and in catch (line 146); `saveDraft` and `publishAttempt` throw on non-OK; all use `authHeaders()` |
| `puzzle-fragments/src/pages/ProjectDetailPage.jsx` | Extended page with user toolbar, three-way canvas hydration, read-only canvas, publish modal | VERIFIED | All acceptance criteria met — see Key Link Verification and Anti-Patterns sections |
| `puzzle-fragments/src/pages/ProjectDetailPage.css` | 9 new CSS classes | VERIFIED | All 9 classes present: `.btn-save-attempt`, `.btn-publish-attempt`, `.btn-publish-confirm`, `.publish-confirm-body`, `.save-msg--error`, `.attempt-status--draft`, `.canvas-toolbar-readonly`, `.canvas-solver`, `.canvas-solver-email` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `server/routes/projects.js` | `server/middleware/auth.js` | `requireRole('admin')` inline on write routes | WIRED | 4 occurrences confirmed; router-level guard absent |
| `server/routes/attempts.js` | `server/middleware/auth.js` | `router.use(requireAuth)` at top | WIRED | Line 10 confirmed |
| `server/routes/attempts.js` | `server/db.js` | `db.prepare(...)` calls | WIRED | Multiple `db.prepare` calls in all three routes; `db.transaction()` in upsert |
| `useProjectStore.fetchUserDraft` | `GET /api/projects/:id/attempts/me` | fetch call with `attempts/me` in URL | WIRED | Line 138: `${API}/api/projects/${projectId}/attempts/me` |
| `useProjectStore.saveDraft` | `POST /api/projects/:id/attempts` | fetch POST with JSON body | WIRED | Line 152-156: POST with `{ layout }` body |
| `useProjectStore.publishAttempt` | `POST /api/attempts/:id/publish` | fetch POST no body | WIRED | Line 166-170: POST to `/api/attempts/${attemptId}/publish` |
| `ProjectDetailPage useEffect (hydration)` | `useProjectStore.fetchUserDraft` | `fetchUserDraft(currentProject.id)` inside `role !== 'admin'` branch | WIRED | Line 263 inside `if (role !== 'admin')` block; dependency array `[currentProject, role]` at line 282 |
| `handleSaveAttempt` | `useProjectStore.saveDraft` | `saveDraft(currentProject.id, layoutToSave)` | WIRED | Line 348 |
| `handlePublishAttempt` | `useProjectStore.publishAttempt` | `publishAttempt(currentAttemptId)` | WIRED | Line 366 |
| `ProjectCanvas readOnly prop` | `FragmentNode draggable={!readOnly}` | readOnly prop threaded through | WIRED | `ProjectCanvas` receives `readOnly` at line 121; passes `readOnly={readOnly}` to `FragmentNode` at line 193; `draggable={!readOnly}` at line 80; `Transformer` wrapped in `{!readOnly && ...}` at line 197 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ProjectDetailPage` — project list (via store) | `projects` | `GET /api/projects` → SQLite `projects` + `fragments` LEFT JOIN with `GROUP BY` | Yes — real DB query, role-filtered | FLOWING |
| `ProjectDetailPage` — canvas fragments | `canvasFragments` | `currentProject.fragments` → `GET /api/projects/:id` → `SELECT * FROM fragments WHERE project_id = ?` | Yes — real DB query | FLOWING |
| `ProjectDetailPage` — user draft layout | `canvasFragments` after `fetchUserDraft` | `GET /api/projects/:id/attempts/me` → `SELECT * FROM attempts WHERE project_id=? AND user_id=? AND status='draft'` | Yes — real DB query, returns actual stored layout | FLOWING |
| `ProjectDetailPage` — solution layout (closed project) | `canvasFragments` from `project.solution.layout` | `GET /api/projects/:id` → inner SELECT from `attempts` WHERE `status='approved'` | Yes — real DB query; `solution=null` if no approved attempt | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires a running server with live database state. All routes are correctly wired and serve real DB queries per Level 4 trace above. Behavioral validation deferred to human verification section.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COLLAB-01 | 04-01, 04-03 | User can browse all open projects | SATISFIED | Role-filtered GET /api/projects; backend enforces `WHERE p.status='open'` for non-admin |
| COLLAB-02 | 04-01, 04-03 | User can open a project and work on the reconstruction canvas | SATISFIED | GET /api/projects/:id open to all auth users; ProjectDetailPage renders canvas with fragments for users |
| COLLAB-03 | 04-01, 04-02, 04-03 | User can save their in-progress attempt | SATISFIED | POST /api/projects/:id/attempts (upsert); saveDraft store action; handleSaveAttempt in UI; draft rehydration on load |
| COLLAB-04 | 04-01, 04-02, 04-03 | User can publish a completed reconstruction attempt | SATISFIED | POST /api/attempts/:id/publish with IDOR guard; publishAttempt store action; two-click confirm modal in UI; isPublished gates button removal |
| COLLAB-05 | 04-01, 04-02, 04-03 | Closed projects viewable in read-only mode with approved solution and solver | SATISFIED | Solution injected in GET /:id; three-way hydration loads solution layout; readOnly canvas; solver attribution rendered |

All 5 requirement IDs declared across plans (COLLAB-01 through COLLAB-05) are covered. No orphaned requirements found — REQUIREMENTS.md Traceability section maps all five to Phase 4.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ProjectDetailPage.jsx` | 608-643 | `AttemptRow` modal has `console.log('[stub] approve attempt', ...)` and `console.log('[stub] reject attempt', ...)` placeholder handlers | INFO | Known Phase 3 stub — intentional, not Phase 4 work. SUMMARY 04-03 explicitly notes "AttemptRow modal Approve/Reject stub exists from Phase 3 — tracked in that plan." Phase 5 addresses SCORE-01/02/03. |
| `ProjectDetailPage.jsx` | 361 | `handlePublishAttempt` silently returns when `currentAttemptId` is null (user clicks Publish without having saved first) | WARNING | No UX feedback when Publish is clicked before Save — the confirmation modal opens, user clicks "Publish now", and nothing happens (silent no-op). The Publish button is not disabled when `currentAttemptId` is null. |

**Stub classification:** The `AttemptRow` approve/reject stub is a Phase 3 carryover tracked for Phase 5 — it does NOT block Phase 4 goal achievement (it is admin-only functionality unrelated to COLLAB-01 through COLLAB-05). The Publish-before-Save silent failure is a UX warning but does not prevent the goal: COLLAB-04 requires "publish a completed attempt" which presupposes a saved attempt exists.

---

### Human Verification Required

The automated code inspection confirms all 5 ROADMAP success criteria are implemented correctly in the codebase. The following end-to-end behaviors require human validation with a running server and live database:

#### 1. COLLAB-01: User Sees Only Open Projects

**Test:** Log in as a regular user (non-admin). Navigate to /projects.
**Expected:** Only projects with `status='open'` appear in the card grid. No closed projects visible. "New Project" button not present.
**Why human:** Role-based SQL filter is correct in server code, but the JWT role claim assignment and client-side rendering of the list must be confirmed in a live session.

#### 2. COLLAB-02: User Opens Project and Sees Canvas

**Test:** Click an open project card as a regular user.
**Expected:** No upload sidebar on the left. Canvas toolbar shows "Save Attempt" and "Publish Attempt" buttons. All project fragments are visible and draggable. "Save Layout" and "Close Project" buttons are absent.
**Why human:** Fragment image loading (storage_path → URL resolution, CORS from `http://localhost:3001`) and the role-gating rendering path require a live environment to confirm visually.

#### 3. COLLAB-03: User Saves and Restores Draft

**Test:** Arrange fragments, click "Save Attempt". Navigate away, then return to the same project.
**Expected:** "Attempt saved." feedback appears. On return, fragments are at the previously saved positions (not default).
**Why human:** Round-trip persistence through POST upsert and GET fetchUserDraft rehydration requires a live database to confirm the layout JSON is stored and retrieved correctly.

#### 4. COLLAB-04: User Publishes Attempt

**Test:** After saving a draft, click "Publish Attempt". Then: (a) click "Keep editing" — confirm modal closes with no action. Then: (b) click "Publish Attempt" again, then "Publish now".
**Expected:** (b) "Attempt published." message appears. "Publish Attempt" button is removed from the DOM. Canvas remains viewable.
**Why human:** Requires a live saved draft (currentAttemptId populated) to confirm the silent no-op edge case is not hit in practice, and to confirm the button DOM removal.

#### 5. COLLAB-05: Closed Project Read-Only View

**Test:** As admin, close a project that has an approved attempt. Then log in as a regular user and navigate to that closed project.
**Expected:** Canvas shows the approved fragment arrangement. "READ-ONLY · Approved Solution" label in toolbar. "SOLVED BY: {email}" below canvas. No Save/Publish buttons. Fragments cannot be dragged.
**Why human:** Requires a specific database state (closed project + approved attempt) that cannot be verified statically. The solution injection path and read-only canvas interaction must be confirmed end-to-end.

#### 6. Admin View Unchanged

**Test:** Log in as admin and navigate to an open project.
**Expected:** Upload sidebar visible. "Save Layout" and "Close Project" buttons visible. Submitted Attempts table visible at bottom. No "Save Attempt" or "Publish Attempt" buttons.
**Why human:** All three gating conditions (admin-only blocks vs user-only blocks) must be simultaneously confirmed in a live admin session.

---

### Gaps Summary

No blocking gaps found. All must-haves are implemented and wired. The one warning-level finding (Publish button clickable before Save) is a UX edge case with a silent no-op — it does not prevent COLLAB-04 from being achievable by users who follow the natural Save → Publish flow.

Six human verification items are required to confirm end-to-end behavior in a live environment. These cannot be verified programmatically due to their reliance on database state, image serving, JWT flows, and visual rendering.

---

_Verified: 2026-04-28T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
