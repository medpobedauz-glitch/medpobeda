-- PDF staging is separate from the live question bank. Existing taxonomy is reused.
CREATE TABLE pdf_imports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 filename TEXT NOT NULL,
 storage_key TEXT NOT NULL UNIQUE,
 sha256 TEXT NOT NULL,
 subject_id INTEGER NOT NULL REFERENCES subjects(id),
 lang TEXT NOT NULL CHECK(lang IN ('uz','ru','en')),
 status TEXT NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded','processing','completed','needs_review','failed')),
 mode TEXT NOT NULL DEFAULT 'sample' CHECK(mode IN ('sample','full')),
 queued INTEGER NOT NULL DEFAULT 0,
 sample_approved INTEGER NOT NULL DEFAULT 0,
 start_page INTEGER NOT NULL DEFAULT 1,
 end_page INTEGER,
 page_count INTEGER NOT NULL DEFAULT 0,
 pages_processed INTEGER NOT NULL DEFAULT 0,
 questions_found INTEGER NOT NULL DEFAULT 0,
 images_found INTEGER NOT NULL DEFAULT 0,
 classification_running INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 created_by INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE pdf_import_questions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 import_id INTEGER NOT NULL REFERENCES pdf_imports(id) ON DELETE CASCADE,
 mode TEXT NOT NULL CHECK(mode IN ('sample','full')),
 extraction_key TEXT NOT NULL,
 source_number TEXT,
 subject_id INTEGER NOT NULL REFERENCES subjects(id),
 module_id INTEGER REFERENCES modules(id),
 topic_id INTEGER REFERENCES topics(id),
 data TEXT NOT NULL,
 extraction_status TEXT NOT NULL CHECK(extraction_status IN ('complete','needs_review','failed')),
 classification_status TEXT NOT NULL DEFAULT 'needs_review' CHECK(classification_status IN ('needs_review','suggested','approved')),
 confidence TEXT NOT NULL DEFAULT '{}',
 issues TEXT NOT NULL DEFAULT '[]',
 review_note TEXT NOT NULL DEFAULT '',
 reviewed_by INTEGER REFERENCES users(id),
 version INTEGER NOT NULL DEFAULT 1,
 imported_question_id INTEGER UNIQUE REFERENCES questions(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(import_id,mode,extraction_key)
);
CREATE INDEX pdf_staging_filters ON pdf_import_questions(import_id,mode,classification_status,extraction_status);
CREATE INDEX pdf_staging_taxonomy ON pdf_import_questions(subject_id,module_id,topic_id);
CREATE TABLE question_pdf_sources (
 question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 import_id INTEGER REFERENCES pdf_imports(id),
 staging_id INTEGER REFERENCES pdf_import_questions(id),
 source TEXT NOT NULL,
 fingerprint TEXT NOT NULL UNIQUE
);
CREATE TABLE question_media_links (
 question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 media_id INTEGER NOT NULL REFERENCES media(id),
 role TEXT NOT NULL CHECK(role IN ('question','explanation')),
 display_order INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(question_id,media_id,role)
);
CREATE TABLE pdf_import_media (
 import_id INTEGER NOT NULL REFERENCES pdf_imports(id) ON DELETE CASCADE,
 image_key TEXT NOT NULL,
 media_id INTEGER NOT NULL REFERENCES media(id),
 PRIMARY KEY(import_id,image_key)
);
