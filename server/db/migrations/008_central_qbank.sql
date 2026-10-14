-- One repository: editorial metadata extends existing question records.
CREATE TABLE question_types (key TEXT PRIMARY KEY, name TEXT NOT NULL);
INSERT INTO question_types VALUES
 ('single_best','Single Best Answer MCQ'),('multiple_correct','Multiple Correct Answers'),
 ('true_false','True/False'),('clinical_vignette','Clinical Vignette'),('image_based','Image-based Question');
CREATE TABLE content_sources (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
 type TEXT NOT NULL CHECK(type IN ('book','platform','own','faculty','other')),
 author TEXT NOT NULL DEFAULT '', publication TEXT NOT NULL DEFAULT '', edition_year TEXT NOT NULL DEFAULT '',
 reference_info TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX source_names ON content_sources(name);
CREATE TABLE question_cms (
 question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 question_type TEXT NOT NULL DEFAULT 'single_best' REFERENCES question_types(key),
 workflow_status TEXT NOT NULL DEFAULT 'draft' CHECK(workflow_status IN ('draft','review','selected','approved','published','rejected')),
 source_id INTEGER REFERENCES content_sources(id), tags TEXT NOT NULL DEFAULT '[]',
 reviewed_by INTEGER REFERENCES users(id), version INTEGER NOT NULL DEFAULT 1,
 merged_into INTEGER REFERENCES questions(id)
);
INSERT INTO question_cms(question_id,workflow_status) SELECT id,CASE WHEN status='archived' THEN 'rejected' ELSE status END FROM questions;
CREATE INDEX cms_status ON question_cms(workflow_status);
CREATE INDEX cms_source ON question_cms(source_id);
CREATE TABLE question_source_links (
 id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 source_id INTEGER REFERENCES content_sources(id), source_reference TEXT NOT NULL DEFAULT '',
 metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX source_links_question ON question_source_links(question_id);
CREATE TABLE question_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT, question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, snapshot TEXT NOT NULL, changed_by INTEGER REFERENCES users(id),
 reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX history_question ON question_history(question_id,version);
CREATE TABLE question_duplicate_decisions (
 question_id INTEGER NOT NULL REFERENCES questions(id), other_id INTEGER NOT NULL REFERENCES questions(id),
 decision TEXT NOT NULL CHECK(decision IN ('keep','merge','reject')), decided_by INTEGER REFERENCES users(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(question_id,other_id)
);
CREATE TABLE csv_import_previews (
 token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), data TEXT NOT NULL,
 expires_at TEXT NOT NULL, consumed INTEGER NOT NULL DEFAULT 0, result TEXT
);
CREATE TRIGGER cms_question_create AFTER INSERT ON questions BEGIN
 INSERT INTO question_cms(question_id,workflow_status) VALUES(NEW.id,CASE WHEN NEW.status='archived' THEN 'rejected' ELSE NEW.status END);
END;
CREATE TRIGGER cms_legacy_status AFTER UPDATE OF status ON questions WHEN OLD.status<>NEW.status BEGIN
 UPDATE question_cms SET workflow_status=CASE WHEN NEW.status='archived' THEN 'rejected' ELSE NEW.status END WHERE question_id=NEW.id;
END;
-- Retain references already attached by the PDF importer and older editor.
INSERT INTO content_sources(name,type,publication) SELECT DISTINCT j.filename,'book',j.filename FROM question_pdf_sources p JOIN pdf_imports j ON j.id=p.import_id;
UPDATE question_cms SET source_id=(SELECT s.id FROM question_pdf_sources p JOIN pdf_imports j ON j.id=p.import_id JOIN content_sources s ON s.name=j.filename WHERE p.question_id=question_cms.question_id LIMIT 1);
INSERT INTO question_source_links(question_id,source_id,source_reference,metadata)
 SELECT q.id,c.source_id,COALESCE(q.reference,''),COALESCE(p.source,'{}') FROM questions q JOIN question_cms c ON c.question_id=q.id LEFT JOIN question_pdf_sources p ON p.question_id=q.id WHERE COALESCE(q.reference,'')<>'' OR p.source IS NOT NULL;
