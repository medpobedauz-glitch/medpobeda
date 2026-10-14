-- MedPobeda — student (public user) accounts + student sessions.
-- Students are separate from admin `users`; sessions carry a nullable student_id.

CREATE TABLE students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name      TEXT NOT NULL,
  contact        TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- email or phone, normalized
  contact_type   TEXT NOT NULL CHECK (contact_type IN ('email', 'phone')),
  password_hash  TEXT NOT NULL,
  preferred_lang TEXT NOT NULL DEFAULT 'uz' CHECK (preferred_lang IN ('uz', 'ru', 'en')),
  curriculum_id  INTEGER REFERENCES curricula(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_students_contact ON students(contact);

ALTER TABLE sessions ADD COLUMN student_id INTEGER NULL REFERENCES students(id) ON DELETE CASCADE;
CREATE INDEX idx_sessions_student ON sessions(student_id);