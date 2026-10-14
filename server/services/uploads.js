// MedPobeda — secure image upload handling.
// Validates by magic bytes (not just extension), generates safe UUID filenames,
// enforces size limits, and stores only metadata in the database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { persistMediaFile, removeMediaFile } from './object-storage.js';

// Allowed image types with magic-byte signatures.
const IMAGE_MAGIC = {
  'image/png': [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ],
  'image/jpeg': [
    [0xff, 0xd8, 0xff],
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46],          // "RIFF" — WebP also requires "WEBP" at +8
  ],
};

const EXT_FOR_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function matchesMagic(buf, signature) {
  if (buf.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buf[i] !== signature[i]) return false;
  }
  return true;
}

function sniffMime(buf) {
  for (const [mime, sigs] of Object.entries(IMAGE_MAGIC)) {
    for (const sig of sigs) {
      if (matchesMagic(buf, sig)) {
        // Extra check for WebP: bytes 8..11 must be "WEBP".
        if (mime === 'image/webp') {
          const tag = buf.toString('latin1', 8, 12);
          if (tag !== 'WEBP') continue;
        }
        return mime;
      }
    }
  }
  return null;
}

// Parses PNG/JPEG/GIF/WebP dimensions. Returns null on failure (not fatal).
export function readImageSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    const mime = sniffMime(buf);
    if (!mime) return null;
    if (mime === 'image/png') {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return { width: w, height: h };
    }
    if (mime === 'image/gif') {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (mime === 'image/jpeg') {
      // Walk markers to find SOF for dimensions.
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) { offset += 1; continue; }
        const marker = buf[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          return { width, height };
        }
        const len = buf.readUInt16BE(offset + 2);
        if (len < 2) break;
        offset += 2 + len;
      }
      return null;
    }
    if (mime === 'image/webp') {
      // VP8 / VP8L / VP8X chunks carry sizes.
      const tag = buf.toString('latin1', 12, 16);
      if (tag === 'VP8 ' && buf.readUInt16LE(26) === 0x9d01) {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
      if (tag === 'VP8L') {
        const b0 = buf[21];
        const b1 = buf[22];
        const b2 = buf[23];
        const b3 = buf[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (tag === 'VP8X') {
        const w = buf.readUIntLE(24, 3) + 1;
        const h = buf.readUIntLE(27, 3) + 1;
        return { width: w, height: h };
      }
      return null;
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

export const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      fs.mkdirSync(config.storageDir, { recursive: true });
      cb(null, config.storageDir);
    },
    filename(req, file, cb) {
      // Safe random UUID + validated extension; never trust user filenames.
      const ext = EXT_FOR_MIME[file.mimetype] || '.bin';
      cb(null, crypto.randomUUID() + ext);
    },
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter(req, file, cb) {
    // Pre-filter by declared MIME, but final gate is magic-byte sniff in media route.
    if (!Object.prototype.hasOwnProperty.call(EXT_FOR_MIME, file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, GIF and WebP images are allowed.'));
    }
    return cb(null, true);
  },
}).single('file');

// Magic-byte validation of an already-written upload before it's kept.
export function validateImageSafe(req, file) {
  const safeName = path.basename(file.filename);
  const fullPath = path.join(config.storageDir, safeName);
  const fd = fs.openSync(fullPath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);
  const sniffed = sniffMime(buf);
  if (!sniffed) return { ok: false, reason: 'Invalid image file.' };
  const ext = path.extname(safeName).toLowerCase();
  if (EXT_FOR_MIME[sniffed] !== ext) {
    return { ok: false, reason: 'File content does not match its extension.' };
  }
  return { ok: true, mime: sniffed };
}

// Inserts media metadata and returns the id.
export async function saveMediaRecord(file, { uploadedBy, altText, ip }) {
  const safeName = path.basename(file.filename);
  const fullPath = path.join(config.storageDir, safeName);
  const size = fs.statSync(fullPath).size;
  const dims = readImageSize(fullPath);
  const storagePath = await persistMediaFile(file, file.mimetype);
  try {
    const info = db.prepare(`
    INSERT INTO media (storage_path, original_filename, safe_filename, mime_type, size_bytes, width, height, alt_text, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    storagePath,
    String(file.originalname || 'upload'),
    safeName,
    file.mimetype,
    size,
    dims?.width ?? null,
    dims?.height ?? null,
    altText || '',
    uploadedBy || null
  );
    return info.lastInsertRowid;
  } catch (error) {
    if (config.mediaStorage === 'supabase') {
      try { await removeMediaFile({ storage_path: storagePath, safe_filename: safeName }); } catch { /* Preserve insert error. */ }
    }
    throw error;
  } finally {
    if (config.mediaStorage === 'supabase') {
      try { await fs.promises.unlink(fullPath); } catch { /* Temporary file cleanup. */ }
    }
  }
}
