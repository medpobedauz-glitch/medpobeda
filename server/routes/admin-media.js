// MedPobeda — admin media routes.
import { Router } from 'express';
import fs from 'node:fs';
import { db } from '../db/index.js';
import { requireRole } from '../middleware/auth-roles.js';
import { csrfProtection } from '../middleware/csrf.js';
import { audit } from '../middleware/auth.js';
import { upload, validateImageSafe, saveMediaRecord, readImageSize } from '../services/uploads.js';
import * as mediaService from '../services/media.js';
import { config } from '../config.js';

const router = Router();
const bad = (res, msg) => res.status(400).json({ error: msg });

function getMediaPath(mediaId) {
  const m = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
  if (!m) return null;
  if (m.status === 'archived') return null;
  return m;
}

// List + search
router.get('/media', requireRole('read'), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const rows = mediaService.listMedia({}).filter((m) => {
    if (!q) return true;
    return m.original_filename.toLowerCase().includes(q)
      || m.alt_text.toLowerCase().includes(q)
      || m.safe_filename.toLowerCase().includes(q);
  });
  return res.json(rows);
});

// Single
router.get('/media/:id', requireRole('read'), (req, res) => {
  const m = mediaService.getMedia(Number(req.params.id));
  if (!m) return res.status(404).json({ error: 'Media not found.' });
  return res.json({ ...m, usage: mediaService.findMediaUsage(m.id) });
});

// Upload (multipart, admin-authenticated)
router.post('/media/upload', requireRole('write'), csrfProtection, (req, res, next) => {
  upload(req, res, async (err) => {
    try {
    if (err) return bad(res, 'Upload failed: ' + (err.message || 'invalid file.'));
    const file = req.file;
    if (!file) return bad(res, 'No file was uploaded.');
    const check = validateImageSafe(req, file);
    if (!check.ok) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      return bad(res, check.reason || 'Invalid image file.');
    }
    const altText = String(req.body?.alt_text || '').trim();
    const id = await saveMediaRecord(file, { uploadedBy: req.user.id, altText, ip: req.ip });
    audit(req.user.id, 'upload_media', 'media', id, file.originalname, { mime: file.mimetype, size: file.size }, req.ip);
    return res.status(201).json({ id });
    } catch (error) {
      if (req.file?.path) { try { await fs.promises.unlink(req.file.path); } catch {} }
      next(error);
    }
  });
});

// Update alt text + status (archive)
router.put('/media/:id', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const m = mediaService.getMedia(id);
  if (!m) return res.status(404).json({ error: 'Media not found.' });
  const alt = String(req.body?.alt_text || m.alt_text).trim();
  db.prepare('UPDATE media SET alt_text = ? WHERE id = ?').run(alt, id);
  return res.json({ ok: true });
});

// Archive media (soft). Blocked if referenced.
router.post('/media/:id/archive', requireRole('write'), csrfProtection, (req, res) => {
  const id = Number(req.params.id);
  const result = mediaService.archiveMedia(id);
  if (!result) return res.status(404).json({ error: 'Media not found.' });
  if (result.error) return bad(res, result.error);
  audit(req.user.id, 'archive_media', 'media', id, result.original_filename, {}, req.ip);
  return res.json({ ok: true });
});

// Delete (hard) — only when unreferenced, after explicit confirmation.
router.post('/media/:id/delete', requireRole('delete'), csrfProtection, async (req, res) => {
  const id = Number(req.params.id);
  const result = await mediaService.deleteMedia(id);
  if (!result) return res.status(404).json({ error: 'Media not found.' });
  if (result.error) return bad(res, result.error);
  audit(req.user.id, 'delete_media', 'media', id, 'deleted', {}, req.ip);
  return res.json({ ok: true });
});

export default router;
