---
phase: 04-collaboration
plan: "03"
subsystem: frontend-ui
tags: [collaboration, canvas, user-attempts, read-only, role-gating, css]
dependency_graph:
  requires:
    - 04-01  # backend routes: /api/projects/:id/attempts/me, /api/projects/:id/attempts, /api/attempts/:id/publish
    - 04-02  # store actions: fetchUserDraft, saveDraft, publishAttempt
  provides:
    - COLLAB-01  # user sees only open projects (ProjectsPage filter, no change here)
    - COLLAB-02  # user opens project, sees canvas with fragments
    - COLLAB-03  # user saves draft arrangement via Save Attempt
    - COLLAB-04  # user publishes attempt via two-click confirm flow
    - COLLAB-05  # closed project shows read-only canvas with approved solution + solver attribution
  affects:
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.css
tech_stack:
  added: []
  patterns:
    - Three-way canvas hydration (closed/user+open/admin) via useEffect with [currentProject, role] deps
    - readOnly prop threading: ProjectCanvas → FragmentNode (draggable, onClick, onDragEnd, onTransformEnd)
    - Conditional Transformer render gated on !readOnly
    - Role-conditional JSX for toolbar sections (admin vs user vs closed)
    - Publish confirmation modal reusing existing .attempt-modal-backdrop/.attempt-modal classes
    - emptyMessage prop on ProjectCanvas for role-appropriate empty state copy
key_files:
  modified:
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.css
decisions:
  - "fetchUserDraft called only in role !== 'admin' branch — never for admin (Pitfall 5 guard)"
  - "Layout serialization uses id: f.dbId (numeric) — rehydration matches on l.id === f.id (Pitfall 2 guard)"
  - "Publish button removed from DOM via {!isPublished && ...} — not just disabled (D-11, T-04-UI-02)"
  - "All currentProject.solution accesses guarded with currentProject.solution && (T-04-UI-03)"
  - "Admin saveMsg rendered inside admin block — user saveMsg rendered inside user block; no double-render"
  - "fetchUserDraft warning in lint is acceptable — store actions are stable Zustand references"
  - "emptyMessage prop added to ProjectCanvas instead of passing isAdmin — avoids role prop drilling into canvas component"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 4 Plan 03: Frontend Collaboration UI Summary

Extended `ProjectDetailPage.jsx` with the complete Phase 4 user-facing collaboration interface and added 9 new CSS classes to `ProjectDetailPage.css`.

## What Was Built

### Task 1: ProjectDetailPage.jsx — Full Phase 4 UI (commit ed9ecfb)

**Three-way canvas hydration** replacing the single `setCanvasFragments(mapped)` call:
- `status === 'closed'` → loads `project.solution.layout` positions into canvas fragments (read-only)
- `role !== 'admin'` (open project) → calls `fetchUserDraft(projectId)`, hydrates from draft layout if found; falls back to reference layout; sets `currentAttemptId` and `isPublished` state
- Admin (open project) → unchanged existing behavior

**readOnly prop on FragmentNode:**
- `draggable={!readOnly}` — fragments not draggable when closed
- `onClick`, `onTap` → `undefined` when readOnly
- `onDragEnd`, `onTransformEnd` → `undefined` when readOnly

**readOnly prop on ProjectCanvas:**
- `Transformer` wrapped in `{!readOnly && (...)}` — no selection handles on closed canvas
- `onSelect` prop to `FragmentNode` conditionally: `readOnly ? () => {} : setSelectedId`
- `emptyMessage` prop for role-appropriate empty state copy

**User attempt toolbar** (renders when `role !== 'admin' && !isClosed`):
- Save Attempt button with `saving` disabled state and `Saving…` label
- Publish Attempt button — removed from DOM once `isPublished` is true (not just disabled)
- Feedback span with `.save-msg--error` modifier for error messages

**Publish confirmation modal** (renders when `showPublishConfirm`):
- Reuses `.attempt-modal-backdrop` and `.attempt-modal` classes
- "Publish now" (`btn-publish-confirm`) + "Keep editing" (`btn-modal-close`)
- `handlePublishAttempt` sets `isPublished(true)` on success, sets `showPublishConfirm(false)` first

**Role gating:**
- `ProjectDropzone` wrapped in `{role === 'admin' && (...)}`
- `.detail-attempts-section` wrapped in `{role === 'admin' && (...)}`
- Read-only toolbar label: `{isClosed && role !== 'admin' && <span className="canvas-toolbar-readonly">READ-ONLY · Approved Solution</span>}`

**Solver attribution** (renders when `isClosed && currentProject.solution`):
- `SOLVED BY: <span className="canvas-solver-email">{currentProject.solution.submitter_email}</span>`
- Placed inside `.detail-canvas-area` below the canvas

**New state variables added:**
- `currentAttemptId` — tracks the user's draft/published attempt ID
- `isPublished` — gates the Publish Attempt button DOM presence
- `showPublishConfirm` — controls the publish confirmation modal
- `publishing` — in-progress state for publish action

