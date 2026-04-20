PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password   TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  score      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id),
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  closed_at   TEXT
);

CREATE TABLE IF NOT EXISTS fragments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename     TEXT    NOT NULL,
  storage_path TEXT    NOT NULL,
  metadata     TEXT    NOT NULL DEFAULT '{}',
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  layout       TEXT    NOT NULL DEFAULT '{}',
  status       TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'approved', 'rejected')),
  submitted_at TEXT,
  reviewed_at  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS scores (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  attempt_id   INTEGER NOT NULL REFERENCES attempts(id),
  project_id   INTEGER NOT NULL REFERENCES projects(id),
  points       INTEGER NOT NULL DEFAULT 1,
  awarded_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, attempt_id)
);

-- For existing databases where the table was created without the UNIQUE constraint:
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique ON scores(user_id, attempt_id);

CREATE TABLE IF NOT EXISTS token_denylist (
  jti        TEXT    NOT NULL PRIMARY KEY,
  expires_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_attempts_project   ON attempts(project_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user      ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_token_denylist_exp ON token_denylist(expires_at);
