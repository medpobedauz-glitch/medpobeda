// MedPobeda — subject/module/topic/curriculum relationship + count helpers.
import { db } from '../db/index.js';

export function getSubjectCurricula(subjectId) {
  return db.prepare(`
    SELECT c.id, c.slug, c.status, c.display_order, cs.study_year, cs.semester, cs.is_required
    FROM curriculum_subjects cs
    JOIN curricula c ON c.id = cs.curriculum_id
    WHERE cs.subject_id = ?
    ORDER BY c.display_order ASC, c.id ASC
  `).all(subjectId);
}

export function getCurriculumSubjects(curriculumId) {
  return db.prepare(`
    SELECT s.id, s.slug, s.status, s.display_order, cs.study_year, cs.semester, cs.is_required
    FROM curriculum_subjects cs
    JOIN subjects s ON s.id = cs.subject_id
    WHERE cs.curriculum_id = ?
    ORDER BY cs.display_order ASC, s.id ASC
  `).all(curriculumId);
}

export function getUnassignedSubjects(curriculumId) {
  return db.prepare(`
    SELECT s.id, s.slug, s.status, s.display_order
    FROM subjects s
    WHERE s.id NOT IN (SELECT subject_id FROM curriculum_subjects WHERE curriculum_id = ?)
    ORDER BY s.display_order ASC, s.id ASC
  `).all(curriculumId);
}

export function countChild(kind, parentId) {
  if (kind === 'subject') {
    // Subjects attach to a curriculum through the curriculum_subjects join table
    // (the subjects table itself has no parent column).
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM curriculum_subjects WHERE curriculum_id = ?')
      .get(parentId);
    return row?.n ?? 0;
  }
  const table = { module: 'modules', topic: 'topics', question: 'questions' }[kind];
  const col = { module: 'subject_id', topic: 'module_id', question: 'topic_id' }[kind];
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${col} = ?`).get(parentId);
  return row?.n ?? 0;
}

export function subjectHasModules(subjectId) {
  return countChild('module', subjectId) > 0;
}

export function moduleHasTopics(moduleId) {
  return countChild('topic', moduleId) > 0;
}

export function topicHasQuestions(topicId) {
  return countChild('question', topicId) > 0;
}

export function countPublishedQuestionsForTopic(topicId, lang = null) {
  if (lang) {
    const row = db.prepare(`
      SELECT COUNT(*) AS n FROM questions q
      JOIN question_translations qt ON qt.question_id = q.id
      WHERE q.topic_id = ? AND q.status = 'published' AND qt.lang = ? AND qt.question_text <> ''
    `).get(topicId, lang);
    return row?.n ?? 0;
  }
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM questions q
    WHERE q.topic_id = ? AND q.status = 'published'
  `).get(topicId);
  return row?.n ?? 0;
}

export function countPublishedQuestionsForModule(moduleId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM questions q
    JOIN topics t ON t.id = q.topic_id
    WHERE t.module_id = ? AND q.status = 'published'
  `).get(moduleId);
  return row?.n ?? 0;
}

export function countPublishedQuestionsForSubject(subjectId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM questions q
    JOIN topics t ON t.id = q.topic_id
    JOIN modules m ON m.id = t.module_id
    WHERE m.subject_id = ? AND q.status = 'published'
  `).get(subjectId);
  return row?.n ?? 0;
}

export function countPublishedQuestionsForCurriculum(curriculumId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n FROM questions q
    JOIN topics tp ON tp.id = q.topic_id
    JOIN modules m ON m.id = tp.module_id
    JOIN curriculum_subjects cs ON cs.subject_id = m.subject_id
    WHERE cs.curriculum_id = ? AND q.status = 'published'
  `).get(curriculumId);
  return row?.n ?? 0;
}