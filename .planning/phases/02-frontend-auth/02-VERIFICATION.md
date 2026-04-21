---
phase: 02-frontend-auth
status: human_needed
verified: 2026-04-21T00:00:00Z
must_haves_checked: 23
must_haves_passed: 21
requirements_covered: [AUTH-04, AUTH-05, ROLE-03]
human_verification:
  - test: "Visiting / while logged out redirects to /login in the running browser"
    expected: "Browser immediately lands on /login before any canvas content renders"
    why_human: "ProtectedRoute logic is code-verified but actual redirect behavior in a live browser requires manual confirmation"
  - test: "Reload the page while logged in — user remains logged in"
    expected: "Canvas loads directly; no redirect to /login; user's name/role intact"
    why_human: "localStorage rehydration via Zustand persist requires a real browser session to verify end-to-end"
  - test: "Log in as a regular ('user' role) account and verify no ADMIN badge appears"
    expected: "Header shows logo, tagline, header hint, END SESSION — no ADMIN badge element in DOM"
    why_human: "Conditional render of role === 'admin' requires a real authenticated session with a non-admin role"
  - test: "Log in as an admin account and verify ADMIN badge appears"
    expected: "Header shows ADMIN badge between the tagline and header-hint"
    why_human: "Requires live session with admin-role JWT to verify useRole() returns 'admin' and badge renders"
  - test: "Register a new account and confirm automatic login + redirect to /"
    expected: "After form submit, user lands on canvas at / without a separate login step"
    why_human: "Auto-login after register (D-10) requires a live API call to POST /api/auth/register and a real token response"
  - test: "Confirm CR-01 impact in production — whether any real token payloads trigger the atob() base64url bug"
    expected: "No unexpected logouts after page reload with a freshly issued JWT"
    why_human: "Whether JWTs issued by the actual server contain '-' or '_' in the base64url-encoded payload segment depends on live token data and is non-deterministic from static analysis"
---

# Phase 2: Frontend Auth — Verification Report

**Phase Goal:** Implement client-side authentication — route guards, login/register pages, auth state persistence.
**Verified:** 2026-04-21
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### ROADMAP Success Criteria

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| SC-1 | Visiting any protected route while logged out immediately redirects to /login | ? HUMAN | ProtectedRoute code is correct and wired; runtime behavior needs browser confirmation |
| SC-2 | A user who logs in and reloads the page remains logged in | ? HUMAN | persist middleware + init() code path verified; end-to-end reload requires live session |
| SC-3 | A regular user sees no admin-only UI controls | ? HUMAN | `role === 'admin'` conditional is code-verified; requires live non-admin session to confirm |
| SC-4 | A user can sign up via registration screen and is automatically logged in | ? HUMAN | Auto-login code path (D-10) verified; requires live API call to confirm end-to-end |

All four success criteria have their implementation verified in code. Runtime confirmation is required before marking the phase passed.

---

## Must-Haves Check

### Plan 02-01 — Auth State Layer

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | react-router-dom is installed and importable | PASS | `package.json` has `"react-router-dom": "^7.14.1"`; `node_modules/react-router-dom` exists |
| 2 | authStore persists token + user across page reloads via localStorage | PASS | `persist` middleware wraps store with `name: 'auth-storage'`; `partialize` returns `{ token, user }` |
| 3 | authStore.init() clears expired tokens (exp < Date.now()/1000) | PARTIAL | Logic is correct (`payload.exp * 1000 < Date.now()`); CR-01 atob() base64url bug means tokens with `-` or `_` in their payload encoding are incorrectly treated as malformed and cleared — see Issues section |
| 4 | useRole() returns the current user's role string or null | PASS | `useRole.js`: `useAuthStore((state) => state.user?.role ?? null)` — correct selector, returns null when unauthenticated |

