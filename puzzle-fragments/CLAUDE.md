# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server with HMR
npm run build     # production build
npm run lint      # ESLint check
npm run preview   # preview production build
```

No test runner is configured.

## Architecture

**Puzzle Forge** is a React + Vite app that lets users drag-and-drop photos of physical puzzle fragments, automatically removes their backgrounds, then displays them on an interactive canvas where matching edges are highlighted.

### Data flow

1. **`Dropzone.jsx`** accepts image files → calls `useBackgroundRemoval` hook
2. **`useBackgroundRemoval.js`** (hook):
   - Creates a canvas, detects if image already has transparency; if not, runs a 4-corner flood-fill to erase the background color (tolerance = 40)
   - Calls `extractContourSegments()` on the processed canvas **before** scaling
   - Stores each fragment in Zustand with: `src` (transparent PNG blob URL), `previewSrc` (original blob URL), display `width`/`height` (scaled to max 320px), `originalWidth`/`originalHeight`, `segments`, `centroid`, plus random initial canvas position/rotation
3. **`useFragmentStore.js`** — Zustand store with `fragments[]`, `addFragment`, `updateFragment`, `removeFragment`, `clearAll`
4. **`FragmentCanvas.jsx`** — react-konva `Stage` → `Layer` → one `FragmentNode` per fragment
   - `FragmentNode` renders a `KonvaImage` + colored `Line` overlays for contour segments
   - Transformer handles drag/scale/rotate; writes back to store on `onDragEnd`/`onTransformEnd`
   - On fragment selection, calls `matchContourSegments()` to find segments of other fragments that match the selected one, then highlights them with matching colors
5. **`contourAnalysis.js`**:
   - `extractContourSegments(canvas)` — Moore-neighborhood contour trace → RDP simplification (ε = 1.8) → corner detection (20°) → merge short segments → cap at 8 segments; each segment gets a normalized shape signature (32-point resample, centered + scaled)
   - `matchContourSegments(selectedFrag, allFragments)` — compares reversed signatures of other fragments' segments against selected fragment's segments using Euclidean distance; adaptive threshold (globalBest × 2.2, max 0.55)
6. **`edgeAnalysis.js`** — edge-pixel color histogram utilities (`extractEdgeHistogram`, `histogramSimilarity`, `findCompatible`); currently not wired into the UI but available for future matching improvements

### Key invariants

- Contour coordinates are in **original image pixels** (`originalWidth`/`originalHeight`). `FragmentNode` scales them to display size via `sx = fragment.width / fragment.originalWidth`.
- Segment colors (`SEG_COLORS` in `contourAnalysis.js`) are shared between the selected fragment's own segments and the highlighted matching segments on other fragments — same color = same match pair.
- `@imgly/background-removal` is installed but **not used** — the app does its own canvas-based flood-fill instead. It is excluded from Vite's `optimizeDeps` to avoid slow pre-bundling.
