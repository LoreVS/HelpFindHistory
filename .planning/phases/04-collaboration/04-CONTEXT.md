# Phase 4: Collaboration - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Regular users can browse open projects, open a project's reconstruction canvas, save an in-progress attempt, publish a completed attempt, and view the approved solution for closed projects. No admin controls, no scoring — those are Phase 3 and Phase 5.

</domain>

<decisions>
## Implementation Decisions

### User Project View (COLLAB-02)
- **D-01:** Reuse `/projects/:id` (ProjectDetailPage) with role-based conditional UI — no separate route for users.
- **D-02:** Admin view is unchanged: upload sidebar (ProjectDropzone), Save Layout button, Close Project button, submitted attempts table.
- **D-03:** User view: full-width canvas (no upload sidebar), Save Attempt button, Publish Attempt button. All admin-only controls hidden via `useRole()`.
- **D-04:** User's canvas starts from the admin's saved fragment layout (loaded from `fragments.metadata` as reference starting position). If the user has a prior draft, load their draft layout instead.

### Project List for Users (COLLAB-01)
- **D-05:** Open `GET /api/projects` to all authenticated users (remove `requireRole('admin')` from that route). Admin receives all projects (open + closed); regular users receive only open projects — filter in backend based on `req.user.role`.
- **D-06:** `/projects` (ProjectsPage) is the same page for both roles. Admin sees "New Project" button and all projects; user sees only open projects, no create button. Existing role gating via `useRole()` already handles the button.
- **D-07:** Individual project routes (POST create, POST upload, PATCH layout, POST close) remain admin-only. Only GET list and GET single are opened to users.

### Attempt Save & Publish Flow (COLLAB-03, COLLAB-04)
- **D-08:** One draft attempt per user per project at a time. No multiple-draft history.
- **D-09:** Draft attempt row is created in the DB on the user's first explicit "Save Attempt" click — not on project open.
- **D-10:** Two separate buttons: **Save Attempt** (persists draft layout, stays in `draft` status) and **Publish Attempt** (sets status to `published`, locks from further editing). Matches the admin's Save Layout pattern.
- **D-11:** Once published, the attempt is locked — no further edits. The Publish button disappears or disables after publishing.
- **D-12:** If a user opens a project where they already have a `draft` attempt, load their draft's `layout` JSON instead of admin's reference layout.
- **D-13:** New backend routes needed for attempts:
  - `POST /api/projects/:id/attempts` — upsert draft (create if no draft exists, update `layout` if draft exists). Requires `requireAuth` (no admin role needed). Returns the attempt row.
  - `POST /api/attempts/:id/publish` — set status to `published`, set `submitted_at`. Requires `requireAuth` + must be the owner.
- **D-14:** `GET /api/projects/:id` must also be opened to all authenticated users (not just admin) so users can load project + fragments when they open a project detail page.

### Closed Project View (COLLAB-05)
- **D-15:** Closed projects use the same `/projects/:id` route, showing the canvas in read-only mode (no drag, no rotate, no Save/Publish buttons).
- **D-16:** Canvas for a closed project loads the **approved attempt's `layout` JSON** to display the winning arrangement — not the admin's saved fragment layout.
- **D-17:** Show the solver's identity below or alongside the canvas: "Solved by: [email]". Backend must return the approved attempt's submitter email when the project is closed.
- **D-18:** Non-interactive canvas for closed projects — fragments are visible but dragging and transforming are disabled.

### Claude's Discretion
- Exact wording of "Save Attempt" / "Publish Attempt" button labels (e.g., "Save Progress" / "Submit").
- Confirmation dialog before publishing (recommended: yes, to prevent accidental publish).
- Loading state / feedback messages for Save and Publish actions.
- CSS styling for the user attempt section — match existing dark industrial aesthetic.
- Where exactly "Solved by: [email]" appears in the closed project layout.
- Exact backend upsert logic (UPSERT vs SELECT-then-INSERT/UPDATE for draft creation).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend
- `server/schema.sql` — `attempts` table: id, project_id, user_id, layout (TEXT/JSON), status (draft/published/approved/rejected), submitted_at, reviewed_at, created_at
- `server/routes/projects.js` — existing project routes; GET /api/projects and GET /api/projects/:id need role-open changes; POST/PATCH/close remain admin-only
- `server/middleware/auth.js` — `requireAuth`, `requireRole` — use for new attempt routes
- `server/db.js` — better-sqlite3 (synchronous); use db.transaction for upsert if needed

