---
phase: 01-backend-foundation
reviewed: 2026-04-20T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - server/package.json
  - server/index.js
  - server/db.js
  - server/schema.sql
  - server/seed.js
  - server/.env.example
  - server/.gitignore
  - package.json
  - server/routes/auth.js
  - server/middleware/auth.js
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This is a well-structured Express + better-sqlite3 backend with JWT auth, a token denylist, bcrypt password hashing, and role-based access control. The overall architecture is sound and the startup guard for `JWT_SECRET` is a good practice.

Two critical issues were found: a user-enumeration timing side-channel that contradicts the comment claiming constant-time comparison, and a hardcoded admin password fallback that creates a known-credential risk if the operator never sets `ADMIN_PASSWORD`. Four warnings cover a fragile schema-application pattern, a missing database uniqueness constraint, module-level initialization of the JWT secret key without a null guard in the middleware/auth module, and a hardcoded CORS origin. Three info-level items round out the review.

---

## Critical Issues

### CR-01: Login endpoint has a timing side-channel for user enumeration

**File:** `server/routes/auth.js:75-78`

**Issue:** The comment on line 75 states the code uses "constant-time comparison to prevent user-enumeration timing attacks," but the implementation does not achieve this. When no user row is found, `bcrypt.compare` is never called and the response returns almost immediately (~0 ms). When a user exists but the password is wrong, `bcrypt.compare` runs for ~100 ms. An attacker can reliably distinguish "email not registered" from "wrong password" by measuring response time.

**Fix:** Always run `bcrypt.compare` against a dummy hash when the user is not found, so both code paths take approximately the same time. Precompute the dummy hash once at module level (outside the route handler):

```js
// At module initialisation — run once:
const DUMMY_HASH = bcrypt.hashSync('__dummy__', SALT_ROUNDS);

// Inside the login handler, replace the current comparison block:
const candidateHash = user ? user.password : DUMMY_HASH;
const passwordMatch = await bcrypt.compare(
  typeof password === 'string' ? password : '',
  candidateHash
);
if (!user || !passwordMatch) {
  return res.status(401).json({ error: 'Invalid email or password.' });
}
```

---

### CR-02: Hardcoded admin password fallback creates a known-credential risk

**File:** `server/seed.js:7`

**Issue:** `ADMIN_PASSWORD` falls back to the literal string `'ChangeMe123!'` if the environment variable is not set. This password is now in version control and publicly known. Any deployment where the operator forgets to set `ADMIN_PASSWORD` in `.env` before the first run will silently create an admin account with a publicly documented password.

**Fix:** Remove the fallback entirely and fail loudly when the variable is absent, mirroring the `JWT_SECRET` guard already present in `index.js`:

```js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (existing) {
    console.log('[seed] Admin account already exists — skipping.');
    return;
  }

  if (!ADMIN_PASSWORD) {
    console.error('[seed] FATAL: ADMIN_PASSWORD is not set. Set it in server/.env before first run.');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);
  db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(ADMIN_EMAIL, hash, 'admin');
  console.log('[seed] Admin account created: ' + ADMIN_EMAIL);
}
```

Also update `.env.example` to replace `ChangeMe123!` with a placeholder like `<set-a-strong-password-here>` so the example file never contains a usable password.

---

## Warnings

### WR-01: JWT_SECRET encoded at module load time — produces silent weak key if env var is absent

**File:** `server/middleware/auth.js:6` and `server/routes/auth.js:12`

**Issue:** Both modules run `new TextEncoder().encode(process.env.JWT_SECRET)` at the top level when the module is first `require`d. If `JWT_SECRET` is undefined at that moment (e.g., during isolated unit tests, or if the module is imported before `dotenv` has run), `TextEncoder` silently encodes the string `"undefined"` and produces a deterministic, publicly predictable cryptographic key. No error is thrown; the server would start and issue tokens signed with a known key.

The startup guard in `index.js` (lines 6-9) protects the normal launch path but does not protect module-level initialisation in all contexts.

**Fix:** Add an explicit guard at the top of each module, mirroring the `index.js` pattern:

```js
if (!process.env.JWT_SECRET) {
  throw new Error('[auth] JWT_SECRET must be set before this module is loaded.');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
```

---

### WR-02: Schema applied by splitting on semicolons — fragile and will misparse future SQL

**File:** `server/db.js:21-23`

**Issue:** The schema is applied by splitting `schema.sql` on `';'` and calling `db.prepare(fragment).run()` on each piece. This works for the current schema but is latent breakage: any future SQL containing a semicolon inside a string literal, a trigger body, or a `BEGIN … END` block will be split at the wrong boundary, producing silent truncation or a runtime error.

