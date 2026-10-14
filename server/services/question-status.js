// MedPobeda — question workflow status transitions (server-side enforced).
import { recordQuestionHistory } from './question-history.js';
import { db } from '../db/index.js';
import { getQuestionFull } from './questions.js';
import { validateQuestionForPublish } from './question-validation.js';
import { nowIso } from './question-write.js';

// Adapts a full question row + payload into a publish-validation payload.
function toPublishPayload(q, payload) {
  if (payload && (payload.translations || payload.options)) {
    return {
      translations: payload.translations,
      options: payload.options,
      question_image_media_id: payload.question_image_media_id,
      publish_lang: payload.publish_lang,
    };
  }
  // Validate against latest persisted state.
  const full = getQuestionFull(q.id);
  return {
    question_type: db.prepare('SELECT question_type FROM question_cms WHERE question_id=?').get(q.id)?.question_type,
    publish_lang: payload?.publish_lang,
    translations: full.translations,
    options: full.options,
    question_image_media_id: full.question_image_media_id,
    explanation_image_media_id: full.explanation_image_media_id,
  };
}

/**
 * Transition a question's workflow status.
 * actions: publish | unpublish | submit_review | archive | draft
 */
export function changeQuestionStatus({ questionId, action, payload, user }) {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(questionId);
  if (!q) return { ok: false, error: 'Question not found.' };

  const fromStatus = q.status;
  let toStatus = null;

  if (action === 'publish') {
    const p = toPublishPayload(q, payload);
    const check = validateQuestionForPublish(p);
    if (!check.ok) return { ok: false, errors: check.errors };
    toStatus = 'published';
  } else if (action === 'unpublish') {
    if (fromStatus !== 'published') return { ok: false, error: 'Only published questions can be unpublished.' };
    toStatus = 'draft';
  } else if (action === 'submit_review') {
    if (fromStatus === 'archived') return { ok: false, error: 'Archived questions cannot be submitted for review.' };
    toStatus = 'review';
  } else if (action === 'archive') {
    if (fromStatus === 'archived') return { ok: false, error: 'Question is already archived.' };
    toStatus = 'archived';
  } else if (action === 'draft') {
    toStatus = 'draft';
  } else {
    return { ok: false, error: 'Unknown action.' };
  }

  const trx = db.transaction(() => {
    recordQuestionHistory(questionId,user.id,action);
    db.prepare(`
      UPDATE questions SET
        status = ?,
        updated_by = ?,
        updated_at = ?,
        published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, datetime('now')) ELSE published_at END
      WHERE id = ?
    `).run(toStatus, user.id, nowIso(), toStatus, questionId);
    return toStatus;
  });

  return { ok: true, status: trx() };
}

export function archiveQuestion({ questionId, user }) {
  return changeQuestionStatus({ questionId, action: 'archive', payload: null, user });
}