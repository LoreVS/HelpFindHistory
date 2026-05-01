---
phase: quick
plan: 260501-dxm
status: complete
tags: [hints, segments, contour, bugfix]
key-files:
  modified:
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
---

# Quick Task 260501-dxm: Fix hints — compute segments on image load, hide toggle in read-only

## Root Cause

Server-loaded fragments are hydrated via `toCanvasFragment()` which sets `segments: []`. The contour analysis runs at upload time (client-side in `useBackgroundRemoval`) but the result was never stored on the server. So every page load started with empty segments — causing hints to silently produce nothing.

## What Was Fixed

### 1. Compute segments from server images (`FragmentNode.useEffect`)

When a fragment image loads and `fragment.segments` is empty, an offscreen canvas is created, `extractContourSegments()` runs on it, and the result is merged into fragment state via `onUpdate`. This happens once per fragment (same `fragment.src` dependency).

Combined with the existing dimension-correction update into a single `onUpdate` call to avoid double state merges.

### 2. Hide hints toggle in read-only mode

The "Hints ON/OFF" toolbar button is now wrapped in `{!isClosed && (...)}`. In closed/read-only projects the toggle is absent — no point offering a display-only control that affects nothing actionable.

## Commit

`96ee20e` — fix(quick-260501-dxm): compute contour segments on server image load, hide hints toggle in read-only mode
