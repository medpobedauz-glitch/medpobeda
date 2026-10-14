// MedPobeda — admin data routes: dashboard + curricula + subjects + modules + topics.
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit } from '../middleware/auth.js';
import { slugify } from '../services/util.js';
import * as content from '../services/content.js';
import * as hier from '../services/hierarchy.js';
import { getDashboard } from '../services/dashboard.js';

const router = Router();

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', requireRole('read'), (req, res) => {
  return res.json(getDashboard());
});

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function bad(res, msg, details) {
  return res.status(400).json({ error: msg, details: details || undefined });
}

// Publish validation for curriculum/subject/module/topic level (name required).
function validateLocalizable(payload, kind) {
  const errors = [];
  const langs = payload.translations || {};
  for (const lang of ['uz', 'ru', 'en']) {
    const tr = langs[lang] || {};
    if (!tr.name || !String(tr.name).trim()) {
      errors.push((kind || 'Content') + ' name is missing for ' + lang.toUpperCase());
    }
  }
  return errors;
}

function writeTranslations(kind, id, translations) {
  const table = {
    curriculum: 'curriculum_translations', subject: 'subject_translations',
    module: 'module_translations', topic: 'topic_translations',
  }[kind];
  const idCol = { curriculum: 'curriculum_id', subject: 'subject_id', module: 'module_id', topic: 'topic_id' }[kind];
  const cols = kind === 'curriculum' || kind === 'subject'
    ? ['lang', 'name', 'short_desc', 'long_desc']
    : ['lang', 'name', 'description'];
  for (const lang of Object.keys(translations || {})) {
    const tr = translations[lang] || {};
    if (cols.includes('short_desc')) {
      db.prepare(`
        INSERT INTO ${table} (${idCol}, lang, name, short_desc, long_desc)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(${idCol}, lang) DO UPDATE SET
          name = excluded.name, short_desc = excluded.short_desc, long_desc = excluded.long_desc
      `).run(id, lang, String(tr.name || '').trim(), String(tr.short_desc || '').trim(), String(tr.long_desc || '').trim());
    } else {
      db.prepare(`
        INSERT INTO ${table} (${idCol}, lang, name, description)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(${idCol}, lang) DO UPDATE SET
          name = excluded.name, description = excluded.description
      `).run(id, lang, String(tr.name || '').trim(), String(tr.description || '').trim());
    }
  }
}

// Generate a unique slug for a content row. status irrelevant to uniqueness.
function uniqueSlug(table, base, excludeId) {
  let slug = slugify(base);
  let candidate = slug;
  let i = 2;
  let exists = true;
  while (exists) {
    const row = excludeId
      ? db.prepare(`SELECT id FROM ${table} WHERE slug = ? AND id <> ?`).get(candidate, excludeId)
      : db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).get(candidate);
    if (!row) { exists = false; break; }
    candidate = slug + '-' + i;
    i += 1;
  }
    return candidate;
}

// ---------------------------------------------------------------------------
// Curricula
// ---------------------------------------------------------------------------
router.get('/curricula', requireRole('read'), (req, res) => {
  const status = req.query.status || null;
  const rows = content.listCurricula({ status }).map((c) => ({
    ...c,
    subjectCount: hier.countChild('subject', c.id),
    assignedSubjects: hier.getCurriculumSubjects(c.id),
    questionCount: hier.countPublishedQuestionsForCurriculum(c.id),
  }));
  return res.json(rows);
});

