// MedPobeda — student profile API routes.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { csrfProtection } from '../middleware/csrf.js';
import { upload, validateImageSafe, saveMediaRecord } from '../services/uploads.js';
import { config } from '../config.js';
import * as profile from '../services/student-profile.js';

const router = Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

// Require student auth for all profile routes
router.use((req, res, next) => {
  if (!req.student) return res.status(401).json({ error: 'Please sign in.' });
  next();
});

// GET /api/student/profile
router.get('/profile', (req, res) => {
  const s = profile.getStudentProfile(req.student.id);
  if (!s) return res.status(404).json({ error: 'Profile not found.' });
  const stats = profile.getStudentStats(req.student.id);
  const streak = profile.getStudyStreak(req.student.id);
  const photoUrl = s.photo_media_id ? `/media/${getPhotoFilename(s.photo_media_id)}` : null;
  res.json({
    student: {
      id: s.id,
      first_name: s.first_name || '',
      last_name: s.last_name || '',
      full_name: s.full_name,
      contact: s.contact,
      contact_type: s.contact_type,
      phone: s.phone || '',
      preferred_lang: s.preferred_lang,
      university_id: s.university_id,
      university_name: s.university_name || '',
      university_city: s.university_city || '',
      study_year: s.study_year,
      program_id: s.program_id,
      program_slug: s.program_slug || '',
      photo_url: photoUrl,
      created_at: s.created_at,
    },
    stats,
    streak,
  });
});

function getPhotoFilename(mediaId) {
  const { db } = require('../db/index.js');
  return db.prepare('SELECT safe_filename FROM media WHERE id = ?').get(mediaId)?.safe_filename || null;
}

// PUT /api/student/profile
router.put('/profile', csrfProtection, (req, res) => {
  const body = req.body || {};
  const fields = {};
  if (body.first_name !== undefined) fields.first_name = String(body.first_name).trim().slice(0, 60);
  if (body.last_name !== undefined) fields.last_name = String(body.last_name).trim().slice(0, 60);
  if (body.phone !== undefined) {
    const phone = String(body.phone).trim().replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(phone)) return bad(res, 'Invalid phone number.');
    fields.phone = phone;
  }
  if (body.university_id !== undefined) {
    const uid = Number(body.university_id);
    if (!isNaN(uid) && uid > 0) fields.university_id = uid;
  }
  if (body.study_year !== undefined) {
    const yr = Number(body.study_year);
    if (!isNaN(yr) && yr >= 1 && yr <= 6) fields.study_year = yr;
  }
  if (body.program_id !== undefined) {
    const pid = Number(body.program_id);
    if (!isNaN(pid) && pid > 0) fields.program_id = pid;
  }
  if (body.preferred_lang !== undefined && ['uz', 'ru', 'en'].includes(body.preferred_lang)) {
    fields.preferred_lang = body.preferred_lang;
  }
  const updated = profile.updateStudentProfile(req.student.id, fields);
  res.json({ ok: true, student: updated });
});

// POST /api/student/profile/photo  (multipart, field name: photo)
router.post('/profile/photo', csrfProtection, (req, res) => {
  upload(req, res, (err) => {
    if (err) return bad(res, 'Upload failed: ' + (err.message || 'invalid file.'));
    const file = req.file;
    if (!file) return bad(res, 'No file uploaded.');
    const check = validateImageSafe(req, file);
    if (!check.ok) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return bad(res, check.reason || 'Invalid image.');
    }
    // Resize / optimize if large (simple approach: re-save via sharp-like limit using canvas — here we just cap dimensions by checking)
    const mediaId = saveMediaRecord(file, { uploadedBy: null, altText: 'profile_photo', ip: req.ip });
    profile.setProfilePhoto(req.student.id, mediaId);
    res.json({ ok: true, photo_url: `/media/${file.filename}` });
  });
});

// DELETE /api/student/profile/photo
router.delete('/profile/photo', csrfProtection, (req, res) => {
  const s = profile.getStudentProfile(req.student.id);
  if (s && s.photo_media_id) {
    // Optionally remove the media file
    try {
      const { db } = require('../db/index.js');
      const m = db.prepare('SELECT storage_path FROM media WHERE id = ?').get(s.photo_media_id);
      if (m) fs.unlinkSync(m.storage_path);
      db.prepare('DELETE FROM media WHERE id = ?').run(s.photo_media_id);
    } catch { /* ignore */ }
  }
  profile.removeProfilePhoto(req.student.id);
  res.json({ ok: true });
});

export default router;
