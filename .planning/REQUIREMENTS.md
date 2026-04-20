# Requirements: Puzzle Forge

**Defined:** 2026-04-20
**Core Value:** Help archaeologists digitally organize fragment reconstruction projects and enable contributors to attempt object reassembly, with approval-based scoring.

## v1.1 Requirements

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can log out
- [ ] **AUTH-04**: Unauthenticated users are redirected to the login screen
- [ ] **AUTH-05**: Session persists across page reloads (JWT stored client-side)

### Roles

- [ ] **ROLE-01**: Admin account is seeded on first server run (email + password configurable via env)
- [ ] **ROLE-02**: New self-registered users receive the 'user' role automatically
- [ ] **ROLE-03**: Admin-only UI controls are hidden from regular users

### Projects

- [ ] **PROJ-01**: Admin can create a project with a name and description
- [ ] **PROJ-02**: Admin can upload fragment photos to a project
- [ ] **PROJ-03**: Admin can save project state (fragment layout/metadata)
- [ ] **PROJ-04**: Admin can view all projects and their published attempts
- [ ] **PROJ-05**: Admin can close a project after approving a correct attempt

### Collaboration

- [ ] **COLLAB-01**: User can browse all open projects
- [ ] **COLLAB-02**: User can open a project and work on the reconstruction canvas
- [ ] **COLLAB-03**: User can save their in-progress attempt
- [ ] **COLLAB-04**: User can publish a completed reconstruction attempt
- [ ] **COLLAB-05**: Closed projects are viewable in read-only mode (shows approved solution and solver)

### Scoring

- [ ] **SCORE-01**: Admin can review all published attempts for a project
- [ ] **SCORE-02**: Admin can approve a published attempt (auto-closes the project)
- [ ] **SCORE-03**: Admin can reject a published attempt
- [ ] **SCORE-04**: User whose attempt is approved receives 1 point
- [ ] **SCORE-05**: User can see their total accumulated score/points

## v2 Requirements

### Notifications

- **NOTF-01**: User receives notification when their attempt is approved or rejected
- **NOTF-02**: Admin receives notification when a new attempt is published

### Leaderboard

- **LEAD-01**: Users can view a ranked leaderboard by total points
- **LEAD-02**: Leaderboard shows top N contributors across all projects

### Project Admin Tools

- **PADM-01**: Admin can edit fragment metadata after project creation
- **PADM-02**: Admin can set project deadline/expiry

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth (Google/GitHub) | Email + password sufficient for v1.1 |
| Email notifications | No email service in local-only setup |
| Leaderboards | Deferred to v2 |
| Project categories/tags | Not needed for core workflow |
| Admin inviting users | Open self-registration chosen |
| Real-time collaboration | High complexity, out of scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| ROLE-01 | Phase 1 | Pending |
| ROLE-02 | Phase 1 | Pending |
| ROLE-03 | Phase 2 | Pending |
| PROJ-01 | Phase 3 | Pending |
| PROJ-02 | Phase 3 | Pending |
| PROJ-03 | Phase 3 | Pending |
| PROJ-04 | Phase 3 | Pending |
| PROJ-05 | Phase 3 | Pending |
| COLLAB-01 | Phase 4 | Pending |
| COLLAB-02 | Phase 4 | Pending |
| COLLAB-03 | Phase 4 | Pending |
| COLLAB-04 | Phase 4 | Pending |
| COLLAB-05 | Phase 4 | Pending |
| SCORE-01 | Phase 5 | Pending |
| SCORE-02 | Phase 5 | Pending |
| SCORE-03 | Phase 5 | Pending |
| SCORE-04 | Phase 5 | Pending |
| SCORE-05 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 — roadmap created, all requirements mapped*
