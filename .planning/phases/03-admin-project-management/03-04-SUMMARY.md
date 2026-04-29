---
phase: "03"
plan: "04"
subsystem: ui
tags: [react, konva, zustand, react-router, css, project-detail, fragment-canvas, dropzone, upload]
dependency_graph:
  requires:
    - phase: "03-02"
      provides: useProjectStore (fetchProject, uploadFragment, saveLayout, closeProject)
    - phase: "03-01"
      provides: POST /api/projects/:id/fragments, PATCH /api/projects/:id/layout, POST /api/projects/:id/close
    - phase: "02"
      provides: useRole hook, authStore logout, ProtectedRoute
  provides:
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx (/projects/:id route component)
    - puzzle-fragments/src/pages/ProjectDetailPage.css (two-section layout, canvas toolbar)
    - puzzle-fragments/src/components/ProjectDropzone.jsx (server-backed upload dropzone)
  affects:
    - "04" (Phase 4 users will see fragments uploaded here when opening projects)
tech-stack:
  added: []
  patterns:
    - "Local canvas state pattern: hydrate from server, update on drag/rotate, persist on explicit Save"
    - "ProjectCanvas inline component — mirrors FragmentCanvas internals but reads props not store"
    - "Blob URL→fetch→blob pipeline for multipart server upload after bg removal"
    - "toCanvasFragment() mapper for server FragmentRow→Konva fragment shape"
key-files:
  created:
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.css
    - puzzle-fragments/src/components/ProjectDropzone.jsx
  modified: []
key-decisions:
  - "ProjectCanvas defined inline in ProjectDetailPage (not modifying FragmentCanvas.jsx) — backwards compat for /canvas route (D-03)"
  - "Local canvasFragments state initialized from currentProject.fragments on load; not re-synced to store — explicit Save Layout is the only write path (D-16)"
  - "Blob URL fetched via fetch() inside ProjectDropzone onDrop before upload — useBackgroundRemoval returns blob URL not raw blob"
  - "isClosed check disables both Save Layout button and ProjectDropzone to enforce read-only on closed projects (D-09, T-03-14)"
  - "AttemptRow modal stubs Approve/Reject with console.log — wired in Phase 5 (D-08)"
  - "Save Layout persists width/height/originalWidth/originalHeight in metadata — enables reload fidelity (D-17)"
metrics:
  duration: "3m"
  completed: "2026-04-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 3 Plan 4: ProjectDetailPage Summary

**ProjectDetailPage with ProjectCanvas (server-hydrated fragment drag/rotate), ProjectDropzone (bg removal + server upload), Save Layout (PATCH /layout), Close Project, and attempts list with stub approval modal.**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ProjectDropzone component | d0ab564 | puzzle-fragments/src/components/ProjectDropzone.jsx (created) |
| 2 | Build ProjectDetailPage with canvas, upload, save, close, and attempts list | 8c3c1be | puzzle-fragments/src/pages/ProjectDetailPage.jsx, puzzle-fragments/src/pages/ProjectDetailPage.css (created) |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

- `ProjectCanvas` defined inline in `ProjectDetailPage.jsx` rather than modifying `FragmentCanvas.jsx` — keeps the `/canvas` route unchanged (D-03 backwards compat)
- Local `canvasFragments` React state holds canvas positions; only written to server on explicit "Save Layout" click — no auto-save (D-16)
- `ProjectDropzone.onDrop` fetches blob from the blob URL returned by `processFiles` before POSTing to server — `useBackgroundRemoval` does not expose raw blob directly
- `isClosed` disables both the `ProjectDropzone` (`disabled` prop) and the `btn-save-layout` button — closed projects are fully read-only from the UI (T-03-14 mitigated)
- `handleFragmentUploaded` uses local blob URL for immediate canvas display (avoids a server round-trip for preview) while server row provides the DB `id` for future layout saves
- `toCanvasFragment()` stores `dbId` (numeric) alongside Konva `id` (string) to disambiguate canvas selection IDs from DB IDs used in `saveLayout`

## Known Stubs

- `AttemptRow` modal: Approve/Reject buttons log `[stub] approve/reject attempt {id}` to console — full approval logic wired in Phase 5 (SCORE-02, SCORE-03). This is intentional per plan (D-08).
- `fragment.segments` is always `[]` for server-loaded fragments — contour data is not stored server-side in Phase 3. Edge-match highlighting works only for freshly uploaded fragments in the same session (blob URL path). This matches plan scope — no Phase 3 requirement for server-side contour persistence.

## Threat Flags

None — T-03-14 (Save Layout + Close Project buttons gated on `role === 'admin'`) applied as specified. T-03-12 (local canvas state only, no server write until Save Layout) confirmed by implementation.

## Self-Check: PASSED

- puzzle-fragments/src/components/ProjectDropzone.jsx exists: FOUND
- puzzle-fragments/src/pages/ProjectDetailPage.jsx exists: FOUND
- puzzle-fragments/src/pages/ProjectDetailPage.css exists: FOUND
- Commit d0ab564 exists: FOUND
- Commit 8c3c1be exists: FOUND
- Build succeeds: PASSED (vite build: 123 modules transformed, no errors)
