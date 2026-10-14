// MedPobeda — question read/write service.
// Includes publish validation rules, per-language completeness, duplication,
// and archive. Options and explanation blocks are persisted atomically.
import { db } from '../db/index.js';
import { sanitizeExplanationBlocks } from './explanations.js';
import { toBool } from './util.js';

export const LANGS = ['uz', 'ru', 'en'];

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export function getQuestion(id) {
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) || null;
}

export function getQuestionTranslations(questionId) {
  const rows = db.prepare('SELECT * FROM question_translations WHERE question_id = ?').all(questionId);
  const out = {};
  for (const r of rows) {
    let blocks = [];
    try { blocks = JSON.parse(r.explanation_blocks || '[]'); } catch { blocks = []; }
    out[r.lang] = { ...r, explanation_blocks: blocks };
  }
  return out;
}

export function getQuestionOptions(questionId) {
  const rows = db.prepare(`
    SELECT o.id, o.option_key, o.display_order, o.is_correct
    FROM question_options o
    WHERE o.question_id = ?
    ORDER BY o.display_order ASC, o.id ASC
  `).all(questionId);
  const langRows = db.prepare(`
    SELECT ot.option_id, ot.lang, ot.text
    FROM question_option_translations ot
    JOIN question_options o ON o.id = ot.option_id
    WHERE o.question_id = ?
  `).all(questionId);
  const byOpt = {};
  for (const lr of langRows) {
    byOpt[lr.option_id] = byOpt[lr.option_id] || {};
    byOpt[lr.option_id][lr.lang] = lr.text;
  }
  return rows.map((o) => ({ ...o, translations: byOpt[o.id] || {} }));
}

export function getQuestionFull(id) {
  const q = getQuestion(id);
  if (!q) return null;
  return {
    ...q,
    translations: getQuestionTranslations(id),
    options: getQuestionOptions(id),
    pdf_source: (()=>{const source=db.prepare('SELECT import_id,source FROM question_pdf_sources WHERE question_id=?').get(id);return source?{import_id:source.import_id,...JSON.parse(source.source)}:null;})(),
    additional_images: db.prepare('SELECT media_id,role FROM question_media_links WHERE question_id=? ORDER BY display_order').all(id),
  };
}

// Filters helper for question lists (used by admin).
// groupBy: one of 'curriculum' | 'subject' | 'module' | 'topic'
export function listQuestions({ groupBy, groupId, difficulty, status, questionId, limit, offset } = {}) {
  let sql = `SELECT q.*, (SELECT question_text FROM question_translations WHERE question_id = q.id ORDER BY lang LIMIT 1) AS question_text FROM questions q WHERE 1=1`;
  const params = [];
  if (questionId) { sql += ' AND q.question_id = ? COLLATE NOCASE'; params.push(String(questionId).trim()); }
  if (status) { sql += ' AND q.status = ?'; params.push(status); }
  if (difficulty) { sql += ' AND q.difficulty = ?'; params.push(difficulty); }

  if (groupBy === 'topic' && groupId) { sql += ' AND q.topic_id = ?'; params.push(groupId); }
  if (groupBy === 'module' && groupId) {
    sql += ' AND q.topic_id IN (SELECT id FROM topics WHERE module_id = ?)'; params.push(groupId);
  }
  if (groupBy === 'subject' && groupId) {
    sql += ' AND q.topic_id IN (SELECT t.id FROM topics t JOIN modules m ON m.id = t.module_id WHERE m.subject_id = ?)'; params.push(groupId);
  }
  if (groupBy === 'curriculum' && groupId) {
    sql += ` AND q.topic_id IN (
      SELECT t.id FROM topics t
      JOIN modules m ON m.id = t.module_id
      JOIN curriculum_subjects cs ON cs.subject_id = m.subject_id
      WHERE cs.curriculum_id = ?
    )`; params.push(groupId);
  }

  sql += ' ORDER BY q.display_order ASC, q.id ASC';
  if (limit) { sql += ' LIMIT ?'; params.push(limit); }
  if (offset) { sql += ' OFFSET ?'; params.push(offset); }
  return db.prepare(sql).all(...params);
}

// Translation completeness for one question.
export function getQuestionCompleteness(q) {
  const tr = getQuestionTranslations(q.id);
  const opts = getQuestionOptions(q.id);
  const langs = LANGS.map((lang) => {
    const hasText = Boolean(tr[lang] && tr[lang].question_text.trim());
    const hasOptions = opts.every((o) => Boolean(o.translations[lang] && o.translations[lang].trim()));
    const hasExplanation = Boolean(tr[lang] && ((tr[lang].explanation_blocks || []).length || q.explanation_image_media_id));
    return {
      lang,
      complete: hasText && hasOptions && hasExplanation,
      missing: {
        text: !hasText,
        options: !hasOptions,
        explanation: !hasExplanation,
      },
    };
  });
  const completeLangs = langs.filter((l) => l.complete).map((l) => l.lang);
  return { langs, completeLangs, missingCount: langs.filter((l) => !l.complete).length };
}