// MedPobeda — question publish validation rules (single-best MCQ).
import { db } from '../db/index.js';
import { sanitizeExplanationBlocks } from './explanations.js';
import { toBool } from './util.js';

export const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Validates a question payload against publish-time rules.
 * Returns { ok: true } or { ok: false, errors: string[] }.
 */
export function validateQuestionForPublish(payload) {
  const errors = [];
  const lang = payload.publish_lang || 'uz';

  const tr = payload.translations || {};
  const langTr = tr[lang] || {};
  if (!langTr.question_text || !String(langTr.question_text).trim()) {
    errors.push('Question text is missing for ' + lang.toUpperCase());
  }

  const options = Array.isArray(payload.options) ? payload.options : [];
  if (options.length < 2) {
    errors.push('At least two answer options are required.');
  }
  const correct = options.filter((o) => toBool(o.is_correct));
  if (correct.length === 0) {
    errors.push('Exactly one correct answer must be selected.');
  } else if (correct.length > 1 && payload.question_type !== 'multiple_correct') {
    errors.push('Only one correct answer is allowed for a single-best-answer question.');
  }
  for (const o of options) {
    if (!String(o.translations?.[lang] || '').trim()) {
      errors.push('Every option needs text in ' + lang.toUpperCase());
    }
  }

  let blocks;
  try {
    blocks = Array.isArray(langTr.explanation_blocks)
      ? sanitizeExplanationBlocks(langTr.explanation_blocks)
      : [];
  } catch {
    blocks = [];
  }
  if (!blocks.length && !payload.explanation_image_media_id && !String(langTr.explanation || '').trim()) {
    errors.push('Explanation is required for ' + lang.toUpperCase());
  }

  // Media reference checks (metadata must exist in the media table).
  const qImageId = Number(payload.question_image_media_id) || null;
  if (qImageId) {
    const exists = db.prepare('SELECT id FROM media WHERE id = ?').get(qImageId);
    if (!exists) errors.push('Question image reference is invalid.');
  }
  for (const b of blocks) {
    if (b.type === 'image' && b.mediaId) {
      const exists = db.prepare('SELECT id FROM media WHERE id = ?').get(b.mediaId);
      if (!exists) errors.push('Explanation image reference is invalid.');
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}