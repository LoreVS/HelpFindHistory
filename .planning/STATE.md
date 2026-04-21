# State

## Current Position

Phase: 3 — Admin Project Management
Plan: —
Status: Ready to plan
Last activity: 2026-04-21 — Phase 2 complete (human verification approved, all 4 success criteria met)

## Progress Bar

[████      ] 40% — 2 of 5 phases complete

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

## Blockers

None.

---
_Last updated: 2026-04-21 — Phase 2 complete: 3/3 plans done, human verification approved. Ready for Phase 3 (Admin Project Management)._
