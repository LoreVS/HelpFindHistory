---
phase: 05-scoring
plan: 03
subsystem: frontend-ui
tags: [scoring, react, konva, canvas-preview, approve-workflow, score-chip, css]
dependency_graph:
  requires:
    - 05-01 (backend approve/reject/users-me endpoints)
    - 05-02 (useProjectStore approveAttempt/rejectAttempt/fetchUserScore, authStore setScore)
  provides:
    - Reward (pts) number input in New Project form, wired to createProject(name, desc, reward)
    - Score chip (★ N) in ProjectsPage header for role=user
    - Score chip (★ N) in ProjectDetailPage header for role=user
    - Score chip (★ N) in CanvasApp header for role=user
    - AttemptRow full implementation: canvas preview, approve confirm modal, reject flow
    - fetchUserScore called on mount for role=user in both ProjectsPage and ProjectDetailPage
  affects:
    - puzzle-fragments/src/pages/ProjectsPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.css
    - puzzle-fragments/src/App.jsx
    - puzzle-fragments/src/App.css
tech_stack:
  added: []
  patterns:
    - useMemo for previewFragments — mirrors COLLAB-05 solution canvas hydration
    - role=admin conditional JSX gates — same pattern as admin-badge in prior phases
    - approve-confirm-backdrop onClick does NOT close — T-05-12 mitigation (accidental dismissal)
    - fetchUserScore called in useEffect role branch — non-blocking best-effort score sync
key_files:
  created: []
  modified:
    - puzzle-fragments/src/pages/ProjectsPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.css
    - puzzle-fragments/src/App.jsx
    - puzzle-fragments/src/App.css
decisions:
  - AttemptRow receives currentProject prop to access fragments and reward for canvas preview and confirm copy
  - approve-confirm-backdrop stopPropagation (not setShowConfirm) — prevents accidental modal close (T-05-12)
  - fetchUserScore added to both ProjectsPage and ProjectDetailPage useEffect role branches — score stays fresh on every page mount
  - score chip placed before btn-end-session in all three headers — consistent ordering across pages
metrics:
  duration: "~4 minutes"
  completed: "2026-04-30"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 5
---

# Phase 5 Plan 03: Scoring UI Summary

**One-liner:** Reward input in New Project form, full AttemptRow with live Konva canvas preview and approve/confirm/reject workflow, score chip in all three page headers — completes the Phase 5 user-visible scoring workflow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add reward input to ProjectsPage New Project form; add score chip to ProjectsPage header | e9bb2b2 | puzzle-fragments/src/pages/ProjectsPage.jsx |
| 2 | Replace AttemptRow stub in ProjectDetailPage; add score chip; add CSS for review and confirm modals | 952903d | puzzle-fragments/src/pages/ProjectDetailPage.jsx, puzzle-fragments/src/pages/ProjectDetailPage.css |
| 3 | Add score chip CSS to App.css and wire score chip in App.jsx CanvasApp header | e154522 | puzzle-fragments/src/App.css, puzzle-fragments/src/App.jsx |

## What Was Built

### Task 1 — ProjectsPage (e9bb2b2)

- Added `const [newReward, setNewReward] = useState(1)` state variable
- Added `fetchUserScore` to useProjectStore destructure
- Added `const user = useAuthStore((state) => state.user)` selector
- Extended useEffect to call `fetchUserScore()` inside the `role !== 'admin'` branch
- Updated `handleCreate` to call `createProject(newName.trim(), newDesc.trim(), Number(newReward))`
- Added `<input id="proj-reward" type="number" min={1}>` form field with label "Reward (pts)"
- Added `{role === 'user' && <span className="score-chip">&#9733; {user?.score ?? 0}</span>}` before btn-end-session

### Task 2 — ProjectDetailPage.jsx + ProjectDetailPage.css (952903d)