**New store actions destructured:** `fetchUserDraft`, `saveDraft`, `publishAttempt`

### Task 2: ProjectDetailPage.css — 9 New Classes (commit c55a674)

| Class | Purpose |
|-------|---------|
| `.btn-save-attempt` | Save Attempt button — amber outline, fills on hover |
| `.btn-publish-attempt` | Publish Attempt button — identical tokens, different label |
| `.btn-publish-confirm` | Publish now button — solid amber fill, font-weight 700 |
| `.publish-confirm-body` | Publish dialog warning copy — overrides italic from .attempt-modal-placeholder |
| `.save-msg--error` | Error color modifier (`#e05c5c`) for feedback message |
| `.attempt-status--draft` | Draft badge — dark blue tones `#1a1a2a`/`#888`/`#2a2a4a` |
| `.canvas-toolbar-readonly` | Muted uppercase label (`#555`) in closed project toolbar |
| `.canvas-solver` | Attribution row — `#141414` bg, `border-top: 1px solid #222` |
| `.canvas-solver-email` | Email span — `#d4c5a9` text |

No existing CSS rules were modified.

## Verification Results

All acceptance criteria met:

- `fetchUserDraft`, `saveDraft`, `publishAttempt` destructured from `useProjectStore` — PASS
- `useState` declarations include all four new Phase 4 state vars — PASS
- Canvas hydration `useEffect` has `[currentProject, role]` dep array — PASS
- Three hydration branches present: closed, user+open, admin — PASS
- `fetchUserDraft` called ONLY in `role !== 'admin'` branch — PASS
- Layout serialization uses `id: f.dbId` (numeric) — PASS
- `FragmentNode` signature includes `readOnly = false` — PASS
- `FragmentNode` Group has `draggable={!readOnly}` — PASS
- `onDragEnd` and `onTransformEnd` are `readOnly ? undefined : ...` — PASS
- `ProjectCanvas` signature includes `readOnly = false` and `emptyMessage` — PASS
- `Transformer` wrapped in `{!readOnly && (...)}` — PASS
- `ProjectCanvas` call site passes `readOnly={isClosed}` — PASS
- `ProjectDropzone` gated: `{role === 'admin' && (...)}` — PASS
- `.detail-attempts-section` gated: `{role === 'admin' && (...)}` — PASS
- User toolbar renders when `role !== 'admin' && !isClosed` — PASS
- `isPublished` controls Publish Attempt button DOM removal — PASS
- `showPublishConfirm` controls publish modal — PASS
- `handlePublishAttempt` sets `isPublished(true)` on success — PASS
- Publish modal uses `.attempt-modal-backdrop` and `.attempt-modal` classes — PASS
- Solver attribution renders when `isClosed && currentProject.solution` — PASS
- All 9 CSS classes present with correct token values — PASS
- `npm run lint` — 0 errors, 2 warnings (pre-existing FragmentCanvas warning + stable store action pattern)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor structural refinement:

**Structural refinement (not a deviation):** The admin `saveMsg` span was moved inside the admin block (`role === 'admin' && (...)`) rather than keeping the outer always-rendered `{saveMsg && <span>}`. This avoids rendering saveMsg twice (once from admin Save Layout, once from user Save Attempt) and is cleaner than the plan's "OR leave the outer saveMsg in place" option. The plan explicitly described this as the "cleanest approach."

**emptyMessage prop:** Added `emptyMessage` prop to `ProjectCanvas` per the plan's pitfall check guidance (Change 2 action section). Passes role-appropriate copy from the call site: closed → "No fragments in this project.", admin → "Upload fragment photos using the panel on the left", user → "No fragments loaded. The archaeologist hasn't uploaded any yet."

## Known Stubs

None introduced in this plan. The `AttemptRow` modal Approve/Reject stub exists from Phase 3 — tracked in that plan.

## Threat Flags

No new security surface introduced. All threat model mitigations applied:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-04-UI-01: Admin controls spoofing | All admin elements gated with `role === 'admin'` — no DOM nodes for non-admin |
| T-04-UI-02: Double publish | `isPublished` removes Publish button from DOM after success |
| T-04-UI-03: Null solution crash | All `currentProject.solution` accesses guarded with `currentProject.solution &&` |
| T-04-UI-04: Layout key mismatch | `layoutToSave` uses `id: f.dbId` (numeric), rehydration uses `l.id === f.id` |

## Self-Check: PASSED

- `/Users/apple/Desktop/Vortex/puzzle-fragments/src/pages/ProjectDetailPage.jsx` — FOUND
- `/Users/apple/Desktop/Vortex/puzzle-fragments/src/pages/ProjectDetailPage.css` — FOUND
- Commit `ed9ecfb` (Task 1) — FOUND
- Commit `c55a674` (Task 2) — FOUND
