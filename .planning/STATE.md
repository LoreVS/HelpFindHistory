# State

## Current Position

Phase: 1 — Backend Foundation
Plan: —
Status: Roadmap created, ready to begin Phase 1
Last activity: 2026-04-20 — Roadmap created for v1.1

## Progress Bar

[          ] 0% — 0 of 5 phases complete

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
- SQLite schema covers: users, projects, fragments, attempts, scores
- New `/server` or `/api` directory for Express backend alongside existing React frontend

## Blockers

None.

---
_Last updated: 2026-04-20_
