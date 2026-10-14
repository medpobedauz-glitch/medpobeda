// MedPobeda — question write service.
// Create, update, duplicate. Options + explanation blocks persist atomically.
import { recordQuestionHistory, attachSource } from './question-history.js';
import { db } from '../db/index.js';
import { LANGS } from './questions.js';
import { sanitizeExplanationBlocks } from './explanations.js';
import { OPTION_KEYS } from './question-validation.js';

export function nowIso() {
  return new Date().toISOString();
}

// ---- Create ---------------------------------------------------------------
export function createQuestion({ topicId, payload, user }) {
  const trx = db.transaction(() => {
    const orderRow = db.prepare(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM questions WHERE topic_id = ?'
    ).get(topicId);
    const displayOrder = Number.isInteger(payload.display_order)
      ? payload.display_order
      : (orderRow?.next ?? 0);
    const qid = db.prepare(`
      INSERT INTO questions (topic_id, qtype, difficulty, status, display_order,
                             question_image_media_id, explanation_image_media_id, reference, created_by, updated_by, published_at)
      VALUES (?, 'single_best', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      topicId, payload.difficulty || 'medium', payload.status || 'draft', displayOrder,
      Number(payload.question_image_media_id) || null, Number(payload.explanation_image_media_id) || null, String(payload.reference || '').trim(), user.id, user.id,
      payload.status === 'published' ? nowIso() : null
    ).lastInsertRowid;
    writeQuestionTranslations(qid, payload.translations || {});
    writeQuestionOptions(qid, payload.options || []);
    return qid;
  });
  return trx();
}

// ---- Update ---------------------------------------------------------------
export function updateQuestion({ questionId, payload, user }) {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!q) return null;
  const trx = db.transaction(() => {
    recordQuestionHistory(questionId,user.id,'edit');
    db.prepare("UPDATE question_cms SET workflow_status='review',reviewed_by=NULL WHERE question_id=? AND workflow_status='approved'").run(questionId);
    const now = nowIso();
    const nextStatus = payload.status || q.status;
    db.prepare(`
      UPDATE questions SET difficulty = ?, status = ?, display_order = ?,
        question_image_media_id = ?, explanation_image_media_id = ?, reference = ?, updated_by = ?, updated_at = ?,
        published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN ? ELSE published_at END
      WHERE id = ?
    `).run(
      payload.difficulty || q.difficulty, nextStatus,
      Number.isInteger(payload.display_order) ? payload.display_order : q.display_order,
      payload.question_image_media_id === undefined ? q.question_image_media_id : Number(payload.question_image_media_id) || null,
      payload.explanation_image_media_id === undefined ? q.explanation_image_media_id : Number(payload.explanation_image_media_id) || null,
      payload.reference === undefined ? q.reference : String(payload.reference || '').trim(),
      user.id, now, nextStatus, now, questionId
    );
    if(payload.reference!==undefined)attachSource(questionId,db.prepare('SELECT source_id FROM question_cms WHERE question_id=?').get(questionId)?.source_id,payload.reference);
    writeQuestionTranslations(questionId, payload.translations || {});
    if (payload.options !== undefined) writeQuestionOptions(questionId, payload.options);
    return db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  });
  return trx();
}

// ---- Duplicate ------------------------------------------------------------
export function duplicateQuestion({ questionId, user }) {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!q) return null;
  const trx = db.transaction(() => {
    const orderRow = db.prepare(
      'SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM questions WHERE topic_id = ?'
    ).get(q.topic_id);
    const newId = db.prepare(`
      INSERT INTO questions (topic_id, qtype, difficulty, status, display_order,
                             question_image_media_id, explanation_image_media_id, reference, created_by, updated_by)
      VALUES (?, 'single_best', ?, 'draft', ?, ?, ?, ?, ?, ?)
    `).run(
      q.topic_id, q.difficulty, orderRow?.next ?? 0,
      q.question_image_media_id, q.explanation_image_media_id, q.reference, user.id, user.id
    ).lastInsertRowid;
    copyTranslations(questionId, newId);
    copyOptions(questionId, newId);
    db.prepare('UPDATE question_cms SET source_id=(SELECT source_id FROM question_cms WHERE question_id=?),question_type=(SELECT question_type FROM question_cms WHERE question_id=?),tags=(SELECT tags FROM question_cms WHERE question_id=?) WHERE question_id=?').run(questionId,questionId,questionId,newId);
    db.prepare('INSERT INTO question_source_links(question_id,source_id,source_reference,metadata) SELECT ?,source_id,source_reference,metadata FROM question_source_links WHERE question_id=?').run(newId,questionId);
    db.prepare('INSERT INTO question_media_links SELECT ?,media_id,role,display_order FROM question_media_links WHERE question_id=?').run(newId,questionId);
    return newId;
  });
  return trx();
}

function copyTranslations(srcId, dstId) {
  const rows = db.prepare('SELECT * FROM question_translations WHERE question_id = ?').all(srcId);
  for (const tr of rows) {
    db.prepare(`
      INSERT INTO question_translations (question_id, lang, question_text, explanation_blocks, note, question_image_alt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dstId, tr.lang, tr.question_text, tr.explanation_blocks, tr.note, tr.question_image_alt);
  }
}

function copyOptions(srcId, dstId) {
  const opts = db.prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY display_order').all(srcId);
  for (const opt of opts) {
    const optId = db.prepare(`
      INSERT INTO question_options (question_id, option_key, display_order, is_correct)
      VALUES (?, ?, ?, ?)
    `).run(dstId, opt.option_key, opt.display_order, opt.is_correct).lastInsertRowid;
    const trs = db.prepare('SELECT * FROM question_option_translations WHERE option_id = ?').all(opt.id);
    for (const ot of trs) {
      db.prepare('INSERT INTO question_option_translations (option_id, lang, text) VALUES (?, ?, ?)')
        .run(optId, ot.lang, ot.text);
    }
  }
}
// ---- Atomic writers -------------------------------------------------------
export function writeQuestionTranslations(questionId, translations) {
  for (const lang of Object.keys(translations || {})) {
    const tr = translations[lang] || {};
    const blocks = sanitizeExplanationBlocks(tr.explanation_blocks || []);
    db.prepare(`
      INSERT INTO question_translations (question_id, lang, question_text, explanation_blocks, note, question_image_alt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(question_id, lang) DO UPDATE SET
        question_text = excluded.question_text,
        explanation_blocks = excluded.explanation_blocks,
        note = excluded.note,
        question_image_alt = excluded.question_image_alt
    `).run(
      questionId, lang, String(tr.question_text || '').trim(), JSON.stringify(blocks),
      String(tr.note || '').trim(), String(tr.question_image_alt || '').trim()
    );
  }
}

export function writeQuestionOptions(questionId, options) {
  const existing = db.prepare('SELECT id FROM question_options WHERE question_id = ?').all(questionId);
  for (const o of existing) db.prepare('DELETE FROM question_options WHERE id = ?').run(o.id);
  const list = Array.isArray(options) ? options : [];
  list.forEach((opt, idx) => {
    const key = opt.option_key || OPTION_KEYS[idx] || 'opt' + (idx + 1);
    const isCorrect = opt.is_correct ? 1 : 0;
    const optId = db.prepare(`
      INSERT INTO question_options (question_id, option_key, display_order, is_correct)
      VALUES (?, ?, ?, ?)
    `).run(questionId, key, Number.isInteger(opt.display_order) ? opt.display_order : idx, isCorrect).lastInsertRowid;
    const langOpts = opt.translations || {};
    for (const lang of LANGS) {
      const text = String(langOpts[lang] || '').trim();
      if (!text) continue;
      db.prepare('INSERT INTO question_option_translations (option_id, lang, text) VALUES (?, ?, ?)')
        .run(optId, lang, text);
    }
  });
}