router.get('/curricula/:id', requireRole('read'), (req, res) => {
  const c = content.getById('curriculum', Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Curriculum not found.' });
  return res.json({
    ...c,
    translations: content.getTranslations('curriculum', c.id),
    assignedSubjects: hier.getCurriculumSubjects(c.id),
    unassignedSubjects: hier.getUnassignedSubjects(c.id),
    subjectCount: hier.countChild('subject', c.id),
    questionCount: hier.countPublishedQuestionsForCurriculum(c.id),
  });
});

router.post('/curricula', requireRole('write'), csrfProtection, (req, res) => {
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek name is required.');
  const slug = uniqueSlug('curricula', payload.slug || nameUz);
  const status = payload.status === 'published' ? 'published' : 'draft';
  const tx = db.transaction(() => {
    const id = db.prepare(
      'INSERT INTO curricula (slug, status, display_order) VALUES (?, ?, ?)'
    ).run(slug, status, Number(payload.display_order) || 0).lastInsertRowid;
    writeTranslations('curriculum', id, payload.translations || {});
    return id;
  });
  const id = tx();
  audit(req.user.id, 'create', 'curriculum', id, nameUz, { slug, status }, req.ip);
  return res.status(201).json({ id });
});

router.put('/curricula/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const c = content.getById('curriculum', id);
  if (!c) return res.status(404).json({ error: 'Curriculum not found.' });
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek name is required.');
  const slug = uniqueSlug('curricula', payload.slug || c.slug, id);
  const status = payload.status || c.status;
  const tx = db.transaction(() => {
    db.prepare('UPDATE curricula SET slug = ?, status = ?, display_order = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(slug, status, Number.isInteger(payload.display_order) ? payload.display_order : c.display_order, id);
    writeTranslations('curriculum', id, payload.translations || {});
    if (Array.isArray(payload.assigned_subjects)) {
      db.prepare('DELETE FROM curriculum_subjects WHERE curriculum_id = ?').run(id);
      const seen = new Set();
      payload.assigned_subjects.forEach((sid, idx) => {
        const n = Number(sid);
        if (!Number.isInteger(n) || seen.has(n)) return;
        seen.add(n);
        db.prepare('INSERT INTO curriculum_subjects (curriculum_id, subject_id, display_order) VALUES (?, ?, ?)')
          .run(id, n, idx);
      });
    }
  });
  tx();
  audit(req.user.id, 'update', 'curriculum', id, nameUz, { status }, req.ip);
  return res.json({ ok: true });
});

router.post('/curricula/:id/status', requireRole('publish'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const c = content.getById('curriculum', id);
  if (!c) return res.status(404).json({ error: 'Curriculum not found.' });
  const status = String(req.body?.status || '');
  if (!['published', 'draft', 'archived'].includes(status)) return bad(res, 'Invalid status.');
  db.prepare('UPDATE curricula SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  const action = status === 'archived' ? 'archive' : (status === 'published' ? 'publish' : 'unpublish');
  audit(req.user.id, action, 'curriculum', id, c.slug, { status }, req.ip);
  return res.json({ ok: true });
});

// DELETE /curricula/:id — removes the curriculum, its translations, and unlinks
// its subjects (curriculum_subjects cascades). Subjects/modules/questions stay.
router.delete('/curricula/:id', requireRole('delete'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const c = content.getById('curriculum', id);
  if (!c) return res.status(404).json({ error: 'Curriculum not found.' });
  const linked = hier.getCurriculumSubjects(id).length;
  if (linked > 0) {
    return bad(res, `This curriculum still has ${linked} assigned subject(s). Remove them first.`);
  }
  db.prepare('DELETE FROM curricula WHERE id = ?').run(id);
  audit(req.user.id, 'delete', 'curriculum', id, c.slug, {}, req.ip);
  return res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
router.get('/subjects', requireRole('read'), (req, res) => {
  const status = req.query.status || null;
  const rows = content.listSubjects({ status }).map((s) => ({
    ...s,
    curricula: hier.getSubjectCurricula(s.id),
    moduleCount: hier.countChild('module', s.id),
    questionCount: hier.countPublishedQuestionsForSubject(s.id),
  }));
  return res.json(rows);
});

router.get('/subjects/:id', requireRole('read'), (req, res) => {
  const s = content.getById('subject', Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Subject not found.' });
  return res.json({
    ...s,
    translations: content.getTranslations('subject', s.id),
    curricula: hier.getSubjectCurricula(s.id),
    allCurricula: content.listCurricula({}),
    moduleCount: hier.countChild('module', s.id),
    questionCount: hier.countPublishedQuestionsForSubject(s.id),
  });
});

router.post('/subjects', requireRole('write'), csrfProtection, (req, res) => {
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek name is required.');
  const slug = uniqueSlug('subjects', payload.slug || nameUz);
  const status = payload.status === 'published' ? 'published' : 'draft';
  const iconMediaId = Number(payload.icon_media_id) || null;
  const tx = db.transaction(() => {
    const id = db.prepare(
      'INSERT INTO subjects (slug, status, display_order, icon_media_id) VALUES (?, ?, ?, ?)'
    ).run(slug, status, Number(payload.display_order) || 0, iconMediaId).lastInsertRowid;
    writeTranslations('subject', id, payload.translations || {});
    if (Array.isArray(payload.curricula_ids)) {
      const seen = new Set();
      payload.curricula_ids.forEach((cid, idx) => {
        const n = Number(cid);
        if (!Number.isInteger(n) || seen.has(n)) return;
        seen.add(n);
        db.prepare('INSERT INTO curriculum_subjects (curriculum_id, subject_id, display_order) VALUES (?, ?, ?)')
          .run(n, id, idx);
      });
    }
    return id;
  });
  const id = tx();
  audit(req.user.id, 'create', 'subject', id, nameUz, { slug, status }, req.ip);
  return res.status(201).json({ id });
});

router.put('/subjects/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const s = content.getById('subject', id);
  if (!s) return res.status(404).json({ error: 'Subject not found.' });
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek name is required.');
  const slug = uniqueSlug('subjects', payload.slug || s.slug, id);
  const status = payload.status || s.status;
  const iconMediaId = payload.icon_media_id ? Number(payload.icon_media_id) : s.icon_media_id;
  const tx = db.transaction(() => {
    db.prepare('UPDATE subjects SET slug = ?, status = ?, display_order = ?, icon_media_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(slug, status, Number.isInteger(payload.display_order) ? payload.display_order : s.display_order, iconMediaId, id);
    writeTranslations('subject', id, payload.translations || {});
    if (Array.isArray(payload.curricula_ids)) {
      db.prepare('DELETE FROM curriculum_subjects WHERE subject_id = ?').run(id);
      const seen = new Set();
      payload.curricula_ids.forEach((cid, idx) => {
        const n = Number(cid);
        if (!Number.isInteger(n) || seen.has(n)) return;
        seen.add(n);
        db.prepare('INSERT INTO curriculum_subjects (curriculum_id, subject_id, display_order) VALUES (?, ?, ?)')
          .run(n, id, idx);
      });
    }
  });
  tx();
  audit(req.user.id, 'update', 'subject', id, nameUz, { status }, req.ip);
  return res.json({ ok: true });
});

// DELETE /subjects/:id — removes the subject + its translations. Blocked while
// it still has modules (modules/topics/questions cascade, which we never do
// implicitly).
router.delete('/subjects/:id', requireRole('delete'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const s = content.getById('subject', id);
  if (!s) return res.status(404).json({ error: 'Subject not found.' });
  const moduleCount = hier.countChild('module', id);
  if (moduleCount > 0) {
    return bad(res, `This subject still has ${moduleCount} module(s). Remove them first.`);
  }
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM curriculum_subjects WHERE subject_id = ?').run(id);
    db.prepare('DELETE FROM subject_translations WHERE subject_id = ?').run(id);
    db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  });
  tx();
  audit(req.user.id, 'delete', 'subject', id, s.slug, {}, req.ip);
  return res.json({ ok: true });
});

router.post('/subjects/:id/status', requireRole('publish'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const s = content.getById('subject', id);
  if (!s) return res.status(404).json({ error: 'Subject not found.' });
  const status = String(req.body?.status || '');
  if (!['published', 'draft', 'archived'].includes(status)) return bad(res, 'Invalid status.');
  db.prepare('UPDATE subjects SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  const action = status === 'archived' ? 'archive' : (status === 'published' ? 'publish' : 'unpublish');
  audit(req.user.id, action, 'subject', id, s.slug, { status }, req.ip);
  return res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------
router.get('/modules', requireRole('read'), (req, res) => {
  const subjectId = Number(req.query.subject_id) || null;
  const status = req.query.status || null;
  const rows = content.listModules({ subjectId, status }).map((m) => ({
    ...m,
    topicCount: hier.countChild('topic', m.id),
    questionCount: hier.countPublishedQuestionsForModule(m.id),
  }));
  return res.json(rows);
});

router.get('/modules/:id', requireRole('read'), (req, res) => {
  const m = content.getById('module', Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Module not found.' });
  return res.json({
    ...m,
    translations: content.getTranslations('module', m.id),
    topicCount: hier.countChild('topic', m.id),
    questionCount: hier.countPublishedQuestionsForModule(m.id),
  });
});

router.post('/modules', requireRole('write'), csrfProtection, (req, res) => {
  const payload = req.body || {};
  const subjectId = Number(payload.subject_id);
  if (!Number.isInteger(subjectId) || !content.getById('subject', subjectId)) return bad(res, 'A valid subject is required.');
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek module name is required.');
  const slug = uniqueSlug('modules', payload.slug || nameUz);
  const status = payload.status === 'published' ? 'published' : 'draft';
  const tx = db.transaction(() => {
    const id = db.prepare(
      'INSERT INTO modules (subject_id, slug, status, display_order) VALUES (?, ?, ?, ?)'
    ).run(subjectId, slug, status, Number(payload.display_order) || 0).lastInsertRowid;
    writeTranslations('module', id, payload.translations || {});
    return id;
  });
  const id = tx();
  audit(req.user.id, 'create', 'module', id, nameUz, { subjectId, slug, status }, req.ip);
  return res.status(201).json({ id });
});

router.put('/modules/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const m = content.getById('module', id);
  if (!m) return res.status(404).json({ error: 'Module not found.' });
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek module name is required.');
  const slug = uniqueSlug('modules', payload.slug || m.slug, id);
  const status = payload.status || m.status;
  const tx = db.transaction(() => {
    db.prepare('UPDATE modules SET slug = ?, status = ?, display_order = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(slug, status, Number.isInteger(payload.display_order) ? payload.display_order : m.display_order, id);
    writeTranslations('module', id, payload.translations || {});
  });
  tx();
  audit(req.user.id, 'update', 'module', id, nameUz, { status }, req.ip);
  return res.json({ ok: true });
});

router.post('/modules/:id/status', requireRole('publish'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const m = content.getById('module', id);
  if (!m) return res.status(404).json({ error: 'Module not found.' });
  const status = String(req.body?.status || '');
  if (!['published', 'draft', 'archived'].includes(status)) return bad(res, 'Invalid status.');
  db.prepare('UPDATE modules SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  const action = status === 'archived' ? 'archive' : (status === 'published' ? 'publish' : 'unpublish');
  audit(req.user.id, action, 'module', id, m.slug, { status }, req.ip);
  return res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
router.get('/topics', requireRole('read'), (req, res) => {
  const moduleId = Number(req.query.module_id) || null;
  const status = req.query.status || null;
  const rows = content.listTopics({ moduleId, status }).map((t) => ({
    ...t,
    questionCount: hier.countChild('question', t.id),
    publishedQuestionCount: hier.countPublishedQuestionsForTopic(t.id),
  }));
  return res.json(rows);
});

router.get('/topics/:id', requireRole('read'), (req, res) => {
  const t = content.getById('topic', Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Topic not found.' });
  return res.json({
    ...t,
    translations: content.getTranslations('topic', t.id),
    questionCount: hier.countChild('question', t.id),
    publishedQuestionCount: hier.countPublishedQuestionsForTopic(t.id),
  });
});

router.post('/topics', requireRole('write'), csrfProtection, (req, res) => {
  const payload = req.body || {};
  const moduleId = Number(payload.module_id);
  if (!Number.isInteger(moduleId) || !content.getById('module', moduleId)) return bad(res, 'A valid module is required.');
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek topic name is required.');
  const slug = uniqueSlug('topics', payload.slug || nameUz);
  const status = payload.status === 'published' ? 'published' : 'draft';
  const tx = db.transaction(() => {
    const id = db.prepare(
      'INSERT INTO topics (module_id, slug, status, display_order) VALUES (?, ?, ?, ?)'
    ).run(moduleId, slug, status, Number(payload.display_order) || 0).lastInsertRowid;
    writeTranslations('topic', id, payload.translations || {});
    return id;
  });
  const id = tx();
  audit(req.user.id, 'create', 'topic', id, nameUz, { moduleId, slug, status }, req.ip);
  return res.status(201).json({ id });
});

router.put('/topics/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const t = content.getById('topic', id);
  if (!t) return res.status(404).json({ error: 'Topic not found.' });
  const payload = req.body || {};
  const nameUz = String((payload.translations || {}).uz?.name || '').trim();
  if (!nameUz) return bad(res, 'Uzbek topic name is required.');
  const slug = uniqueSlug('topics', payload.slug || t.slug, id);
  const status = payload.status || t.status;
  const tx = db.transaction(() => {
    db.prepare('UPDATE topics SET slug = ?, status = ?, display_order = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(slug, status, Number.isInteger(payload.display_order) ? payload.display_order : t.display_order, id);
    writeTranslations('topic', id, payload.translations || {});
  });
  tx();
  audit(req.user.id, 'update', 'topic', id, nameUz, { status }, req.ip);
  return res.json({ ok: true });
});

router.post('/topics/:id/status', requireRole('publish'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const t = content.getById('topic', id);
  if (!t) return res.status(404).json({ error: 'Topic not found.' });
  const status = String(req.body?.status || '');
  if (!['published', 'draft', 'archived'].includes(status)) return bad(res, 'Invalid status.');
  db.prepare('UPDATE topics SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  const action = status === 'archived' ? 'archive' : (status === 'published' ? 'publish' : 'unpublish');
  audit(req.user.id, action, 'topic', id, t.slug, { status }, req.ip);
    return res.json({ ok: true });
});

export default router;