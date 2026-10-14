-- One first response per learner and question content revision. Retries do not
-- inflate community percentages; changed question content gets its own cohort.
CREATE TABLE student_question_answers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 content_revision TEXT NOT NULL,
 selected_keys TEXT NOT NULL CHECK(json_valid(selected_keys)),
 is_correct INTEGER NOT NULL CHECK(is_correct IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(question_id,content_revision,student_id)
);
CREATE INDEX question_answer_counts ON student_question_answers(question_id,content_revision);