### Frontend (existing)
- `puzzle-fragments/src/pages/ProjectDetailPage.jsx` — page being extended; ProjectCanvas (inline), AttemptRow, role gating via useRole()
- `puzzle-fragments/src/pages/ProjectsPage.jsx` — project list page; New Project button already role-gated
- `puzzle-fragments/src/store/useProjectStore.js` — add attempt-related actions (saveDraft, publishAttempt, fetchUserDraft)
- `puzzle-fragments/src/hooks/useRole.js` — role gating hook used throughout
- `puzzle-fragments/src/store/authStore.js` — authHeaders() pattern for API calls

### Requirements
- `.planning/REQUIREMENTS.md` — COLLAB-01 through COLLAB-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 4 success criteria (all 5 must be TRUE)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProjectCanvas` (inline in ProjectDetailPage.jsx:121) — renders fragments from props, handles drag/rotate/transform; for closed projects, pass `draggable={false}` or wrap Stage with pointer-events disabled
- `useProjectStore` — add `saveDraft(projectId, layout)`, `publishAttempt(attemptId)`, `fetchUserDraft(projectId)` actions following existing fetch/save pattern
- `useRole()` hook — already imported in ProjectDetailPage; controls admin-only UI sections
- `authHeaders()` in useProjectStore — reuse exact pattern for new attempt API calls
- `toCanvasFragment()` helper in ProjectDetailPage.jsx:24 — converts server fragment row to canvas shape; reuse for loading attempt layout positions

### Established Patterns
- **Role-conditional rendering:** `{role === 'admin' && <AdminControl />}` — already used for Save Layout, Close Project, New Project button
- **Local canvas state:** `canvasFragments` useState in ProjectDetailPage — user's attempt canvas state follows same pattern
- **Explicit save model:** Admin uses "Save Layout" button; user "Save Attempt" follows identical UX pattern (no auto-save)
- **Zustand stores (no persist):** project state is session-scoped, re-fetched from API on load — attempt store follows same pattern
- **Plain CSS, dark industrial aesthetic:** match existing `.detail-page`, `.canvas-toolbar`, `.btn-save-layout` classes

### Integration Points
- `ProjectDetailPage.jsx` — extend with user attempt state (draft load, save, publish) and closed project read-only canvas; role check gates which controls render
- `server/routes/projects.js` — open GET routes to all auth users; add attempt sub-routes or create `server/routes/attempts.js`
- `server/index.js` — register new attempts router if extracted to its own file
- `App.jsx` — no new routes needed (reusing /projects/:id)
- `useProjectStore.js` — add attempt actions

</code_context>

<specifics>
## Specific Ideas

- For closed project canvas: simplest approach is to pass a `readOnly` prop to ProjectCanvas and disable Konva `draggable` on each FragmentNode. The Transformer should not be rendered in read-only mode.
- Draft upsert: backend can use SQLite `INSERT OR REPLACE` or a `SELECT` then conditional `INSERT`/`UPDATE` — either works, use whichever keeps the route handler cleanest.
- When loading a closed project, the backend should include the approved attempt's layout + submitter email in `GET /api/projects/:id` response (or a new dedicated field like `solution`).

</specifics>

<deferred>
## Deferred Ideas

- User viewing their own published/rejected attempt history — not in COLLAB scope
- Multiple attempts per user per project — deferred, one draft at a time is sufficient for v1.1
- Real-time updates (e.g., see when another user submits) — explicitly out of scope (REQUIREMENTS.md)
- Score display for users — Phase 5 (SCORE-04, SCORE-05)
- Admin approval/rejection of attempts — Phase 5 (SCORE-01, SCORE-02, SCORE-03)

</deferred>

---

*Phase: 04-collaboration*
*Context gathered: 2026-04-26*
