// MedPobeda — public student auth routes (register / login / me / logout).
import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import {
  hashStudentPassword, verifyStudentPassword,
  getStudentByContact, getStudentById,
} from '../middleware/student-auth.js';
import { ensureCsrf } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();
const bad = (res, msg, details) => res.status(400).json({ error: msg, details: details || undefined });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,18}$/;

function normalizeContact(raw) {
  const contact = String(raw || '').trim();
  if (EMAIL_RE.test(contact)) return { contact: contact.toLowerCase(), contactType: 'email' };
  const digits = contact.replace(/[\s\-()]/g, '');
  if (PHONE_RE.test(contact) && digits.replace(/\D/g, '').length >= 7) {
    return { contact: digits, contactType: 'phone' };
  }
  return null;
}

function publicStudent(s) {
  return {
    id: s.id,
    full_name: s.full_name,
    contact: s.contact,
    contact_type: s.contact_type,
    preferred_lang: s.preferred_lang,
    curriculum_id: s.curriculum_id,
  };
}

function issueSession(req, student) {
  req.session.student = { id: student.id };
  req.session.csrfToken = crypto.randomBytes(24).toString('hex');
}

// POST /api/auth/register
router.post('/register', authLimiter, (req, res) => {
  const body = req.body || {};
  const firstName = String(body.first_name || '').trim();
  const lastName = String(body.last_name || '').trim();
  const fullName = String(body.full_name || '').trim() || (firstName + ' ' + lastName).trim();
  const password = String(body.password || '');
  const norm = normalizeContact(body.contact);
  const lang = ['uz', 'ru', 'en'].includes(body.preferred_lang) ? body.preferred_lang : 'uz';
  const curriculumId = Number(body.curriculum_id) || null;
  const phone = String(body.phone || '').trim().replace(/[\s\-()]/g, '');
  const universityId = Number(body.university_id) || null;
  const studyYear = Number(body.study_year) || null;
  const programId = Number(body.program_id) || null;

  if (fullName.length < 2 || fullName.length > 120) return bad(res, 'Full name is required.');
  if (!norm) return bad(res, 'Enter a valid email address or phone number.');
  if (password.length < 8) return bad(res, 'Password must be at least 8 characters.');
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) return bad(res, 'Invalid phone number.');
  if (curriculumId !== null && !db.prepare('SELECT id FROM curricula WHERE id = ?').get(curriculumId)) {
    return bad(res, 'Unknown curriculum.');
  }
  if (getStudentByContact(norm.contact)) {
    return res.status(409).json({ error: 'An account with this contact already exists. Try logging in.' });
  }

  const id = db.prepare(`
    INSERT INTO students (full_name, first_name, last_name, contact, contact_type, password_hash, preferred_lang, curriculum_id, phone, university_id, study_year, program_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(fullName, firstName || null, lastName || null, norm.contact, norm.contactType, hashStudentPassword(password), lang, curriculumId, phone || null, universityId, studyYear, programId).lastInsertRowid;

  const student = getStudentById(id);
  issueSession(req, student);
  return res.status(201).json({ student: publicStudent(student), csrfToken: req.session.csrfToken });
});

// POST /api/auth/login
router.post('/login', authLimiter, (req, res) => {
  const norm = normalizeContact(req.body?.contact);
  const password = String(req.body?.password || '');
  if (!norm || !password) return res.status(401).json({ error: 'Invalid contact or password.' });

  const student = getStudentByContact(norm.contact);
  if (!student || student.status !== 'active' || !verifyStudentPassword(password, student.password_hash)) {
    return res.status(401).json({ error: 'Invalid contact or password.' });
  }

  issueSession(req, student);
  return res.json({ student: publicStudent(student), csrfToken: req.session.csrfToken });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.student) return res.status(401).json({ error: 'Not authenticated.' });
  ensureCsrf(req, res, () => {});
  return res.json({ student: publicStudent(req.student), csrfToken: req.session.csrfToken });
});

// POST /api/auth/logout
router.post('/logout', csrfProtection, (req, res) => {
  req.session.destroy(() => {
    return res.json({ ok: true });
  });
});

// POST /api/auth/progress - Save practice score
router.post('/progress', csrfProtection, async (req, res) => {
  if (!req.student) return res.status(401).json({ error: 'Not authenticated.' });
  const { topicSlug, correct, total, subjectSlug, curriculumSlug } = req.body || {};
  if (!topicSlug || correct == null || !total) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const { db } = await import('../db/index.js');
    const studentId = req.student.id;
    db.prepare(`INSERT INTO progress (student_id, curriculum_slug, subject_slug, topic_slug, correct, total, taken_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`)
      .run(studentId, curriculumSlug || '', subjectSlug || '', topicSlug, correct, total);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save progress.' });
  }
});

// GET /api/auth/progress - Get student's progress history
router.get('/progress', async (req, res) => {
  if (!req.student) return res.status(401).json({ error: 'Not authenticated.' });
  try {
    const { db } = await import('../db/index.js');
    const studentId = req.student.id;
    const rows = db.prepare(`SELECT curriculum_slug, subject_slug, topic_slug, correct, total, taken_at FROM progress WHERE student_id = ? ORDER BY taken_at DESC LIMIT 50`).all(studentId);
    return res.json({ progress: rows });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch progress.' });
  }
});

export default router;