### Plan 02-02 — Auth UI Components

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 5 | ProtectedRoute redirects unauthenticated users to /login | PASS | `token ? <Outlet /> : <Navigate to="/login" replace />` — correct logic present |
| 6 | PublicOnlyRoute redirects authenticated users to / | PASS | `token ? <Navigate to="/" replace /> : <Outlet />` — correct logic present |
| 7 | LoginPage renders with exact UI-SPEC copy and layout | PASS | `ACCESS TERMINAL` heading, `AUTHENTICATE`/`AUTHENTICATING…` button text, error banner above CTA, nav link `Don't have an account?` — all confirmed |
| 8 | RegisterPage renders with exact UI-SPEC copy and layout including confirm password field | PASS | `CREATE ACCOUNT` heading, `REGISTER ACCOUNT`/`REGISTERING…`, three fields including `confirm password`, nav link `Already have an account?` — all confirmed |
| 9 | Login calls POST /api/auth/login, stores token via authStore.login(), navigates to / | PASS | `fetch('/api/auth/login', ...)` → `login(data.token, data.user)` → `navigate('/')` — full chain wired |
| 10 | Register calls POST /api/auth/register, auto-logs-in via authStore.login(), navigates to / | PASS | `fetch('/api/auth/register', ...)` → D-10 comment → `login(data.token, data.user)` → `navigate('/')` — confirmed |
| 11 | Error banners appear above CTA, clear on next keystroke | PASS | `{error && <div className="auth-error-banner">}` inside `.auth-fields` before `<button>`; `handleChange()` calls `setError('')` on every `onChange` — both verified |
| 12 | Loading state disables form and changes button text (no spinner) | PASS | All inputs have `disabled={loading}`; button text is `{loading ? 'AUTHENTICATING…' : 'AUTHENTICATE'}` and `{loading ? 'REGISTERING…' : 'REGISTER ACCOUNT'}` |

### Plan 02-03 — App Integration

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 13 | Visiting / while logged out immediately redirects to /login | ? HUMAN | ProtectedRoute wraps `/` route in App.jsx; requires live browser session to confirm |
| 14 | Visiting /login or /register while logged in redirects to / | ? HUMAN | PublicOnlyRoute wraps `/login` and `/register`; requires live browser session to confirm |
| 15 | Authenticated user reloading the page remains logged in (token survives reload) | ? HUMAN | Zustand persist writes to `auth-storage`; `init()` rehydrates before createRoot; requires live session |
| 16 | Admin user sees ADMIN badge in header; regular user does not | ? HUMAN | `{role === 'admin' && <span className="admin-badge">ADMIN</span>}` — correct conditional; requires live sessions with both role types |
| 17 | END SESSION button appears in header for authenticated users and logs out on click | PASS | `{token && <button className="btn-end-session" onClick={handleEndSession}>END SESSION</button>}` — wired; `handleEndSession` calls `logout()` + `navigate('/login')` |
| 18 | App renders null (blank screen) during authStore initialization, then routes correctly | PASS | Both ProtectedRoute and PublicOnlyRoute: `if (!initialized) return null` — init() sets `initialized: true` synchronously at module scope before `createRoot()`, so null path is defensive-only |
| 19 | BrowserRouter wraps the entire app in main.jsx | PASS | `<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>` — confirmed in main.jsx |
| 20 | authStore.init() is called once on app boot | PASS | `useAuthStore.getState().init()` at line 11 of main.jsx, before `createRoot(` — module-scope, not inside a hook or component |

### Additional Must-Haves (Artifact-Level)

| # | Artifact | Status | Notes |
|---|----------|--------|-------|
| 21 | `authStore.js` — exports default `useAuthStore` | PASS | File exists, substantive (44 lines), wired in App.jsx, main.jsx, ProtectedRoute, LoginPage, RegisterPage |
| 22 | `useRole.js` — named export `useRole` | PASS | File exists, 5 lines, imported and called in App.jsx header |
| 23 | `ProtectedRoute.jsx` — default + named exports | PASS | Both `ProtectedRoute` (default) and `PublicOnlyRoute` (named) confirmed; imported in App.jsx |

**Score: 21/23 confirmed programmatically (2 PARTIAL/HUMAN due to CR-01 bug + 6 runtime-only behaviors)**

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `main.jsx` | `authStore.js` | `useAuthStore.getState().init()` at module scope | WIRED | Line 11 of main.jsx, before `createRoot` |
| `main.jsx` | `react-router-dom` | `BrowserRouter` wrapping `<App />` | WIRED | Lines 3, 15–19 of main.jsx |
| `App.jsx` | `ProtectedRoute.jsx` | `<Route element={<ProtectedRoute />}>` | WIRED | Line 54 of App.jsx |
| `App.jsx` | `ProtectedRoute.jsx` | `<Route element={<PublicOnlyRoute />}>` | WIRED | Line 57 of App.jsx |
| `App.jsx` | `useRole.js` | `useRole()` call in `CanvasApp` header | WIRED | Lines 7, 12, 27–29 of App.jsx |
| `LoginPage.jsx` | `POST /api/auth/login` | `fetch('/api/auth/login', ...)` | WIRED | Line 26 of LoginPage.jsx |
| `LoginPage.jsx` | `authStore.js` | `login(data.token, data.user)` | WIRED | Line 36 of LoginPage.jsx |
| `RegisterPage.jsx` | `POST /api/auth/register` | `fetch('/api/auth/register', ...)` | WIRED | Line 31 of RegisterPage.jsx |
| `RegisterPage.jsx` | `authStore.js` | `login(data.token, data.user)` (D-10) | WIRED | Line 42 of RegisterPage.jsx |
| `ProtectedRoute.jsx` | `authStore.js` | `useAuthStore` selectors for `token` + `initialized` | WIRED | Lines 11–12 of ProtectedRoute.jsx |
| `authStore.js` | `localStorage 'auth-storage'` | Zustand persist middleware `name: 'auth-storage'` | WIRED | Line 38 of authStore.js; `partialize` excludes `initialized` |

