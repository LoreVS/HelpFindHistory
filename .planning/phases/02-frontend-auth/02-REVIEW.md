---
phase: 02-frontend-auth
status: findings
files_reviewed: 9
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
depth: standard
reviewed: 2026-04-21
---

# Phase 2 — Frontend Auth Code Review

## Summary

All 9 files were reviewed against the phase plan (CONTEXT.md, 02-01-PLAN.md through 02-03-PLAN.md), UI-SPEC, and PATTERNS.md. The implementation faithfully follows all 13 decisions from CONTEXT.md and all four Interaction Contracts from the UI-SPEC. One critical correctness bug was found in the JWT decode path. Three warnings and three informational notes are recorded below.

---

## Findings

### CR-01 — JWT base64url decode bug in `authStore.init()`

**File:** `puzzle-fragments/src/store/authStore.js` line 26

**Severity:** Critical

**Description:**

`atob()` implements standard base64 (RFC 4648 §4). JWT uses base64url encoding (RFC 4648 §5), which substitutes `+` with `-` and `/` with `_`, and omits padding `=`. Any JWT whose payload base64url-encoded segment contains `-` or `_` characters will cause `atob()` to throw a `DOMException: Failed to execute 'atob'`. The catch clause treats this identically to a malformed token and clears the store, logging out the user with a perfectly valid, non-expired token.

In practice, the `sub` field is `String(user.id)` (numeric string from the server), `role` is `'admin'` or `'user'`, and `jti` is a UUID. A UUID contains only hex digits and hyphens, but the hyphens appear in the original UUID string, not in its base64 encoding. However, the base64url-encoded segment of the payload is determined by the raw byte output of JSON serialization, which is unpredictable across different user IDs, timestamps, and UUIDs. Real-world JWTs from the configured backend (jsonwebtoken library, which uses standard base64url) will include `-` or `_` characters in some fraction of tokens.

**Recommended fix:**

```js
// Replace the atob() call with a base64url-safe decode:
const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/') 
const payload = JSON.parse(atob(b64))
```

Or as a helper:

```js
function decodeJwtPayload(token) {
  const b64url = token.split('.')[1]
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(b64))
}
```

This fix is inside the existing try/catch, so malformed tokens still fall through to the clear-and-continue path. No other files are affected.

---

### WR-01 — `logout()` does not invalidate the token server-side

**File:** `puzzle-fragments/src/store/authStore.js` lines 15–17

**Severity:** Warning

**Description:**

The backend API contract (documented in `02-PATTERNS.md` and `server/routes/auth.js`) provides `POST /api/auth/logout` with an `Authorization: Bearer <token>` header, which adds the token's JTI to a server-side denylist. The current `logout()` implementation only clears client-side Zustand state and localStorage. It does not call the logout endpoint.

Consequence: after a user clicks END SESSION, their JWT remains valid server-side until its natural `exp` time. Any copy of the token (e.g., intercepted from localStorage, browser history, network log) can be used to authenticate API requests until expiry. For a local dev tool this is lower risk, but it contradicts the backend's explicit denylist mechanism and the END SESSION affordance misleads users into believing the session is terminated server-side.

**Recommended fix in `authStore.js`:**

```js
async logout() {
  const { token } = get()
  if (token) {
    // Best-effort — do not block or retry on failure
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  set({ token: null, user: null })
},
```

The fire-and-forget pattern ensures the user is redirected immediately, while still triggering server-side invalidation in the background.

---

### WR-02 — Inaccurate empty-field error message in `RegisterPage`

**File:** `puzzle-fragments/src/pages/RegisterPage.jsx` line 21

**Severity:** Warning

**Description:**

When the user submits the register form with an empty `confirmPassword` field, the validation check `(!email.trim() || !password || !confirmPassword)` triggers the error message `'email and password are required'`. This message is factually incorrect: it names only two of the three required fields and omits `confirmPassword`. A user who leaves only the confirm-password field blank will see an inaccurate error.

The UI-SPEC copywriting contract (`02-UI-SPEC.md`) specifies the error copy as `'email and password are required'`, but this appears to be a spec-level oversight specific to the register form where a third field exists.

**Recommended fix:**

```js
setError('all fields are required')
```

Or distinguish cases:

```js
if (!email.trim() || !password) {
  setError('email and password are required')
  return
}
if (!confirmPassword) {
  setError('please confirm your password')
  return
}
```

The LoginPage (`LoginPage.jsx` line 19) correctly uses the same message for its two-field form.

---

### WR-03 — `login()` accepts undefined/null token without validation

**File:** `puzzle-fragments/src/store/authStore.js` lines 11–13

**Severity:** Warning

**Description:**

`login(token, user)` calls `set({ token, user })` without validating that `token` is a non-empty string. If the backend returns a malformed success response (e.g., `data.token` is `undefined`, `null`, or an empty string due to a server bug or proxy truncation), Zustand persist will write the invalid value to localStorage. On the next page load, `init()` will attempt `undefined.split('.')` or `''.split('.')`, catch the exception, clear the store, and log the user out. While the catch clause prevents a crash, the user experiences a confusing silent logout on the next load.

