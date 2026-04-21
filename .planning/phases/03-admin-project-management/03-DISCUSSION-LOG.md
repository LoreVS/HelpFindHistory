# Phase 3: Admin — Project Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-admin-project-management
**Areas discussed:** Navigation structure, Fragment upload, Admin canvas & layout, Project list UI

---

## Navigation Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Role-split home | Admin lands on /projects, users land on / (canvas) | |
| Unified home + admin link | Everyone lands on /, admin navigates to /projects via header link | |
| Everyone lands on /projects | Canvas opens when entering a project or admin creating a project | ✓ |

**User's choice:** Everyone lands on `/projects` — the canvas is no longer the home screen. It opens when a user or admin enters a specific project.

---

## Navigation — Route Structure

| Option | Description | Selected |
|--------|-------------|----------|
| /projects + /projects/:id (flat) | Project list + detail with attempts list and canvas | ✓ |
| /projects + /projects/:id/canvas (split) | Separate canvas route from detail/attempts view | |
| Project list only, canvas is modal | Single page, canvas in overlay | |

**User's choice:** `/projects` and `/projects/:id`. The detail page shows fragment canvas + attempts list. Clicking an attempt opens a modal with canvas result; admin can approve/reject inside the modal. Approved attempt closes the project.

---

## Fragment Upload

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Dropzone, save to server | Existing Dropzone, POST to server, no background removal at upload | |
| Standard file picker, save to server | Plain file input, POST to server | |
| Dropzone with background removal | Existing Dropzone + background removal pipeline, then POST processed image | ✓ |

**User's choice:** Reuse existing Dropzone with background removal running in browser before upload.

---

## Admin Canvas

| Option | Description | Selected |
|--------|-------------|----------|
| Admin positions fragments (reuse FragmentCanvas) | Full drag/rotate/match, Save Layout button persists to server | ✓ |
| Fragments at default positions, no canvas interaction | Auto-layout only, admin just manages fragment list | |

**User's choice:** Admin can arrange fragments on canvas. Reuse existing `FragmentCanvas` component. Explicit "Save Layout" button.

---

## Save State

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Save button | Admin arranges then deliberately saves — clear and deliberate | ✓ |
| Auto-save on change | Layout saves automatically after each move/rotate | |

**User's choice:** Explicit "Save Layout" button.

---

## Project List UI

| Option | Description | Selected |
|--------|-------------|----------|
| Card grid | Name, description snippet, status badge, fragment count | ✓ |
| Table/list rows | Columns: name, status, fragment count, created date | |

**User's choice:** Card grid.

---

## Project List Actions

| Option | Description | Selected |
|--------|-------------|----------|
| Create + open only | "New Project" button + clickable cards | ✓ |
| Full CRUD on list | Inline delete/close on cards | |

**User's choice:** New Project button + clickable cards only. Close lives inside `/projects/:id`.

---

## Admin Canvas — Close Mechanic

| Option | Description | Selected |
|--------|-------------|----------|
| Close button on /projects/:id | Button inside project detail, sets status=closed | ✓ |
| Close from /projects list | Inline close on project cards | |

**User's choice:** "Close Project" button inside `/projects/:id`.

---

## Claude's Discretion

- New Project form design (modal vs inline expand)
- Project card CSS
- Fragment initial placement on first canvas load
- Confirmation dialog before closing a project

## Deferred Ideas

- Approve/reject attempt wiring — Phase 5
- User-facing browse view — Phase 4
- Edit project metadata after creation — v2 (PADM-01)
- Delete project — not in v1.1 scope
