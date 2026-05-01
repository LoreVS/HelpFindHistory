---
phase: quick
plan: 260501-djv
type: execute
wave: 1
depends_on: []
files_modified:
  - puzzle-fragments/src/components/FragmentCanvas.jsx
  - puzzle-fragments/src/pages/ProjectDetailPage.jsx
  - puzzle-fragments/src/App.css
  - puzzle-fragments/src/pages/ProjectDetailPage.css
autonomous: true
requirements: [HINTS-TOGGLE]

must_haves:
  truths:
    - "A toggle button is visible on both canvases (FragmentCanvas at /canvas and ProjectCanvas on /projects/:id)"
    - "Hints are ON by default — segment overlays and seg-legend are visible without any user action"
    - "Clicking the toggle button hides all segment overlay lines and the seg-legend"
    - "Clicking again re-enables segment overlays and the seg-legend"
    - "When hints are OFF, selecting a fragment still works (drag/rotate) but no colored lines appear"
    - "ProjectDetailPage canvas receives segments and centroid from localData on upload so hints can function when a new fragment is added"
  artifacts:
    - path: "puzzle-fragments/src/components/FragmentCanvas.jsx"
      provides: "showHints state, gated ownSegments/matchSegs, conditional seg-legend, floating toggle button"
    - path: "puzzle-fragments/src/pages/ProjectDetailPage.jsx"
      provides: "showHints state in ProjectDetailPage, showHints prop threaded into ProjectCanvas, gated segments in ProjectCanvas, seg-legend in ProjectCanvas, toggle button in canvas-toolbar-actions, segments+centroid spread in handleFragmentUploaded"
    - path: "puzzle-fragments/src/App.css"
      provides: ".hints-toggle-wrap and .btn-hints-toggle (floating variant) styles"
    - path: "puzzle-fragments/src/pages/ProjectDetailPage.css"
      provides: ".btn-hints-toggle (toolbar variant) styles"
  key_links:
    - from: "showHints state (FragmentCanvas)"
      to: "ownSegments / matchSegs arrays"
      via: "ternary: showHints ? fragment.segments : []"
    - from: "showHints prop (ProjectDetailPage → ProjectCanvas)"
      to: "ownSegments / matchSegs arrays inside ProjectCanvas"
      via: "prop threading"
    - from: "handleFragmentUploaded"
      to: "canvasFragments entry"
      via: "spreading segments + centroid from localData"
---

<objective>
Add a toggle button to enable/disable fragment fit hints (contour segment overlays + seg-legend) on
both canvas surfaces. Hints are ON by default. Also fix handleFragmentUploaded to carry segments and
centroid from localData so hints work immediately after a new fragment is uploaded in ProjectDetailPage.

Purpose: Let users suppress the colored contour overlays when they want an unobstructed view of the
fragment arrangement without losing the feature permanently.

Output: Four files modified — FragmentCanvas.jsx, ProjectDetailPage.jsx, App.css, ProjectDetailPage.css.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/apple/Desktop/Vortex/.planning/STATE.md
@/Users/apple/Desktop/Vortex/puzzle-fragments/CLAUDE.md

<interfaces>
<!-- Key shapes the executor needs. No exploration required. -->

From src/components/FragmentCanvas.jsx (current state):
- FragmentCanvas() — default export, uses useFragmentStore, no props
- showHints state does NOT exist yet — must be added with useState(true)
- ownSegments (line 191): `const ownSegments = isSelected ? (fragment.segments ?? []) : []`
- matchSegs (lines 194-199): built from segmentMatches when !isSelected && selectedId
- seg-legend block (lines 161-177): conditional on `selectedFrag?.segments?.length > 0`
- canvas-wrap div (line 153): container where floating toggle should be placed
- Toggle must be INSIDE canvas-wrap, positioned absolute top-left (seg-legend is top-right)

From src/pages/ProjectDetailPage.jsx (current state):
- ProjectCanvas({ fragments, onFragmentUpdate, readOnly, emptyMessage }) — no showHints prop yet
- ownSegments (line 200): `const ownSegments = isSelected ? (fragment.segments ?? []) : []`
- matchSegs (lines 201-206): same pattern as FragmentCanvas
- NO seg-legend exists in ProjectCanvas — must be added (copy from FragmentCanvas.jsx lines 161-177)
- ProjectCanvas needs: selectedFrag and matchCount computed the same way as FragmentCanvas
- canvas-toolbar-actions (line 483): where toolbar toggle button goes — insert BEFORE the role blocks
- ProjectCanvas render site (line 546): `<ProjectCanvas fragments={...} onFragmentUpdate={...} readOnly={...} emptyMessage={...} />`
  — add showHints={showHints} prop here
- handleFragmentUploaded (lines 321-332): spreads src, originalWidth, originalHeight, width, height
  but is MISSING `segments: localData.segments, centroid: localData.centroid`

