---
phase: quick
plan: 260501-djv
subsystem: canvas-ui
tags: [hints, toggle, fragments, segments, contour]
tech-stack:
  added: []
  patterns: [conditional-rendering, prop-threading, useState-toggle]
key-files:
  created: []
  modified:
    - puzzle-fragments/src/components/FragmentCanvas.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/App.css
    - puzzle-fragments/src/pages/ProjectDetailPage.css
decisions:
  - showHints state lives at the canvas level (FragmentCanvas) and at the page level (ProjectDetailPage) — not lifted to a store, since hint visibility is ephemeral UI state
  - hints-toggle-wrap floats top-left of canvas-wrap in FragmentCanvas, mirroring the seg-legend top-right position
  - toolbar button used for ProjectDetailPage instead of floating overlay to avoid visual clutter with the existing seg-legend position
  - seg-legend gated with showHints in both canvases so it disappears together with segment lines
metrics:
  duration: ~10 min
  completed: 2026-05-01
  tasks_completed: 3
  files_modified: 4
---

# Quick Task 260501-djv: Hints Toggle Button Summary

One-liner: Floating and toolbar toggle buttons gate contour segment overlays and seg-legend on both canvases; hints ON by default, off hides all colored lines.

## What Was Built

A toggle button was added to both canvas surfaces to let users suppress fragment fit hint overlays (colored contour segment lines + seg-legend) without losing the feature permanently.

### FragmentCanvas.jsx (/canvas route)

- Added `const [showHints, setShowHints] = useState(true)` after existing useState calls
- `ownSegments` gated: `(isSelected && showHints) ? (fragment.segments ?? []) : []`
- `matchSegs` gated: `(!isSelected && selectedId && showHints) ? ... : []`
- `seg-legend` block wrapped in `{showHints && selectedFrag?.segments?.length > 0 && ...}`
- Floating `<div className="hints-toggle-wrap">` added inside `canvas-wrap`, before the seg-legend block

### ProjectDetailPage.jsx (/projects/:id route)

- **handleFragmentUploaded fix**: added `segments: localData.segments ?? []` and `centroid: localData.centroid ?? null` to the spread so newly uploaded fragments carry contour data immediately
- Added `const [showHints, setShowHints] = useState(true)` in `ProjectDetailPage` after `closing` state
- `ProjectCanvas` signature extended with `showHints = true` prop
- `ownSegments`/`matchSegs` gated identically to FragmentCanvas
- `selectedFrag` and `matchCount` computed after `handleStageClick` in `ProjectCanvas`
- `seg-legend` block added to `ProjectCanvas` (was previously absent) — identical Ukrainian strings to FragmentCanvas
- Toggle button added as first child of `.canvas-toolbar-actions` in ProjectDetailPage JSX
- `showHints={showHints}` prop passed to `<ProjectCanvas>` render site

### CSS

**App.css** — appended after `.seg-dot`:
- `.hints-toggle-wrap`: `position: absolute; top: 14px; left: 14px; z-index: 10`
- `.btn-hints-toggle`: transparent background, `#555` border/color, JetBrains Mono 10px, border-radius 4px
- `.btn-hints-toggle.btn-hints-toggle--on`: teal `#00bcd4` border+color
- `.btn-hints-toggle:hover`: teal `#00bcd4`

**ProjectDetailPage.css** — appended after `.btn-close-project:disabled`:
- `.btn-hints-toggle`: transparent, `#555` border/color, Courier New 0.8rem (matches toolbar button token style)
- `.btn-hints-toggle--on` and `:hover`: teal `#00bcd4`

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 5d63e19 | feat(quick-260501-djv): add showHints toggle to FragmentCanvas |
| 2 | 628d89a | feat(quick-260501-djv): add showHints toggle to ProjectDetailPage |
| 3 | fde2cec | feat(quick-260501-djv): add CSS for hints toggle buttons |

## Lint

Pre-existing errors (2 errors, 2 warnings) were present before this task in unrelated code (`approveAttempt`/`rejectAttempt` unused vars in the ProjectDetailPage store destructure at line 245, and missing useEffect dependency warnings). Zero new lint errors introduced by this task.

## Self-Check: PASSED

- `puzzle-fragments/src/components/FragmentCanvas.jsx` — exists, modified
- `puzzle-fragments/src/pages/ProjectDetailPage.jsx` — exists, modified
- `puzzle-fragments/src/App.css` — exists, modified
- `puzzle-fragments/src/pages/ProjectDetailPage.css` — exists, modified
- Commits 5d63e19, 628d89a, fde2cec — all present in git log
