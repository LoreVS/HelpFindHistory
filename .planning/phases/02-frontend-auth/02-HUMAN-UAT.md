---
status: partial
phase: 02-frontend-auth
source: [02-VERIFICATION.md]
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Route guard redirect (SC-1 / AUTH-04)
expected: Open app while logged out (or clear localStorage), navigate to /. Browser immediately lands on /login before any canvas content renders.
result: [pending]

### 2. Session persistence across reload (SC-2 / AUTH-05)
expected: Log in successfully, reload page (F5 / Cmd+R). User remains on / still authenticated with same role. (CR-01 fix applied — base64url tokens now decode correctly.)
result: [pending]

### 3. Role visibility — regular user (SC-3 / ROLE-03)
expected: Log in as user-role account. Header shows logo, tagline, header-hint, END SESSION. No ADMIN badge in DOM.
result: [pending]

### 4. Role visibility — admin user (SC-3 / ROLE-03)
expected: Log in as admin account. ADMIN badge appears in header between tagline and header-hint.
result: [pending]

### 5. Auto-login after registration (SC-4)
expected: Register a new account at /register. After REGISTERING… loading state, lands on / without a separate login step.
result: [pending]

### 6. PublicOnlyRoute redirect while authenticated
expected: While logged in, navigate to /login or /register. Immediately redirected to /.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
