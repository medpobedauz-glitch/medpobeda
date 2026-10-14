-- MedPobeda — student progress tracking for practice sessions

CREATE TABLE progress (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  curriculum_slug TEXT NOT NULL DEFAULT '',
  subject_slug  TEXT NOT NULL DEFAULT '',
  topic_slug    TEXT NOT NULL DEFAULT '',
  correct       INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL DEFAULT 0,
  taken_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_progress_student ON progress(student_id);
CREATE INDEX idx_progress_subject ON progress(subject_slug);
