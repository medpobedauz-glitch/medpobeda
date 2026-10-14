// MedPobeda — media library service.
// Usage lookups, archive, and safe delete with dependency checks.
import { db } from '../db/index.js';
import { removeMediaFile } from './object-storage.js';

// Finds every place an image is referenced.
export function findMediaUsage(mediaId) {
  const usage = [];
  for (const student of db.prepare('SELECT id FROM students WHERE photo_media_id = ?').all(mediaId)) {
    usage.push({ type: 'profile_photo', id: student.id, label: 'Student profile photo' });
  }

  // As a subject icon.
  const subjects = db.prepare('SELECT id, slug FROM subjects WHERE icon_media_id = ?').all(mediaId);
  for (const s of subjects) usage.push({ type: 'subject', id: s.id, label: s.slug });

  // As a question image.
  const qImages = db.prepare('SELECT id FROM questions WHERE question_image_media_id = ?').all(mediaId);
  for (const q of qImages) usage.push({ type: 'question_image', id: q.id, label: 'Question #' + q.id });

  for (const q of db.prepare('SELECT id FROM questions WHERE explanation_image_media_id = ?').all(mediaId)) usage.push({ type: 'explanation_image', id: q.id, label: 'Question #' + q.id });

  // As explanation-image blocks (JSON scan).
  const exQ = db.prepare(`SELECT question_id, lang, explanation_blocks FROM question_translations`).all();
  for (const row of exQ) {
    let blocks = [];
    try { blocks = JSON.parse(row.explanation_blocks || '[]'); } catch { continue; }
    if (blocks.some((b) => b.type === 'image' && Number(b.mediaId) === mediaId)) {
      usage.push({
        type: 'explanation_image_' + row.lang,
        id: row.question_id,
        label: 'Explanation (question #' + row.question_id + ', ' + row.lang + ')',
      });
    }
  }
  for (const row of db.prepare('SELECT question_id FROM question_media_links WHERE media_id=?').all(mediaId)) usage.push({type:'question_image',id:row.question_id,label:'PDF question image'});
  for (const row of db.prepare('SELECT import_id FROM pdf_import_media WHERE media_id=?').all(mediaId)) usage.push({type:'pdf_import',id:row.import_id,label:'PDF import image'});
  return usage;
}

export function isMediaReferenced(mediaId) {
  return findMediaUsage(mediaId).length > 0;
}

export function listMedia({ status } = {}) {
  let sql = 'SELECT * FROM media';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY id DESC';
  return db.prepare(sql).all(...params).map((m) => ({ ...m, usage: findMediaUsage(m.id) }));
}

export function getMedia(id) {
  return db.prepare('SELECT * FROM media WHERE id = ?').get(id) || null;
}

export function archiveMedia(id) {
  const m = getMedia(id);
  if (!m) return null;
  if (isMediaReferenced(id)) {
    return { error: 'This image is in use and cannot be archived.' };
  }
  db.prepare("UPDATE media SET status = 'archived' WHERE id = ?").run(id);
  return getMedia(id);
}

export async function deleteMedia(id) {
  const m = getMedia(id);
  if (!m) return null;
  if (isMediaReferenced(id)) {
    return { error: 'This image is referenced by content and cannot be deleted. Archive it instead.' };
  }
  // Remove the file if it exists, then the row.
  await removeMediaFile(m);
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
  return { deleted: true };
}
