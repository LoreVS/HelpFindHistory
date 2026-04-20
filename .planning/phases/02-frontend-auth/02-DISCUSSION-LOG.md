# Phase 2: Frontend Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 02-frontend-auth
**Areas discussed:** Login/Register UI, Router + app structure, Role gating, Auth state

---

## Login/Register UI

| Option | Description | Selected |
|--------|-------------|----------|
| Single page, tabs | One /auth route with Login/Register tabs | |
| Two separate pages | /login and /register as distinct routes | ✓ |

**User's choice:** Two separate pages (/login and /register)
**Notes:** User selected the two-page layout with cross-linking ("Don't have an account?" links).

---

## UI Aesthetic

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing dark theme | Same dark background, monospace, muted palette | ✓ |
| Clean neutral form | Light/neutral login form | |
| Claude's discretion | — | |

**User's choice:** Match existing dark industrial theme

---

## Router + App Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated router file | src/router.jsx defines all routes | |
| Routes in App.jsx | Keep routing in App.jsx | ✓ |

**User's choice:** Routes in App.jsx (simpler, App grows with phases)

---

## Canvas Route

| Option | Description | Selected |
|--------|-------------|----------|
| / (root) | Authenticated users land on existing canvas | ✓ |
| /canvas or /app | Move canvas to a named sub-route | |

**User's choice:** Canvas stays at / (root)

---

## Role Gating (ROLE-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Admin header badge only | Visible Admin badge; hook + guard wired for Phase 3 | ✓ |
| useRole hook + guard only | Plumbing only, no visible indicator | |
| Placeholder admin panel link | Coming-soon nav link | |

**User's choice:** Admin header badge for admin users; useRole() hook built now

---

## Auth State Management

| Option | Description | Selected |
|--------|-------------|----------|
| New Zustand auth store | authStore with persist middleware | ✓ |
| React Context | AuthContext wrapping app | |
| Claude's discretion | — | |

**User's choice:** New Zustand auth store (consistent with existing Zustand usage)

---

## Claude's Discretion

- Exact auth form CSS styling (within dark theme constraint)
- Error message wording
- Loading state UI during API calls

## Deferred Ideas

- httpOnly cookie + refresh token flow (post-v1.1)
- "Remember me" checkbox
- Password visibility toggle
