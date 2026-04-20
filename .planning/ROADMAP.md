# Roadmap: Puzzle Forge v1.1 — Auth & Collaboration

**Milestone:** v1.1  
**Goal:** Transform Puzzle Forge into a multi-user platform where archaeologists manage fragment reconstruction projects and collaborators attempt to reconstruct objects, earning points for correct submissions.  
**Phase numbering:** 1–5 (fresh for this milestone; v1.0 treated as Phase 0)  
**Total requirements:** 23  
**Created:** 2026-04-20

---

## Phases

- [ ] **Phase 1: Backend Foundation** — Express server, SQLite schema, auth API endpoints (register/login/logout + JWT issuance)
- [ ] **Phase 2: Frontend Auth** — Login/signup screens, protected routes, JWT client-side storage, role-based UI gating
- [ ] **Phase 3: Admin — Project Management** — Admin creates projects, uploads fragments, saves project state, views and closes projects
- [ ] **Phase 4: Collaboration** — Users browse and open open projects, work on reconstruction canvas, save and publish attempts, view closed projects
- [ ] **Phase 5: Scoring** — Admin reviews/approves/rejects published attempts, points awarded to solvers, users see accumulated score

---

## Phase Details

### Phase 1: Backend Foundation
**Goal**: A working local API server that handles user registration, login, logout, and issues JWTs, backed by a SQLite database with the full schema.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, ROLE-01, ROLE-02
**Success Criteria** (what must be TRUE):
  1. Running `npm run server` (or equivalent) starts an Express server with no errors and responds to a health-check request
  2. A POST to `/api/auth/register` with valid email + password creates a new user row in SQLite and returns a JWT
  3. A POST to `/api/auth/login` with correct credentials returns a valid JWT; incorrect credentials return a 401
  4. A POST to `/api/auth/logout` invalidates the session server-side (or client token is cleared via response)
  5. The admin account exists in the database on first server run with role `admin`; all self-registered accounts receive role `user`
**Plans**: TBD

### Phase 2: Frontend Auth
**Goal**: The React app is fully locked behind authentication — unauthenticated visitors are redirected to a login screen, authenticated users stay logged in across reloads, and admin-only controls are hidden from regular users.
**Depends on**: Phase 1
**Requirements**: AUTH-04, AUTH-05, ROLE-03
**Success Criteria** (what must be TRUE):
  1. Visiting any protected route while logged out immediately redirects the user to the login screen
  2. A user who logs in and reloads the page remains logged in (JWT persisted in localStorage or equivalent)
  3. A regular user sees no admin-only UI controls (create project button, approval tools, etc.)
  4. A user can sign up via the registration screen and is automatically logged in with the `user` role
**Plans**: TBD
**UI hint**: yes

### Phase 3: Admin — Project Management
**Goal**: Authenticated admins can create reconstruction projects, upload fragment photos to them, save project state, and close projects once a correct attempt exists.
**Depends on**: Phase 2
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a new project by entering a name and description, and the project appears in the project list
  2. Admin can upload one or more fragment photos to a project and see them displayed on the project canvas
  3. Admin can save the current fragment layout/metadata and reload the project to find it unchanged
  4. Admin can view a list of all projects and drill into any project to see its published attempts
  5. Admin can close a project, after which it becomes read-only and its status updates visibly
**Plans**: TBD
**UI hint**: yes

### Phase 4: Collaboration
**Goal**: Regular users can browse open projects, open a project's reconstruction canvas, save an in-progress attempt, publish a completed attempt, and view the approved solution for closed projects.
**Depends on**: Phase 3
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04, COLLAB-05
**Success Criteria** (what must be TRUE):
  1. A logged-in user can see a list of all open projects and open any one of them
  2. A user who opens a project sees the fragment reconstruction canvas with all project fragments available to arrange
  3. A user can save their in-progress arrangement and return later to find it preserved
  4. A user can publish their completed arrangement as a formal attempt, making it visible to the admin
  5. A closed project is viewable in read-only mode showing the approved solution layout and the name of the solver
**Plans**: TBD
**UI hint**: yes

### Phase 5: Scoring
**Goal**: Admins can review, approve, or reject published attempts; approved attempts auto-close the project and award a point to the solver; users can see their total score.
**Depends on**: Phase 4
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05
**Success Criteria** (what must be TRUE):
  1. Admin can view all published attempts for a project in a review interface
  2. Admin can approve an attempt, which simultaneously closes the project and awards 1 point to the submitter
  3. Admin can reject a published attempt, returning it to a rejected state visible to the submitter
  4. A user whose attempt is approved sees their total score increment by 1 on their profile or score display
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Foundation | 0/? | Not started | - |
| 2. Frontend Auth | 0/? | Not started | - |
| 3. Admin — Project Management | 0/? | Not started | - |
| 4. Collaboration | 0/? | Not started | - |
| 5. Scoring | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 2 |
| AUTH-05 | Phase 2 |
| ROLE-01 | Phase 1 |
| ROLE-02 | Phase 1 |
| ROLE-03 | Phase 2 |
| PROJ-01 | Phase 3 |
| PROJ-02 | Phase 3 |
| PROJ-03 | Phase 3 |
| PROJ-04 | Phase 3 |
| PROJ-05 | Phase 3 |
| COLLAB-01 | Phase 4 |
| COLLAB-02 | Phase 4 |
| COLLAB-03 | Phase 4 |
| COLLAB-04 | Phase 4 |
| COLLAB-05 | Phase 4 |
| SCORE-01 | Phase 5 |
| SCORE-02 | Phase 5 |
| SCORE-03 | Phase 5 |
| SCORE-04 | Phase 5 |
| SCORE-05 | Phase 5 |

**Mapped: 23/23**

---

_Created: 2026-04-20_
