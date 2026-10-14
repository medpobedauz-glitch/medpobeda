// MedPobeda — admin management routes for universities, programs, achievements.
import { Router } from 'express';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit } from '../middleware/auth.js';
import * as universities from '../services/universities.js';
import * as achievements from '../services/achievements.js';
import { db } from '../db/index.js';

const router = Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

// All routes require admin auth
router.use(requireRole('read'));

// ---- Universities ----
router.get('/universities', (req, res) => {
  const rows = universities.listUniversities({ status: req.query.status || 'active' });
  res.json({ universities: rows });
});

router.post('/universities', requireRole('write'), csrfProtection, (req, res) => {
  const { country_id, name, city } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, 'University name is required.');
  const u = universities.addUniversity({ countryId: Number(country_id) || 1, name, city });
  audit(req.user.id, 'add_university', 'universities', u.id, u.name, {}, req.ip);
  res.status(201).json(u);
});

router.put('/universities/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const u = universities.updateUniversity(id, req.body || {});
  audit(req.user.id, 'update_university', 'universities', id, u?.name || '', {}, req.ip);
  res.json(u || { ok: true });
});

// ---- Programs ----
router.get('/programs', (req, res) => {
  const rows = universities.listPrograms({ status: req.query.status || 'active' });
  res.json({ programs: rows });
});

router.post('/programs', requireRole('write'), csrfProtection, (req, res) => {
  const { slug, name_uz, name_ru, name_en } = req.body || {};
  if (!slug || !String(slug).trim()) return bad(res, 'Program slug is required.');
  const p = universities.addProgram({ slug, nameUz: name_uz, nameRu: name_ru, nameEn: name_en });
  audit(req.user.id, 'add_program', 'programs', p.id, p.slug, {}, req.ip);
  res.status(201).json(p);
});

router.put('/programs/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const p = universities.updateProgram(id, req.body || {});
  audit(req.user.id, 'update_program', 'programs', id, p?.slug || '', {}, req.ip);
  res.json(p || { ok: true });
});

// ---- Achievements ----
router.get('/achievements', (req, res) => {
  const rows = db.prepare('SELECT * FROM achievements ORDER BY threshold ASC').all();
  res.json({ achievements: rows });
});

router.post('/achievements', requireRole('write'), csrfProtection, (req, res) => {
  const { slug, name_uz, name_ru, name_en, description_uz, description_ru, description_en, icon, metric, threshold } = req.body || {};
  if (!slug || !String(slug).trim()) return bad(res, 'Achievement slug is required.');
  const a = achievements.addAchievement({ slug, nameUz: name_uz, nameRu: name_ru, nameEn: name_en, descUz: description_uz, descRu: description_ru, descEn: description_en, icon, metric, threshold: Number(threshold) || 0 });
  audit(req.user.id, 'add_achievement', 'achievements', a.id, a.slug, {}, req.ip);
  res.status(201).json(a);
});

router.put('/achievements/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const a = achievements.updateAchievement(id, req.body || {});
  audit(req.user.id, 'update_achievement', 'achievements', id, a?.slug || '', {}, req.ip);
  res.json(a || { ok: true });
});

export default router;
