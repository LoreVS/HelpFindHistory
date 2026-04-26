# Phase 4: Collaboration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 04-collaboration
**Areas discussed:** User project view, Project list for users, Save & publish flow, Closed project view

---

## User Project View

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, role-based UI | Reuse /projects/:id — admin sees upload dropzone + Save Layout + Close Project; user sees full-width canvas + Save Attempt + Publish Attempt. One page, conditional rendering via useRole(). | ✓ |
| Separate user route | Add /projects/:id/attempt (or /work/:id) for user reconstruction. /projects/:id stays admin-only. Cleaner separation, but doubles the route + page component logic. | |

**User's choice:** Same page, role-based UI
**Notes:** User selected the mockup preview showing admin view with sidebar and user view with full-width canvas + two buttons.

---

## Project List for Users

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, open projects only | Users see open projects only. Admins see all. Backend filters by role. | ✓ |
| Same page, all projects | Both admin and users see all projects (open + closed). | |

**User's choice:** Same page, open projects only
**Notes:** Selected the preview showing users only see open projects while admin sees all.

---

## Save & Publish Flow

### Draft limit

| Option | Description | Selected |
|--------|-------------|----------|
| One draft max | One draft per user per project. Opening loads existing draft or admin's layout. Saving overwrites same row. | ✓ |
| Multiple drafts | Each save creates a new row; needs "current draft" concept. | |

**User's choice:** One draft max

### Publish mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Two buttons: Save + Publish | Separate Save Attempt and Publish Attempt buttons. Save = persist draft; Publish = mark published and lock. | ✓ |
| One button: Submit | Single Submit button that saves and publishes in one action. | |

**User's choice:** Two buttons: Save + Publish

### Draft creation timing

| Option | Description | Selected |
|--------|-------------|----------|
| On first Save | Draft row created only on first Save Attempt click. | ✓ |
| On project open | Draft created immediately when user opens project. | |

**User's choice:** On first Save

---

## Closed Project View

### Read-only display

| Option | Description | Selected |
|--------|-------------|----------|
| Same /projects/:id, read-only | Closed project in same route but non-interactive canvas showing approved solution. Shows solver name. | ✓ |
| Separate /projects/:id/solution | Dedicated solution route. Cleaner but adds routing complexity. | |

**User's choice:** Same /projects/:id, read-only
**Notes:** Selected mockup showing closed project with read-only canvas and "Solved by: user@email.com" below.

### Canvas source for closed project

| Option | Description | Selected |
|--------|-------------|----------|
| Approved attempt's layout | Load fragment positions from approved attempt's layout JSON. Shows the actual winning reconstruction. | ✓ |
| Admin's saved layout | Show the admin's reference layout from fragments.metadata. Simpler but doesn't show the winning solution. | |

**User's choice:** Approved attempt's layout

---

## Claude's Discretion

- Confirmation dialog before publishing
- Exact button wording ("Save Attempt" / "Publish Attempt")
- Loading state feedback for save/publish actions
- CSS styling for user attempt section
- "Solved by" placement in closed project layout
- Backend upsert implementation detail (INSERT OR REPLACE vs SELECT + conditional)

## Deferred Ideas

- Multiple attempts per user per project history
- Real-time updates / notifications
- Score display (Phase 5)
- Admin approval/rejection UI wiring (Phase 5)
