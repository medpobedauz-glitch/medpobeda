// MedPobeda — content service layer (core data access).
// Shared queries used by admin and public APIs.
import { db } from '../db/index.js';

export const LANGS = ['uz', 'ru', 'en'];
export const PUBLIC_STATUSES = ['published'];

// ---------------------------------------------------------------------------
// Translation getters
// ---------------------------------------------------------------------------
export function getTranslations(kind, id) {
  const table = {
    curriculum: 'curriculum_translations',
    subject: 'subject_translations',
    module: 'module_translations',
    topic: 'topic_translations',
  }[kind];
  if (!table) return {};
  const rows = db.prepare(`SELECT * FROM ${table} WHERE ${kind}_id = ?`).all(id);
  const out = {};
  for (const r of rows) out[r.lang] = r;
  return out;
}

// ---------------------------------------------------------------------------
// List helpers (flat rows with nested translations)
// ---------------------------------------------------------------------------
export function listCurricula({ status } = {}) {
  let sql = 'SELECT c.* FROM curricula c';
  const params = [];
  if (status) { sql += ' WHERE c.status = ?'; params.push(status); }
  sql += ' ORDER BY c.display_order ASC, c.id ASC';
  return db.prepare(sql).all(...params).map((c) => ({ ...c, translations: getTranslations('curriculum', c.id) }));
}

export function listSubjects({ status } = {}) {
  let sql = 'SELECT s.* FROM subjects s';
  const params = [];
  if (status) { sql += ' WHERE s.status = ?'; params.push(status); }
  sql += ' ORDER BY s.display_order ASC, s.id ASC';
  return db.prepare(sql).all(...params).map((s) => ({ ...s, translations: getTranslations('subject', s.id) }));
}

export function listModules({ subjectId, status } = {}) {
  let sql = 'SELECT m.* FROM modules m WHERE 1=1';
  const params = [];
  if (subjectId) { sql += ' AND m.subject_id = ?'; params.push(subjectId); }
  if (status) { sql += ' AND m.status = ?'; params.push(status); }
  sql += ' ORDER BY m.display_order ASC, m.id ASC';
  return db.prepare(sql).all(...params).map((m) => ({ ...m, translations: getTranslations('module', m.id) }));
}

export function listTopics({ moduleId, status } = {}) {
  let sql = 'SELECT t.* FROM topics t WHERE 1=1';
  const params = [];
  if (moduleId) { sql += ' AND t.module_id = ?'; params.push(moduleId); }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  sql += ' ORDER BY t.display_order ASC, t.id ASC';
  return db.prepare(sql).all(...params).map((t) => ({ ...t, translations: getTranslations('topic', t.id) }));
}

// ---------------------------------------------------------------------------
// Single-item getters
// ---------------------------------------------------------------------------
export function getById(kind, id) {
  const table = {
    curriculum: 'curricula', subject: 'subjects', module: 'modules',
    topic: 'topics', question: 'questions', media: 'media',
  }[kind];
  if (!table) return null;
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) || null;
}

export function getBySlug(kind, slug) {
  const table = {
    curriculum: 'curricula', subject: 'subjects', module: 'modules', topic: 'topics',
  }[kind];
  if (!table) return null;
  return db.prepare(`SELECT * FROM ${table} WHERE slug = ?`).get(slug) || null;
}

export function getCurriculumTree({ curriculumId, subjectId, moduleId, topicId } = {}) {
  return {
    curriculum: curriculumId ? getById('curriculum', curriculumId) : null,
    subject: subjectId ? getById('subject', subjectId) : null,
    module: moduleId ? getById('module', moduleId) : null,
    topic: topicId ? getById('topic', topicId) : null,
  };
}