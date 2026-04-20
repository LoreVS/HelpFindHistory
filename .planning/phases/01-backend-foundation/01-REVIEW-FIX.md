---
phase: 01-backend-foundation
fixed_at: 2026-04-20T00:00:00Z
review_path: .planning/phases/01-backend-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-20T00:00:00Z
**Source review:** .planning/phases/01-backend-foundation/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Login endpoint has a timing side-channel for user enumeration

**Files modified:** `server/routes/auth.js`
**Commit:** a2b7cfd
**Applied fix:** Added a module-level `DUMMY_HASH` (precomputed via `bcrypt.hashSync`). Replaced the conditional `bcrypt.compare` with an unconditional call using `candidateHash = user ? user.password : DUMMY_HASH`, ensuring both the "user not found" and "wrong password" code paths take approximately the same time, preventing timing-based user enumeration.

---

### CR-02: Hardcoded admin password fallback creates a known-credential risk

**Files modified:** `server/seed.js`, `server/.env.example`
**Commit:** 532596c
**Applied fix:** Removed the `|| 'ChangeMe123!'` fallback from `ADMIN_PASSWORD`. Added a guard inside `seedAdmin()` that calls `process.exit(1)` with a clear error message when `ADMIN_PASSWORD` is not set, matching the pattern already used by `JWT_SECRET` in `index.js`. Updated `.env.example` to replace `ChangeMe123!` with `<set-a-strong-password-here>`.

---

### WR-01: JWT_SECRET encoded at module load time — produces silent weak key if env var is absent

**Files modified:** `server/middleware/auth.js`, `server/routes/auth.js`
**Commit:** 9b65ed0
**Applied fix:** Added `if (!process.env.JWT_SECRET) { throw new Error(...) }` immediately before `new TextEncoder().encode(process.env.JWT_SECRET)` in both modules, so loading either module without the env var set throws immediately rather than silently producing a predictable key encoding the string `"undefined"`.

---

### WR-02: Schema applied by splitting on semicolons — fragile and will misparse future SQL

**Files modified:** `server/db.js`
**Commit:** c647d15
**Applied fix:** Replaced the `schema.split(';')` loop with idiomatic better-sqlite3 API calls: `db.pragma('journal_mode = WAL')`, `db.pragma('foreign_keys = ON')`, and `db.exec(ddl)` where `ddl` is the schema string with PRAGMA lines stripped via regex. This handles multi-statement SQL (triggers, BEGIN...END blocks, semicolons in string literals) correctly without fragile manual splitting.

---

### WR-03: scores table allows duplicate point awards for the same attempt

**Files modified:** `server/schema.sql`
**Commit:** f34e337
**Applied fix:** Added `UNIQUE(user_id, attempt_id)` to the `scores` table definition. Also added `CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique ON scores(user_id, attempt_id)` to handle existing databases that were created before this constraint was introduced.

---

### WR-04: CORS origin is hardcoded — cannot be configured for non-local deployments

**Files modified:** `server/index.js`, `server/.env.example`
**Commit:** c4cfddb
**Applied fix:** Replaced the literal `'http://localhost:5173'` with `const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'` so the allowed origin is configurable via environment variable. Added `CORS_ORIGIN=` entry with explanatory comment to `.env.example`.

---

_Fixed: 2026-04-20T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
