-- MedPobeda — initial schema
-- Relational content hierarchy + secure admin auth + audit + media.
-- Applied transactionally by scripts/migrate.mjs (SQLite dialect).

PRAGMA foreign_keys = ON;

-- Admin users & roles -------------------------------------------------------
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('super_admin', 'content_editor', 'reviewer')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  ip         TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit log ------------------------------------------------------------------
CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    INTEGER,
  entity_label TEXT,
  details      TEXT,
  ip           TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);

-- Media library ---------------------------------------------------------------
CREATE TABLE media (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_path      TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  safe_filename     TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        INTEGER NOT NULL,
  width             INTEGER,
  height            INTEGER,
  alt_text          TEXT NOT NULL DEFAULT '',
  uploaded_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_media_status ON media(status);-- Curricula ----------------------------------------------------------
CREATE TABLE curricula (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE curriculum_translations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  lang          TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  name          TEXT NOT NULL DEFAULT '',
  short_desc    TEXT NOT NULL DEFAULT '',
  long_desc     TEXT NOT NULL DEFAULT '',
  UNIQUE (curriculum_id, lang)
);

CREATE INDEX idx_cur_trans ON curriculum_translations(curriculum_id);

-- Subjects ----------------------------------------------------------------
CREATE TABLE subjects (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  icon_media_id  INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE subject_translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  name        TEXT NOT NULL DEFAULT '',
  short_desc  TEXT NOT NULL DEFAULT '',
  long_desc   TEXT NOT NULL DEFAULT '',
  UNIQUE (subject_id, lang)
);

CREATE INDEX idx_subj_trans ON subject_translations(subject_id);

-- Curriculum-subject many-to-many (future-proofed) -------------------------------
-- Optional fields are prepared for verified year/semester allocations later.
CREATE TABLE curriculum_subjects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  curriculum_id INTEGER NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  subject_id    INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  study_year    INTEGER,
  semester      INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required   INTEGER CHECK (is_required IN (0, 1)),
  UNIQUE (curriculum_id, subject_id)
);

CREATE INDEX idx_cur_subj_subject ON curriculum_subjects(subject_id);-- Modules --------------------------------------------------------------
CREATE TABLE modules (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id    INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE module_translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id   INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  UNIQUE (module_id, lang)
);

CREATE INDEX idx_mod_trans ON module_translations(module_id);

-- Topics ---------------------------------------------------------------
CREATE TABLE topics (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id     INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE topic_translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id    INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  lang        TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  UNIQUE (topic_id, lang)
);

CREATE INDEX idx_topic_trans ON topic_translations(topic_id);-- Questions -------------------------------------------------------------
CREATE TABLE questions (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id                 INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  qtype                    TEXT NOT NULL DEFAULT 'single_best' CHECK (qtype IN ('single_best')),
  difficulty               TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status                   TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  display_order            INTEGER NOT NULL DEFAULT 0,
  question_image_media_id  INTEGER REFERENCES media(id) ON DELETE SET NULL,
  explanation_image_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  reference                TEXT,
  question_id              TEXT UNIQUE,
  created_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),
  published_at             TEXT
);

CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_status ON questions(status);

CREATE TABLE question_translations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id         INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  lang                TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  question_text       TEXT NOT NULL DEFAULT '',
  explanation_blocks  TEXT NOT NULL DEFAULT '[]',
  note                TEXT NOT NULL DEFAULT '',
  question_image_alt  TEXT NOT NULL DEFAULT '',
  explanation_image_alt TEXT NOT NULL DEFAULT '',
  UNIQUE (question_id, lang)
);

CREATE INDEX idx_qtrans ON question_translations(question_id);

-- Question options --------------------------------------------------------------
CREATE TABLE question_options (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id   INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key    TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_correct    INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  UNIQUE (question_id, option_key),
  UNIQUE (question_id, display_order)
);

CREATE TABLE question_option_translations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  option_id  INTEGER NOT NULL REFERENCES question_options(id) ON DELETE CASCADE,
  lang       TEXT NOT NULL CHECK (lang IN ('uz', 'ru', 'en')),
  text       TEXT NOT NULL DEFAULT '',
  UNIQUE (option_id, lang)
);

CREATE INDEX idx_opts_q ON question_options(question_id);

-- schema_migrations bookkeeping -------------------------------------------------
CREATE TABLE IF NOT EXISTS question_bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON question_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_question ON question_bookmarks(question_id);

-- schema_migrations bookkeeping-------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT PRIMARY KEY,
  checksum   TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);