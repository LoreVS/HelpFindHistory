# Phase 2: Frontend Auth - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Lock the entire React app behind authentication: add React Router v7, /login and /register pages, a Zustand auth store persisting JWT to localStorage, a ProtectedRoute guard, and an admin header badge. The existing canvas remains the authenticated home route (/).

No new app features — only auth infrastructure and role-visibility plumbing that Phase 3+ builds on.

</domain>

<decisions>
## Implementation Decisions

### Routing
- **D-01:** Add React Router v7 (`react-router-dom`). Routes defined directly in `App.jsx` (no dedicated router file).
- **D-02:** Existing canvas app lives at `/` (root). Unauthenticated users are redirected to `/login`.
- **D-03:** Two separate pages: `/login` (LoginPage) and `/register` (RegisterPage), not a single tabbed page.
- **D-04:** A `ProtectedRoute` wrapper component redirects to `/login` if no valid token in auth store.

### Auth State
- **D-05:** New Zustand store `authStore` with shape `{ user, token, login(), logout(), init() }`. Persists `token` + `user` to `localStorage` via Zustand persist middleware.
- **D-06:** JWT stored in `localStorage` (AUTH-05 satisfied). Token decoded client-side to extract `{ id, role }` — no extra API call needed on reload.
- **D-07:** On app boot, `init()` reads localStorage, validates token expiry (`exp` claim), rehydrates store. Expired token → cleared, user sent to `/login`.

### Login/Register UI
- **D-08:** Both pages match the existing dark industrial aesthetic — same dark background, monospace font, muted palette as the canvas app.
- **D-09:** `/login` has "Don't have an account? → Register" link. `/register` has "Already have an account? → Login" link.
- **D-10:** After successful register, user is automatically logged in and redirected to `/`.
- **D-11:** After logout, token cleared from store + localStorage, user redirected to `/login`.

### Role Gating (ROLE-03)
- **D-12:** Phase 2 satisfies ROLE-03 by showing a visible `Admin` badge in the app header for admin users. No admin controls exist yet — they come in Phase 3.
- **D-13:** A `useRole()` hook returns the current user's role from authStore. Phase 3+ uses this to conditionally render admin UI. The hook is built in Phase 2 even though it's only used for the badge now.

### Claude's Discretion
- Exact CSS/styling for auth forms — match the dark theme, keep it clean and functional.
- Error message wording for failed login/register.
- Loading state handling during API calls (spinner vs disabled button).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend API (Phase 1)
- `server/routes/auth.js` — POST /api/auth/register, /login, /logout — exact request/response shapes
- `server/middleware/auth.js` — requireAuth, requireRole — JWT format and denylist pattern
- `server/.env.example` — CORS_ORIGIN env var (default http://localhost:5173)

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-04, AUTH-05, ROLE-03 acceptance criteria
- `.planning/ROADMAP.md` — Phase 2 success criteria (all 4 must be TRUE)

### Existing Frontend
- `puzzle-fragments/src/App.jsx` — current app shell (no router, direct component render)
- `puzzle-fragments/src/main.jsx` — React 19 entry point
- `puzzle-fragments/package.json` — current deps (React 19, Zustand 5, react-konva, Vite 8 — no router yet)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `puzzle-fragments/src/App.jsx` — becomes the protected canvas route; keep its structure, just wrap in router
- `puzzle-fragments/src/store/` — Zustand store pattern already established; new `authStore` follows same pattern

### Established Patterns
- **Zustand 5** for state — use `create` + `persist` middleware for authStore
- **React 19 + Vite 8** — no special compat concerns for React Router v7
- **No CSS framework** — existing styles are plain CSS; auth forms should use the same approach

### Integration Points
- `main.jsx` — wrap app in `<RouterProvider>` (or `<BrowserRouter>`) here
- `App.jsx` — add `<Routes>` with ProtectedRoute wrapper and /login, /register routes
- Header in `App.jsx` — add admin badge conditionally using `useRole()`

</code_context>

<specifics>
## Specific Ideas

- The app tagline is in Ukrainian ("відновлення форми з уламків") — auth pages should carry this through or at minimum show the PUZZLE FORGE header for brand continuity.
- Existing header style: dark, monospace, industrial — auth form should feel like part of the same product.

</specifics>

<deferred>
## Deferred Ideas

- JWT in httpOnly cookie + refresh token flow — more secure but requires server changes; deferred post-v1.1
- "Remember me" checkbox — deferred, localStorage already persists by default
- Password visibility toggle — nice-to-have, Claude's discretion

</deferred>

---

*Phase: 02-frontend-auth*
*Context gathered: 2026-04-20*