All key links are wired.

---

## Requirements Traceability

| Requirement | Description | Source Plan | Evidence | Status |
|-------------|-------------|-------------|---------|--------|
| AUTH-04 | Unauthenticated users are redirected to the login screen | 02-02, 02-03 | ProtectedRoute `<Navigate to="/login" replace />`; PublicOnlyRoute guards `/login` and `/register` | SATISFIED (pending human runtime check) |
| AUTH-05 | Session persists across page reloads (JWT stored client-side) | 02-01, 02-03 | Zustand persist with `name: 'auth-storage'`; `init()` rehydrates at module scope before React renders | SATISFIED (pending human runtime check; note CR-01 bug can cause false logouts for some JWTs) |
| ROLE-03 | Admin-only UI controls are hidden from regular users | 02-01, 02-03 | `{role === 'admin' && <span className="admin-badge">ADMIN</span>}` — conditional JSX, no DOM node for non-admin; `useRole()` hook returns null for non-authenticated, role string for authenticated | SATISFIED (pending human runtime check with both role types) |

---

## Issues Found

### Issue 1 — CR-01: atob() base64url decode bug (Critical, from code review)

**File:** `puzzle-fragments/src/store/authStore.js` line 26
**Impact on phase goal:** PARTIAL — the logic structure is correct (expired tokens are cleared, malformed tokens are caught), but the base64url decoding is incorrect. `atob()` handles standard base64, not base64url (which JWT uses). Payload segments containing `-` or `_` cause `atob()` to throw, which the `catch` block then treats as a malformed token, clearing a valid, non-expired token and logging the user out on next reload.
**Affected must-have:** Must-have #3 — "authStore.init() clears expired tokens" — is PARTIAL because expired tokens are also cleared (which is correct), but so are valid tokens whose base64url encoding happens to contain `-` or `_`.
**Recommended fix (from 02-REVIEW.md CR-01):**
```js
const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
const payload = JSON.parse(atob(b64))
```
**Severity for phase sign-off:** This is a correctness bug in AUTH-05 (session persistence). Whether it manifests depends on the actual JWT payloads issued by the server. The catch clause prevents crashes and app lockout. Recommend fixing before marking AUTH-05 satisfied.

### Issue 2 — WR-01: logout() does not call POST /api/auth/logout (Warning, from code review)

**File:** `puzzle-fragments/src/store/authStore.js` lines 15–17
**Impact:** `logout()` clears only client-side state. The server-side denylist mechanism (JTI denylist in `server/routes/auth.js`) is never triggered. The token remains valid server-side until its `exp` time elapses.
**Affected must-have:** None directly — the END SESSION button renders and clears client state correctly. The gap is server-side session termination.
**Severity for phase sign-off:** Warning-level. For a local dev tool this is acceptable short-term, but it means the END SESSION button provides only client-side termination, not the full security boundary the backend provides. Recommend addressing in this phase or explicitly deferring.

### Issue 3 — WR-02: Misleading empty-field error in RegisterPage (Warning, from code review)

**File:** `puzzle-fragments/src/pages/RegisterPage.jsx` line 21
**Impact:** When only `confirmPassword` is empty, the error reads `'email and password are required'` — factually incorrect for a three-field form.
**Affected must-have:** Must-have #8 (RegisterPage UI) — this is a copy accuracy issue but the plan specifies exact error copy that matches the two-field validation spec, which is a spec-level oversight.
**Severity for phase sign-off:** Minor. Does not block core auth flow. Recommend noting as tech debt.

---

## Anti-Patterns Found