Both `LoginPage.jsx` (line 36) and `RegisterPage.jsx` (line 42) call `login(data.token, data.user)` after checking `res.ok`, so the validation gap is only exercised if the backend returns HTTP 200/201 with a missing token field.

**Recommended fix:**

```js
login(token, user) {
  if (!token || typeof token !== 'string') return
  set({ token, user })
},
```

---

### IR-01 — Redundant `token` subscription in `CanvasApp`

**File:** `puzzle-fragments/src/App.jsx` line 13

**Severity:** Info

**Description:**

`CanvasApp` subscribes to `token` from the auth store solely to conditionally render the END SESSION button (`{token && <button ...>}`). Because `CanvasApp` is rendered exclusively inside `<ProtectedRoute>`, which itself renders `<Outlet />` only when `token` is truthy, the `token` value will always be truthy when `CanvasApp` is mounted. The conditional `{token && ...}` is logically unreachable for the falsy branch.

This causes an unnecessary Zustand subscription and re-render trigger on token changes within `CanvasApp`. The END SESSION button can simply be rendered unconditionally, or the condition can be replaced with a comment explaining the invariant.

**Recommendation:**

Remove the `token` subscription and render the button unconditionally:

```jsx
// token is always truthy here — ProtectedRoute guarantees it
const logout = useAuthStore((state) => state.logout)
```

```jsx
<button className="btn-end-session" onClick={handleEndSession} type="button">
  END SESSION
</button>
```

---

### IR-02 — `PublicOnlyRoute` uses `null` render during init, matching `ProtectedRoute`

**File:** `puzzle-fragments/src/components/ProtectedRoute.jsx` lines 23–29

**Severity:** Info

**Description:**

Both `ProtectedRoute` and `PublicOnlyRoute` return `null` while `!initialized`. This is correct and consistent. However, `null` renders produce a brief blank screen during app boot. For the current implementation where `init()` is called synchronously at module scope before `createRoot().render()`, `initialized` will be `true` by the time React processes the first render — so the `null` path is actually never reached in production. The guard is defensive code protecting against a hypothetical future where `init()` becomes asynchronous.

This is documented behavior (plan comment: "blank screen ~0ms") and acceptable per design. Noting it here so future contributors are aware that the `!initialized` branch is a safety net, not an active code path today.

No action required.

---

### IR-03 — `auth-storage` localStorage key not namespaced

**File:** `puzzle-fragments/src/store/authStore.js` line 38

**Severity:** Info

**Description:**

The Zustand persist key is `'auth-storage'`. This is a plain, unnamespaced key in `localStorage`. If the application is ever served alongside another app on the same origin (e.g., a future version of the tool deployed at a subpath), a collision on this key would share auth state between different app instances. The key is correctly specified in the plan (`02-01-PLAN.md`), so this is a plan-level design choice, not an implementation deviation.

For future resilience, consider namespacing: `'puzzle-forge:auth'`. No action required for Phase 2; flagged for awareness.

---

## Plan Alignment

| Decision | Status | Notes |
|----------|--------|-------|
| D-01 react-router-dom v7 | Compliant | Installed at `^7.14.1` |
| D-02 Canvas at `/`, redirect to `/login` | Compliant | ProtectedRoute + PublicOnlyRoute implemented |
| D-03 Separate login and register pages | Compliant | |
| D-04 ProtectedRoute redirects if no valid token | Compliant | |
| D-05 authStore shape with persist | Compliant | |
| D-06 JWT in localStorage, role decoded client-side | Compliant | |
| D-07 init() validates exp on boot | Compliant with caveat | See CR-01 (base64url bug) |
| D-08 Dark industrial aesthetic | Compliant | |
| D-09 Cross-links between login/register | Compliant | |
| D-10 Auto-login after register | Compliant | |
| D-11 Logout clears store + redirect | Partial | Client-side only — see WR-01 |
| D-12 Admin badge via useRole() | Compliant | |
| D-13 useRole() hook exported for Phase 3 | Compliant | |

## What Was Done Well

- The `initialized` flag design is clean: `partialize` correctly excludes it from persistence, and all three branches of `init()` (no token, valid token, expired/malformed token) set it to `true`, preventing indefinite null renders.
- `PublicOnlyRoute` is implemented as a named export from the same file as `ProtectedRoute`, which is clean and keeps related guards co-located.
- Error banner uses `role="alert"` on both auth pages — correct accessibility practice for dynamically injected error content.
- `handleChange()` clears the error on any field keystroke, matching the Interaction Contract exactly.
- `confirmPassword` is correctly excluded from the API request body (T-02-09 mitigated).
- The `noValidate` attribute on both forms prevents browser-native validation from conflicting with the custom error display.
- CSS auth styles are appended without modifying any existing rules, as specified.
- All copywriting matches the UI-SPEC copywriting contract exactly.