- Added `approveAttempt, rejectAttempt, fetchUserScore` to useProjectStore destructure at component level
- Added `const user = useAuthStore((state) => state.user)` selector
- Added `fetchUserScore()` call in role !== 'admin' useEffect branch (alongside fetchUserDraft)
- Added score chip in detail-header-right before btn-end-session
- Updated `<AttemptRow>` call site to pass `currentProject={currentProject}` prop
- Replaced entire AttemptRow stub (lines 617-673) with full Phase 5 implementation:
  - Props: `{ attempt, currentProject }`
  - State: `showModal`, `showConfirm`, `approving`, `rejecting`
  - `previewFragments` via `useMemo` — maps `attempt.layout` positions onto `currentProject.fragments` using `toCanvasFragment` helper
  - `handleApprove` — calls `approveAttempt`, re-fetches project, closes both modals
  - `handleReject` — calls `rejectAttempt`, closes review modal only
  - Review modal: `className="attempt-modal attempt-modal--canvas"` with read-only `<ProjectCanvas readOnly={true}>`
  - Approve/Reject buttons gated `{role === 'admin' && ...}` (T-05-10 mitigation)
  - Approve button: `onClick={() => setShowConfirm(true)}` — opens confirm modal, not direct action
  - Confirm modal: `approve-confirm-backdrop` with `onClick={e.stopPropagation()}` (NOT setShowConfirm — T-05-12)
  - Confirm body: "This will close the project and award {currentProject?.reward ?? '?'} pts to {attempt.submitter_email}."
  - Confirm Approve button: `className="btn-approve-confirm"`; Cancel: text "Keep reviewing"
- Added 7 new CSS classes to ProjectDetailPage.css:
  - `.attempt-modal--canvas` (max-width: 720px)
  - `.attempt-modal-canvas` (height: 340px, background: #111111)
  - `.approve-confirm-backdrop` (z-index: 200)
  - `.approve-confirm-modal` (max-width: 400px)
  - `.approve-confirm-modal h3`
  - `.approve-confirm-body`
  - `.btn-approve-confirm` (+ `:hover`, `:disabled`)

### Task 3 — App.css + App.jsx (e154522)

- Added `.score-chip` CSS class to App.css immediately after `.admin-badge` block:
  - `background: #161616`, `border: 1px solid #2a2a2a`, `border-radius: 4px`
  - `padding: 4px 8px`, `font-family: 'JetBrains Mono', monospace`, `font-size: 14px`
  - `font-weight: 400`, `color: #888`, `letter-spacing: 0.06em`, `flex-shrink: 0`
- Added `const user = useAuthStore((state) => state.user)` in CanvasApp
- Added `{role === 'user' && <span className="score-chip">&#9733; {user?.score ?? 0}</span>}` in CanvasApp header before btn-end-session

## Threat Mitigations Applied

| Threat ID | Applied |
|-----------|---------|
| T-05-10 | Approve/Reject buttons use `{role === 'admin' && <button ...>}` — no DOM node for non-admin users |
| T-05-12 | `approve-confirm-backdrop` uses `onClick={e.stopPropagation()}` (not setShowConfirm) — accidental click does NOT close modal; user must click "Keep reviewing" |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all UI is fully wired to store actions from plans 01 and 02. Score chip displays live data from authStore.user.score (fetched via fetchUserScore on mount). Canvas preview in AttemptRow uses real fragment data from currentProject.fragments with attempt.layout positions.

## Threat Flags

None — no new security surface beyond what was specified in the plan's threat model.

## Self-Check: PASSED

- puzzle-fragments/src/pages/ProjectsPage.jsx: FOUND
- puzzle-fragments/src/pages/ProjectDetailPage.jsx: FOUND
- puzzle-fragments/src/pages/ProjectDetailPage.css: FOUND
- puzzle-fragments/src/App.jsx: FOUND
- puzzle-fragments/src/App.css: FOUND
- Commit e9bb2b2: FOUND
- Commit 952903d: FOUND
- Commit e154522: FOUND
