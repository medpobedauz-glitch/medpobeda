// Supports both original databases and installations with fields in 001 already.
export function up(db) {
  const columns = new Set(db.pragma('table_info(questions)').map(c => c.name));
  for (const [name, type] of Object.entries({question_id: 'TEXT', explanation_image_media_id: 'INTEGER REFERENCES media(id) ON DELETE SET NULL', reference: 'TEXT'})) {
    if (!columns.has(name)) db.exec(`ALTER TABLE questions ADD COLUMN ${name} ${type}`);
  }
  db.exec(`CREATE TABLE question_number_sequence (id INTEGER PRIMARY KEY CHECK(id=1), value INTEGER NOT NULL);
    INSERT INTO question_number_sequence VALUES (1, 0);`);
  const existing = db.prepare("SELECT question_id FROM questions WHERE question_id IS NOT NULL AND question_id <> ''").all();
  let max = 0;
  for (const q of existing) {
    if (!/^MP007[0-9]{4,}$/.test(q.question_id)) throw new Error('Existing question ID requires review before migration.');
    max = Math.max(max, Number(q.question_id.slice(5)));
  }
  for (const q of db.prepare("SELECT id FROM questions WHERE question_id IS NULL OR question_id = '' ORDER BY id").all()) {
    db.prepare('UPDATE questions SET question_id = ? WHERE id = ?').run('MP007' + String(++max).padStart(4, '0'), q.id);
  }
  db.prepare('UPDATE question_number_sequence SET value = ?').run(max);
  db.exec(`CREATE UNIQUE INDEX questions_public_id_unique ON questions(question_id COLLATE NOCASE);
    CREATE TRIGGER question_id_auto AFTER INSERT ON questions WHEN NEW.question_id IS NULL BEGIN
      UPDATE question_number_sequence SET value = value + 1 WHERE id = 1;
      UPDATE questions SET question_id = 'MP007' || printf('%04d', (SELECT value FROM question_number_sequence WHERE id = 1)) WHERE id = NEW.id;
    END;
    CREATE TRIGGER question_id_insert_guard BEFORE INSERT ON questions WHEN NEW.question_id IS NOT NULL BEGIN
      SELECT RAISE(ABORT, 'Question ID is assigned automatically');
    END;
    CREATE TRIGGER question_id_permanent BEFORE UPDATE OF question_id ON questions WHEN OLD.question_id IS NOT NULL AND NEW.question_id IS NOT OLD.question_id BEGIN
      SELECT RAISE(ABORT, 'Question ID is permanent');
    END;
    CREATE TABLE student_question_bookmarks (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY(student_id, question_id)
    );
    CREATE INDEX student_bookmarks_question ON student_question_bookmarks(question_id);`);
}
