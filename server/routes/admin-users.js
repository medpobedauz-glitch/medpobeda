// MedPobeda — admin users + audit-log routes.
import { Router } from 'express';
import { db } from '../db/index.js';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit, hashPassword, ROLES } from '../middleware/auth.js';

const router = Router();

// List users (super_admin only).
router.get('/users', requireRole('users'), (req, res) => {
  const rows = db.prepare(`
    SELECT id, email, display_name, role, status, last_login_at, created_at
    FROM users ORDER BY id ASC
  `).all();
  return res.json(rows);
});

// List registered students (public users) with optional search + language/curriculum filters.
router.get('/students', requireRole('read'), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const lang = String(req.query.lang || '').trim().toLowerCase();
  const curriculum = String(req.query.curriculum || '').trim().toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  let sql = `
    SELECT s.id, s.full_name, s.contact, s.contact_type, s.preferred_lang,
           s.curriculum_id, s.status, s.created_at, s.updated_at,
           c.slug AS curriculum_slug,
           (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id) AS progress_count
    FROM students s
    LEFT JOIN curricula c ON c.id = s.curriculum_id
    WHERE 1=1`;
  const params = [];
  if (q) {
    sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.contact) LIKE ?)';
    const like = '%' + q + '%';
    params.push(like, like);
  }
  if (['uz', 'en', 'ru'].includes(lang)) {
    sql += ' AND s.preferred_lang = ?';
    params.push(lang);
  }
  if (curriculum) {
    sql += ' AND c.slug = ?';
    params.push(curriculum);
  }
  sql += ' ORDER BY s.id DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) AS n FROM students').get()?.n || 0;
  // Distinct curriculums present among students (for the filter dropdown).
  const curriculums = db.prepare(`
    SELECT DISTINCT c.slug AS value, c.slug AS label
    FROM students s JOIN curricula c ON c.id = s.curriculum_id
    WHERE c.slug IS NOT NULL AND c.slug != ''
    ORDER BY c.slug ASC
  `).all();
  return res.json({ rows, total, curriculums });
});

// Export registered students as CSV (opens directly in Excel).
// Supports the same search + language + curriculum filters as the list endpoint.
router.get('/students/export', requireRole('read'), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const lang = String(req.query.lang || '').trim().toLowerCase();
  const curriculum = String(req.query.curriculum || '').trim().toLowerCase();
  let sql = `
    SELECT s.id, s.full_name, s.contact, s.contact_type, s.preferred_lang,
           s.status, s.created_at,
           c.slug AS curriculum_slug,
           (SELECT COUNT(*) FROM progress p WHERE p.student_id = s.id) AS progress_count
    FROM students s
    LEFT JOIN curricula c ON c.id = s.curriculum_id
    WHERE 1=1`;
  const params = [];
  if (q) {
    sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.contact) LIKE ?)';
    const like = '%' + q + '%';
    params.push(like, like);
  }
  if (['uz', 'en', 'ru'].includes(lang)) {
    sql += ' AND s.preferred_lang = ?';
    params.push(lang);
  }
  if (curriculum) {
    sql += ' AND c.slug = ?';
    params.push(curriculum);
  }
  sql += ' ORDER BY s.id ASC';
  const rows = db.prepare(sql).all(...params);

  const csvCell = (v) => {
    const s = String(v ?? '');
    // Guard against CSV injection (formulas) and escape quotes/commas.
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const header = ['ID', 'Full Name', 'Contact', 'Contact Type', 'Language', 'Curriculum', 'Practice Runs', 'Status', 'Registered At'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([
      r.id, r.full_name, r.contact, r.contact_type,
      (r.preferred_lang || 'uz').toUpperCase(),
      r.curriculum_slug || '', r.progress_count ?? 0, r.status, r.created_at || ''
    ].map(csvCell).join(','));
  }
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM so Excel renders UTF-8 correctly
  audit(req.user.id, 'export_students', 'student', null, 'csv', { count: rows.length, lang: lang || 'all' }, req.ip);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="medpobeda-students.csv"');
  return res.send(csv);
});

// Create user (super_admin only).
router.post('/users', requireRole('users'), csrfProtection, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const displayName = String(req.body?.display_name || '').trim();
  const role = req.body?.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'A user with that email already exists.' });
  try {
    const id = db.prepare(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(email, hashPassword(password), displayName, role).lastInsertRowid;
    audit(req.user.id, 'create_user', 'user', id, email, { role }, req.ip);
    return res.status(201).json({ id });
  } catch (e) {
    return res.status(400).json({ error: 'Could not create user.' });
  }
});

// Update a user: role, display name, status. Supersedes editing password via API here.
router.put('/users/:id', requireRole('users'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const role = req.body?.role || u.role;
  const displayName = req.body?.display_name != null ? String(req.body.display_name).trim() : u.display_name;
  const status = req.body?.status || u.status;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare('UPDATE users SET role = ?, display_name = ?, status = ? WHERE id = ?').run(role, displayName, status, id);
  audit(req.user.id, 'update_user', 'user', id, u.email, { role, status }, req.ip);
  return res.json({ ok: true });
});

// Audit log (with filters, paginated).
router.get('/audit-log', requireRole('audit'), (req, res) => {
  const { entity_type, action, user_id } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  let sql = 'SELECT a.*, u.display_name AS user_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (action) { sql += ' AND LOWER(a.action) LIKE ?'; params.push('%' + String(action).trim().toLowerCase() + '%'); }
  if (user_id) { sql += ' AND a.user_id = ?'; params.push(Number(user_id)); }
  sql += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get()?.n || 0;
  return res.json({ rows, total });
});

export default router;