# Phase 3: Admin — Project Management - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin-only CRUD for projects: create projects, upload fragment photos (with background removal), arrange fragments on canvas and save layout, view all projects and their submitted attempts, and close projects. No collaboration or scoring — those are Phase 4 and 5.

</domain>

<decisions>
## Implementation Decisions

### Navigation
- **D-01:** Everyone (admin and regular users) lands on `/projects` after login — the canvas is no longer the home route. The canvas opens only from within a project context.
- **D-02:** Routes introduced in Phase 3: `/projects` (project list) and `/projects/:id` (project detail with canvas + attempts list).
- **D-03:** The existing `/` route (raw canvas) may remain for backwards compat but is no longer the primary entry point.

### Project List (`/projects`)
- **D-04:** Projects are displayed as a **card grid**. Each card shows: project name, description snippet, status badge (open/closed), and fragment count.
- **D-05:** A **"New Project" button** on `/projects` opens a creation form (name + description). Creating a project navigates admin to `/projects/:id`.
- **D-06:** Cards are clickable to open `/projects/:id`. No delete/close buttons on the list — those actions live inside the project detail page.

### Project Detail (`/projects/:id`)
- **D-07:** Admin sees two sections: (1) fragment canvas at the top, (2) submitted attempts list below (empty in Phase 3 — populated in Phase 4/5).
- **D-08:** Each attempt row shows the submitter's username. Clicking an attempt opens a **modal** with the saved canvas result. Inside the modal, admin can approve or reject the attempt (Phase 5 functionality — stub the UI but wire the action in Phase 5).
- **D-09:** A **"Close Project"** button on `/projects/:id` sets `status = 'closed'`. Phase 5 auto-close via approval is additive — the manual close button remains for admin control.

### Fragment Upload
- **D-10:** Reuse the **existing Dropzone component** for fragment upload, adapted to POST files to the server.
- **D-11:** **Background removal runs in the frontend** (existing pipeline) before the processed image is sent to the server — consistent with the existing canvas behavior.
- **D-12:** Processed files are stored in `server/data/uploads/`. A `fragments` DB row is created per file, linking to the project.
- **D-13:** Multi-file upload supported (Dropzone already accepts multiple files).

### Admin Canvas
- **D-14:** Reuse the existing **`FragmentCanvas` component** inside `/projects/:id`. Fragments are loaded from the server and hydrated into the canvas.
- **D-15:** Admin can **drag and rotate fragments** on the canvas (full existing canvas interaction including edge-match highlighting).
- **D-16:** A **"Save Layout" button** in the canvas header explicitly persists the current fragment positions/metadata back to the server. No auto-save.
- **D-17:** The saved layout lives in `fragments.metadata` (JSON field per fragment — stores position, rotation, scale). This becomes the reference arrangement Phase 4 users see when they open the project.

### Backend Routes (new in Phase 3)
- **D-18:** New API routes needed:
  - `POST /api/projects` — create project (name, description)
  - `GET /api/projects` — list all projects
  - `GET /api/projects/:id` — get project with its fragments
  - `POST /api/projects/:id/fragments` — upload fragment (multipart/form-data)
  - `PATCH /api/projects/:id/layout` — save fragment layout (positions)
  - `POST /api/projects/:id/close` — close project (admin only)
- **D-19:** All project routes require `requireAuth` + `requireRole('admin')` middleware (already exists).

### Claude's Discretion
- Exact "New Project" form design (inline expand, modal, or separate page — either works).
- CSS for project cards and the `/projects` page layout.
- Fragment ordering on the canvas when first loaded (auto-spread or grid arrangement before admin arranges).
- Confirmation dialog before closing a project (good UX, implementation detail).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend
- `server/schema.sql` — `projects`, `fragments`, `attempts` table definitions (layout/metadata fields)
- `server/routes/auth.js` — existing route pattern to follow for new project routes
- `server/middleware/auth.js` — `requireAuth`, `requireRole` middleware signatures
- `server/index.js` — where new routers are registered

### Frontend (existing)
- `puzzle-fragments/src/components/FragmentCanvas.jsx` — canvas component being reused; understand its current props/state contract
- `puzzle-fragments/src/components/Dropzone.jsx` — upload component being adapted for server POST
- `puzzle-fragments/src/store/useFragmentStore.js` — fragment state — understand how it's used before introducing project-scoped state
- `puzzle-fragments/src/store/authStore.js` — token available for `Authorization: Bearer` headers on API calls
- `puzzle-fragments/src/hooks/useRole.js` — role gating hook

### Requirements
- `.planning/REQUIREMENTS.md` — PROJ-01 through PROJ-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 3 success criteria (all 5 must be TRUE)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FragmentCanvas.jsx` — reused as the admin canvas inside `/projects/:id`; currently expects fragments from `useFragmentStore` — will need to accept project fragments from API
- `Dropzone.jsx` — currently processes images client-side only; needs to be adapted to POST processed images to `POST /api/projects/:id/fragments`
- `useFragmentStore.js` — manages canvas state; need to understand if it's replaced or extended for project-scoped fragments
- `useRole.js` — use to gate admin-only UI (New Project button, Close Project button, Save Layout button)
- `authStore.js` — provides `token` for authenticated API requests

### Established Patterns
- **Zustand** for state — new project/fragment stores should follow same `create()` pattern
- **Plain CSS** — no CSS framework; match existing dark industrial aesthetic
- **Background removal** — runs in browser canvas pipeline; output is a processed image blob ready to POST
- **Express + SQLite** — existing route/DB patterns in `server/routes/auth.js` and `server/db.js`

### Integration Points
- `main.jsx` — `BrowserRouter` already in place; new routes registered in `App.jsx`
- `App.jsx` — add `/projects` and `/projects/:id` routes inside `<ProtectedRoute>`
- `server/index.js` — register new `projectsRouter`
- `ProtectedRoute` — already wraps authenticated routes; admin-only routes can add a role check layer

</code_context>

<specifics>
## Specific Ideas

- `/projects/:id` layout: canvas on top half, attempts list on bottom — standard project detail pattern
- The approval modal (clicking an attempt) is scaffolded in Phase 3 but wired in Phase 5 — stub with "Approve / Reject" buttons that log or show a placeholder
- Ukrainian tagline ("// відновлення форми з уламків") should appear on `/projects` header for brand continuity

</specifics>

<deferred>
## Deferred Ideas

- Approve/reject attempt logic — Phase 5 (SCORE-02, SCORE-03)
- User-facing `/projects` browse view — Phase 4 (COLLAB-01)
- Auto-close on approval — Phase 5 (SCORE-02)
- Delete project capability — not in v1.1 scope
- Edit project name/description after creation — deferred to v2 (PADM-01)

</deferred>

---

*Phase: 03-admin-project-management*
*Context gathered: 2026-04-21*