From App.css — existing floating overlay pattern:
- .seg-legend: position absolute, top:14px, right:14px, z-index:10
- .canvas-wrap: position relative, overflow hidden
- Hints toggle (floating) should mirror .seg-legend positioning but on the LEFT side

From ProjectDetailPage.css — existing toolbar button pattern:
- .btn-save-layout: border:1px solid #e8b84b, color:#e8b84b, padding:5px 14px, font-family Courier New
- .btn-hints-toggle should follow same token structure but use teal/cyan (#00bcd4) when ON, #555 when OFF
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add showHints toggle to FragmentCanvas.jsx</name>
  <files>puzzle-fragments/src/components/FragmentCanvas.jsx</files>
  <action>
    1. Add `const [showHints, setShowHints] = useState(true)` inside the FragmentCanvas component,
       after the existing useState calls (line ~111).

    2. Gate ownSegments to empty when hints are off (line ~191):
       ```
       const ownSegments = (isSelected && showHints) ? (fragment.segments ?? []) : []
       ```

    3. Gate matchSegs to empty when hints are off (line ~194):
       ```
       const matchSegs = (!isSelected && selectedId && showHints)
         ? (segmentMatches[fragment.id] ?? []).map(...)...
         : []
       ```

    4. Wrap the seg-legend block (lines 161-177) in `{showHints && selectedFrag?.segments?.length > 0 && (` — close the extra wrapper after the closing `</div>`.

    5. Add floating hints toggle button inside canvas-wrap div, BEFORE the seg-legend block and BEFORE the Stage element:
       ```jsx
       <div className="hints-toggle-wrap">
         <button
           className={`btn-hints-toggle${showHints ? ' btn-hints-toggle--on' : ''}`}
           onClick={() => setShowHints(v => !v)}
           type="button"
           title={showHints ? 'Hide fit hints' : 'Show fit hints'}
         >
           {showHints ? 'Hints ON' : 'Hints OFF'}
         </button>
       </div>
       ```

    No other changes to FragmentCanvas.jsx.
  </action>
  <verify>App renders at /canvas without console errors. Select a fragment — colored lines appear. Click "Hints ON" button — lines and legend disappear. Click "Hints OFF" — lines return.</verify>
  <done>Toggle button visible in canvas, hints gated correctly, default state is ON.</done>
</task>

<task type="auto">
  <name>Task 2: Add showHints toggle to ProjectDetailPage.jsx (ProjectCanvas + handleFragmentUploaded fix)</name>
  <files>puzzle-fragments/src/pages/ProjectDetailPage.jsx</files>
  <action>
    ### A — Fix handleFragmentUploaded (lines 321-332)
    Add `segments` and `centroid` to the spread so newly uploaded fragments carry their contour data:
    ```js
    setCanvasFragments((prev) => [...prev, {
      ...newFrag,
      src: localData.src,
      originalWidth:  localData.originalWidth,
      originalHeight: localData.originalHeight,
      width:  localData.width,
      height: localData.height,
      segments: localData.segments ?? [],
      centroid: localData.centroid ?? null,
    }])
    ```

    ### B — Add showHints state to ProjectDetailPage
    After the existing `const [closing, setClosing] = useState(false)` line, add:
    ```js
    const [showHints, setShowHints] = useState(true)
    ```

    ### C — Add showHints prop to ProjectCanvas component signature
    Change: `function ProjectCanvas({ fragments, onFragmentUpdate, readOnly = false, emptyMessage = 'No fragments.' })`
    To:     `function ProjectCanvas({ fragments, onFragmentUpdate, readOnly = false, emptyMessage = 'No fragments.', showHints = true })`

    ### D — Gate ownSegments / matchSegs in ProjectCanvas (same pattern as Task 1)
    Line ~200: `const ownSegments = (isSelected && showHints) ? (fragment.segments ?? []) : []`
    Lines ~201-206: `const matchSegs = (!isSelected && selectedId && showHints) ? ... : []`

    ### E — Add selectedFrag + matchCount + seg-legend to ProjectCanvas
    After `const handleStageClick = ...` and before the return, add:
    ```js
    const selectedFrag = fragments.find(f => f.id === selectedId)
    const matchCount = Object.keys(segmentMatches).length
    ```
    Inside the `<div ref={containerRef} className="canvas-wrap">`, add the seg-legend block
    (identical to FragmentCanvas.jsx lines 161-177) — use the Ukrainian strings from FragmentCanvas
    to stay consistent with the codebase language:
    ```jsx
    {showHints && selectedFrag?.segments?.length > 0 && (
      <div className="seg-legend">
        <div className="seg-legend-title">
          {matchCount > 0
            ? `Знайдено співпадінь: ${matchCount} уламків`
            : 'Співпадінь не знайдено'}
        </div>
        <div className="seg-legend-list">
          {selectedFrag.segments.map(seg => (
            <span key={seg.index} className="seg-legend-item">
              <span className="seg-dot" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}` }} />
              сегмент {seg.index + 1}
            </span>
          ))}
        </div>
      </div>
    )}
    ```
    Place this BEFORE the `<Stage ...>` element.

    ### F — Add hints toggle button in canvas-toolbar-actions
    In the JSX return of ProjectDetailPage, inside `<div className="canvas-toolbar-actions">`,
    add the toggle button as the FIRST child (before the role-gated blocks):
    ```jsx
    <button
      className={`btn-hints-toggle${showHints ? ' btn-hints-toggle--on' : ''}`}
      onClick={() => setShowHints(v => !v)}
      type="button"
      title={showHints ? 'Hide fit hints' : 'Show fit hints'}
    >
      {showHints ? 'Hints ON' : 'Hints OFF'}
    </button>
    ```

    ### G — Pass showHints prop to ProjectCanvas render site (line ~546)
    ```jsx
    <ProjectCanvas
      fragments={canvasFragments}
      onFragmentUpdate={handleFragmentUpdate}
      readOnly={isClosed}
      showHints={showHints}
      emptyMessage={...}
    />
    ```
  </action>
  <verify>App renders at /projects/:id without console errors. Select a fragment — colored lines appear (if fragment has contour data). Click "Hints ON" in toolbar — lines disappear. Click "Hints OFF" — lines return. Upload a new fragment — its segments/centroid are present in canvasFragments state (check React DevTools or log).</verify>
  <done>showHints wired end-to-end in ProjectDetailPage. handleFragmentUploaded carries segments+centroid. seg-legend appears in ProjectCanvas. Toggle button in toolbar controls hint visibility.</done>
</task>

<task type="auto">
  <name>Task 3: Add CSS for hints toggle buttons</name>
  <files>
    puzzle-fragments/src/App.css
    puzzle-fragments/src/pages/ProjectDetailPage.css
  </files>
  <action>
    ### App.css — floating toggle (used by FragmentCanvas.jsx)
    Append after the `.seg-dot` block (after line ~418):

    ```css
    /* Hints toggle — floating in canvas-wrap (top-left) */
    .hints-toggle-wrap {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 10;
    }

    .btn-hints-toggle {
      background: transparent;
      border: 1px solid #555;
      color: #555;
      padding: 5px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      cursor: pointer;
      border-radius: 4px;
      transition: border-color 0.15s, color 0.15s;
    }

    .btn-hints-toggle.btn-hints-toggle--on {
      border-color: #00bcd4;
      color: #00bcd4;
    }

    .btn-hints-toggle:hover {
      border-color: #00bcd4;
      color: #00bcd4;
    }
    ```

    ### ProjectDetailPage.css — toolbar toggle (used by ProjectDetailPage.jsx)
    Append after `.btn-close-project:disabled` (after line ~144):

    ```css
    /* Hints toggle — inside canvas-toolbar-actions */
    .btn-hints-toggle {
      background: transparent;
      border: 1px solid #555;
      color: #555;
      padding: 5px 14px;
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
    }

    .btn-hints-toggle.btn-hints-toggle--on {
      border-color: #00bcd4;
      color: #00bcd4;
    }

    .btn-hints-toggle:hover {
      border-color: #00bcd4;
      color: #00bcd4;
    }
    ```

    No other changes to either CSS file.
  </action>
  <verify>At /canvas: toggle button appears top-left of canvas in teal outline when ON, dim grey when OFF. At /projects/:id: toggle button appears in toolbar between the title area and save buttons, same teal/grey states.</verify>
  <done>Visual states correct. No layout breakage. Existing button styles (amber save, red close) unaffected.</done>
</task>

</tasks>

<verification>
1. `npm run lint` passes with no new errors in the four modified files.
2. At `/canvas`: page loads, toggle button present top-left, teal when ON. Select a fragment → lines+legend visible. Toggle OFF → lines+legend hidden. Toggle ON → restored.
3. At `/projects/:id` (any open project): toolbar shows "Hints ON" button in teal. Toggle works same as /canvas. Upload a new fragment — contour analysis runs (fragment has segments array after upload).
4. Closed project read-only view: toggle button still visible and functional (hints are display-only, don't affect read-only state).
</verification>

<success_criteria>
- Toggle button visible on both /canvas and /projects/:id canvases
- Default state is ON (hints visible without user action)
- Toggle correctly gates ownSegments, matchSegs, and seg-legend in both canvases
- seg-legend appears in ProjectCanvas for the first time (was missing)
- handleFragmentUploaded in ProjectDetailPage spreads segments + centroid from localData
- CSS: teal (#00bcd4) outline when ON, dim (#555) when OFF, no layout regression
</success_criteria>

<output>
After completion, create `.planning/quick/260501-djv-hints-toggle-button/260501-djv-SUMMARY.md`
with what was built, files changed, and any notable implementation choices.
</output>