Additionally, the PRAGMA lines in `schema.sql` are silently dropped by the filter (`!s.startsWith('PRAGMA')`) rather than being applied through that path. Their effect comes only from the two explicit `db.prepare('PRAGMA …').run()` calls above; if that code is reorganised the PRAGMAs in the file would be silently skipped.

**Fix:** Use `better-sqlite3`'s `db.exec(sql)` method, which accepts a full multi-statement SQL string and handles it correctly without manual splitting. Apply the PRAGMAs via `db.pragma()` (the idiomatic better-sqlite3 API) and pass the remaining DDL to `db.exec`:

```js
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
// Strip PRAGMA lines already applied above, then execute all DDL atomically:
const ddl = schema.replace(/^\s*PRAGMA[^;]+;\s*/gim, '').trim();
db.exec(ddl);   // better-sqlite3 db.exec — NOT Node child_process exec
```

This replaces the current split-and-loop block in its entirety.

---

### WR-03: scores table allows duplicate point awards for the same attempt

**File:** `server/schema.sql:43-50`

**Issue:** The `scores` table has no UNIQUE constraint on `(user_id, attempt_id)`. Nothing at the database level prevents a user being awarded points multiple times for the same attempt, which would silently inflate scores.

**Fix:** Add a UNIQUE constraint to the table definition:

```sql
CREATE TABLE IF NOT EXISTS scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  attempt_id   INTEGER NOT NULL REFERENCES attempts(id),
  project_id   INTEGER NOT NULL REFERENCES projects(id),
  points       INTEGER NOT NULL DEFAULT 1,
  awarded_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, attempt_id)
);
```

Because the table is created with `IF NOT EXISTS`, this constraint only applies to new databases. For existing databases a migration step is required: `CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique ON scores(user_id, attempt_id)`.

---

### WR-04: CORS origin is hardcoded — cannot be configured for non-local deployments

**File:** `server/index.js:25`

**Issue:** `cors({ origin: 'http://localhost:5173', credentials: true })` uses a literal string. Any deployment environment other than a local Vite dev server (staging, CI, production) will have all cross-origin requests blocked, and there is no mechanism to change this without editing source code.

**Fix:** Read the allowed origin from an environment variable with the dev-server URL as fallback:

```js
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
```

Add `CORS_ORIGIN=` to `.env.example`.

---

## Info

### IN-01: Email validation only checks for presence of '@' — accepts structurally invalid addresses

**File:** `server/routes/auth.js:33`

**Issue:** `!email.includes('@')` accepts values like `"a@"`, `"@b"`, and `"@@"`. These pass validation and get stored in the database but will likely cause failures downstream (e.g., password-reset emails that cannot be delivered).

**Fix:** Use a minimal but structurally correct regex check:

```js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
  return res.status(400).json({ error: 'A valid email is required.' });
}
```

---

### IN-02: seed.js uses bcrypt.hashSync inconsistently with async usage elsewhere

**File:** `server/seed.js:16`

**Issue:** `bcrypt.hashSync` is used here while all other bcrypt calls in the codebase (`routes/auth.js` lines 46, 76) use the async `bcrypt.hash` / `bcrypt.compare` forms. In a server-startup context this is not harmful, but it blocks the event loop for ~100 ms at startup and is inconsistent.

**Fix:** Make `seedAdmin` async and use `await bcrypt.hash(...)`:

```js
async function seedAdmin() {
  // ...
  const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
  // ...
}
```

Update the call site in `index.js` to `await seedAdmin()` (wrapping in an async IIFE if needed).

---

### IN-03: Tokens without a jti claim are not revocable via logout

**File:** `server/routes/auth.js:111` and `server/middleware/auth.js:30`

**Issue:** Both the logout handler and the denylist check are wrapped in `if (jti)` guards. A JWT that arrives without a `jti` claim bypasses the denylist entirely, making logout a no-op for such tokens. Since `signToken` always sets a JTI this is not currently exploitable, but it is a silent degradation if a token from another issuer is accepted, or if a future code path accidentally omits `.setJti(...)`.

**Fix:** Treat absence of `jti` as an invalid token in the auth middleware:

```js
// In middleware/auth.js, after successful jwtVerify:
if (!payload.jti) {
  return res.status(401).json({ error: 'Invalid token: missing jti claim.' });
}
// Denylist check can then be unconditional (no `if (payload.jti)` wrapper needed)
const denied = db.prepare('SELECT jti FROM token_denylist WHERE jti = ?').get(payload.jti);
```

---

_Reviewed: 2026-04-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
