-- MedPobeda — 003: make sessions.user_id nullable for anonymous (pre-login) sessions.
-- express-session creates a session row before req.session.user is populated.
-- SQLite can't ALTER COLUMN, so rebuild the table (sessions are ephemeral).
DROP TABLE IF EXISTS sessions_new;
CREATE TABLE sessions_new (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO sessions_new (id, user_id, csrf_token, ip, user_agent, expires_at, data, created_at)
  SELECT id, user_id, csrf_token, ip, user_agent, expires_at, data, created_at
  FROM sessions;
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);