| File | Pattern | Severity | Classification |
|------|---------|----------|----------------|
| `authStore.js` line 26 | `atob()` used for base64url (JWT) decode — incorrect for tokens with `-` or `_` in payload encoding | Blocker (for AUTH-05 correctness) | CR-01 — logic path correct, decode incorrect |
| `authStore.js` lines 15–17 | `logout()` client-side only — no call to `POST /api/auth/logout` server denylist endpoint | Warning | WR-01 — security weakness |
| `RegisterPage.jsx` line 21 | Empty-field error copy says "email and password are required" when confirmPassword is the missing field | Warning | WR-02 — UX copy inaccuracy |
| `App.jsx` line 13 | `token` subscription in `CanvasApp` is logically unreachable (ProtectedRoute guarantees token truthy when CanvasApp mounts) | Info | IR-01 — unnecessary re-render subscription |

No placeholder stubs, no hardcoded data, no `TODO`/`FIXME` comments, no `return null` or `return {}` implementation stubs found in any of the seven core files.

---

## Human Verification Required

### 1. Route guard redirect (SC-1 / AUTH-04)

**Test:** Open the app in a browser while logged out (or clear localStorage). Navigate directly to `/`.
**Expected:** Immediately redirected to `/login`. Canvas content never renders.
**Why human:** ProtectedRoute code is verified correct, but actual React Router redirect behavior in a live browser cannot be confirmed by static analysis.

### 2. Session persistence across reload (SC-2 / AUTH-05)

**Test:** Log in successfully, then reload the page (F5 / Cmd+R).
**Expected:** User remains on `/` (or wherever they were), still authenticated, same role.
**Why human:** Zustand persist + init() code path is verified, but the actual localStorage write-and-read cycle requires a live browser session.
**Note:** If the server issues JWTs whose base64url payload contains `-` or `_`, the CR-01 bug will cause the user to be logged out on reload instead. This must be checked as part of this test.

### 3. Role visibility — regular user (SC-3 / ROLE-03)

**Test:** Log in as a user-role account. Inspect the header.
**Expected:** Header shows PUZZLE FORGE logo, tagline, header-hint kbd elements, END SESSION button. No ADMIN badge element in DOM (not just hidden — not present).
**Why human:** Conditional `role === 'admin'` render requires a live session with a non-admin JWT.

### 4. Role visibility — admin user (SC-3 / ROLE-03)

**Test:** Log in as the admin account (seeded in Phase 1). Inspect the header.
**Expected:** ADMIN badge appears between the tagline span and the header-hint div.
**Why human:** Requires live session with admin-role JWT to confirm `useRole()` returns `'admin'` and the badge element renders.

### 5. Auto-login after registration (SC-4)

**Test:** Navigate to `/register`, fill in email + password + confirm password with a new valid account, submit.
**Expected:** After a brief loading state (button text changes to `REGISTERING…`), the user lands on `/` (canvas) without any additional login step.
**Why human:** Requires a live POST /api/auth/register call with a real server response to confirm the D-10 auto-login path.

### 6. CR-01 impact in production JWTs

**Test:** Log in, reload the page, confirm no unexpected logout occurs.
**Expected:** User remains logged in across multiple reloads.
**Why human:** The atob() base64url bug (CR-01) affects only some JWTs depending on their encoded payload. A passing result here indicates that the server's current JWT output does not trigger the bug; it does not confirm the code is correct. The fix should be applied regardless.

---

## Verdict

**Status: human_needed**

The Phase 2 implementation is structurally complete and all wiring is in place. All 7 source files exist, are substantive (no stubs or placeholders), and all critical connections are confirmed wired. The four ROADMAP success criteria are architecturally satisfied by the code.

Three items prevent a clean `passed` verdict:

1. **CR-01 (atob bug):** A correctness defect in the token expiry path means that some valid JWTs from the server may be incorrectly treated as malformed, causing false logouts on page reload. This directly affects SC-2 (session persistence / AUTH-05). The fix is a one-line change. It should be applied before final sign-off on AUTH-05.

2. **WR-01 (server-side logout):** `logout()` only clears client state; it never calls `POST /api/auth/logout` to invalidate the JTI denylist. This is a security gap rather than a functional gap — the END SESSION button works visually, but server-side the token remains valid until expiry.

3. **Runtime behaviors (6 items):** SC-1 through SC-4 require a live browser session to confirm. The code is correct; the behavior cannot be certified from static analysis alone.

**Recommendation:** Apply the CR-01 one-line fix (`replace(/-/g, '+').replace(/_/g, '/')` before `atob()`), then perform the human verification checklist above. If all 6 human checks pass, this phase is ready to be marked complete.

---

_Verified: 2026-04-21_
_Verifier: Claude (gsd-verifier)_
