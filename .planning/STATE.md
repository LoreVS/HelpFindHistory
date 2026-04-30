# State

## Current Position

Phase: 5 — Scoring
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-04-30 — Phase 5 Plan 2 complete (frontend stores: setScore, approveAttempt, rejectAttempt, fetchUserScore, reward in createProject)

## Progress Bar

[████████░░] 80% — 4 of 5 phases complete

## Accumulated Context

- Project is client-only (no backend yet) — v1.1 introduces local Node/Express + SQLite backend
- No auth system exists — v1.1 adds email + password auth with JWT
- Roles: admin (archaeologist) vs user (contributor)
- `edgeAnalysis.js` utilities are built but not wired to UI
- Fragment canvas reuse: existing drag/rotate/match canvas is the reconstruction surface for user attempts
- Phase 1 depends on: nothing (first phase)
- Phase 2 depends on: Phase 1 (backend must issue JWTs before frontend can store them)
- Phase 3 depends on: Phase 2 (protected routes must exist before admin UI is built)
- Phase 4 depends on: Phase 3 (projects must exist before users can collaborate)
- Phase 5 depends on: Phase 4 (attempts must exist before scoring can work)

## Decisions

- owner_id set server-side from req.user.id on project creation — prevents IDOR ownership hijacking (T-03-04)
- multer diskStorage scoped to server/data/uploads/{projectId}/ with 20MB file size limit
- db.transaction wraps layout PATCH for atomic batch fragment metadata updates
- Fragment UPDATE uses WHERE id = ? AND project_id = ? to prevent cross-project tampering
- Fresh phase numbering starting at 1 for milestone v1.1 (v1.0 treated as Phase 0 / pre-milestone)
- AUTH-05 (JWT client-side persistence) assigned to Phase 2 — client concern, depends on Phase 1 backend issuing tokens
- SQLite schema covers: users, projects, fragments, attempts, scores, token_denylist (6 tables)
- New `/server` directory created for Express backend alongside existing React frontend
- better-sqlite3 (synchronous) chosen as SQLite driver over async sqlite3
- CORS origin pinned to http://localhost:5173 (Vite dev origin), not wildcard
- JWT_SECRET guard: server exits with code 1 at startup if not set
- SALT_ROUNDS=12 for bcrypt (secure default, acceptable latency on local hardware)
- role='user' hardcoded in register INSERT — no API parameter accepted (elevation-of-privilege mitigation)
- Constant-time bcrypt.compare used even on unknown email to prevent timing-based user enumeration
- requireRole factory pattern allows RBAC composition with requireAuth in later phases
- persist middleware partializes to token+user only — initialized flag always starts false on boot (never persisted)
- atob(token.split('.')[1]) for JWT decode in init() — no external library needed, exp*1000 vs Date.now()
- try/catch in authStore.init() clears malformed tokens silently (T-02-01 threat mitigation)
- useRole uses named export consistent with useBackgroundRemoval hook pattern
- ProtectedRoute renders null while !initialized — prevents auth flash at app boot
- PublicOnlyRoute prevents authenticated users from revisiting /login or /register
- confirmPassword field value never sent to server (T-02-09 mitigation)
- pages/ directory created as new convention for full-page route components
- CanvasApp extracted as inner component in App.jsx so router hooks work inside router context
- init() called at module scope in main.jsx before createRoot — initialized=true before any route guard renders
- Admin badge uses conditional JSX (role==='admin'), not CSS — no DOM node for non-admin users
- END SESSION calls logout() + navigate('/login') — immediate redirect, no confirmation dialog
- authHeaders() reads token via useAuthStore.getState().token on every request — ensures fresh token (T-03-09 mitigation)
- No persist middleware on useProjectStore — project state is session-scoped, re-fetched from API on load
- / redirects to /projects via Navigate replace — no history pollution (D-01)
- /canvas kept for backwards compatibility alongside new /projects routes (D-03)
- New Project button visibility gated by role === 'admin' — no DOM node for non-admin users (T-03-10 Spoofing mitigation)
- Inline toggle form (showForm state) for New Project rather than modal or separate route
- Description truncated at 120 chars in card grid for uniform card height
- .card-status--open (green) and .card-status--closed (muted) for visually distinct project status badges
- ProjectCanvas defined inline in ProjectDetailPage (not modifying FragmentCanvas.jsx) — backwards compat for /canvas route (D-03)
- Local canvasFragments state initialized from server data; explicit Save Layout is only write path (D-16)
- Blob URL fetched via fetch() inside ProjectDropzone before upload — useBackgroundRemoval returns blob URL not raw blob
- isClosed disables ProjectDropzone and Save Layout button — closed projects fully read-only in UI (D-09, T-03-14)
- AttemptRow modal stubs Approve/Reject with console.log — wired in Phase 5 (D-08)
- reward defaults to 1 in schema DDL and migration guard — consistent behavior on fresh vs existing DBs
- db.prepare().run() used for ALTER TABLE migration (not db.exec) — consistent with better-sqlite3 API
- doApprove transaction re-fetches attempt and project inside transaction — avoids TOCTOU race
- GET /api/users/me placed in attempts.js router (requireAuth already at router level) — no new router file needed
- toCanvasFragment stores dbId (numeric) + id (string) to disambiguate Konva IDs from DB IDs
- setScore merges score into user via spread — avoids full user object replacement in authStore
- fetchUserScore uses try/catch with console.error (not throw) — score sync is best-effort, not load-blocking
- reward = 1 default in createProject signature — backward-compatible with existing callers that omit reward

## Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-n51 | Fix canvas aspect ratio and prevent duplicate publish | 2026-04-28 | 69e070d | [260428-n51-fix-canvas-aspect-ratio-and-prevent-duplicate-publish](.planning/quick/260428-n51-fix-canvas-aspect-ratio-and-prevent-duplicate-publish/) |
| 260429-27u | Post-publish redirect and My Finished Projects section | 2026-04-28 | 5b08495 | [260429-27u-post-publish-redirect-and-my-finished-projects-section](.planning/quick/260429-27u-post-publish-redirect-and-my-finished-projects-section/) |
| 260429-2ey | Clear data script and filter submitted projects from main list | 2026-04-29 | ebc160f | [260429-2ey-clear-data-script-and-filter-submitted-projects](.planning/quick/260429-2ey-clear-data-script-and-filter-submitted-projects/) |

---
_Last updated: 2026-04-30 — Completed Phase 5 Plan 2: frontend store scoring actions (setScore, approveAttempt, rejectAttempt, fetchUserScore, reward in createProject)_
