// Private Supabase bucket; credentials never leave the backend.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';

function objectName(name) {
  if (!/^[a-zA-Z0-9_-]+\.(png|jpg|gif|webp)$/.test(name)) throw new Error('Invalid media filename.');
  return encodeURIComponent(name);
}

async function storageRequest(route, options = {}) {
  try {
    return await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/storage/v1${route}`, {
      ...options,
      headers: { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}`, ...options.headers },
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw Object.assign(new Error('File storage is temporarily unavailable.'), { status: 503 });
  }
}

function checked(response) {
  if (!response.ok) throw Object.assign(new Error('File storage request failed.'), { status: 503 });
  return response;
}

export async function ensureMediaBucket() {
  if (config.mediaStorage !== 'supabase') return;
  const existing = await storageRequest(`/bucket/${config.mediaBucket}`);
  if (existing.ok) {
    const bucket = await existing.json();
    if (bucket.public) throw new Error('The media bucket must be private.');
    return;
  }
  if (![400, 404].includes(existing.status)) checked(existing);
  checked(await storageRequest('/bucket', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: config.mediaBucket, name: config.mediaBucket, public: false,
      file_size_limit: config.maxUploadMb * 1024 * 1024,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] }),
  }));
}

export async function persistMediaFile(file, mime) {
  if (config.mediaStorage === 'local') return file.path;
  const name = objectName(file.filename);
  checked(await storageRequest(`/object/${config.mediaBucket}/${name}`, {
    method: 'POST', headers: { 'Content-Type': mime, 'x-upsert': 'false' },
    body: await fs.promises.readFile(file.path),
  }));
  return `supabase://${config.mediaBucket}/${file.filename}`;
}

export async function removeMediaFile(media) {
  if (!media.storage_path.startsWith('supabase://')) {
    try { await fs.promises.unlink(media.storage_path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return;
  }
  if (media.storage_path !== `supabase://${config.mediaBucket}/${media.safe_filename}`) throw new Error('Invalid media storage location.');
  checked(await storageRequest(`/object/${config.mediaBucket}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [media.safe_filename] }),
  }));
}

export async function sendMediaFile(media, req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(media.mime_type);
  if (!media.storage_path.startsWith('supabase://')) return res.sendFile(path.resolve(media.storage_path));
  if (media.storage_path !== `supabase://${config.mediaBucket}/${media.safe_filename}`) throw new Error('Invalid media storage location.');
  const response = await storageRequest(`/object/${config.mediaBucket}/${objectName(media.safe_filename)}`, { method: req.method === 'HEAD' ? 'HEAD' : 'GET' });
  if (response.status === 404 || response.status === 400) return res.sendStatus(404);
  checked(response);
  const size = response.headers.get('content-length');
  if (size) res.setHeader('Content-Length', size);
  if (req.method === 'HEAD') return res.end();
  await pipeline(Readable.fromWeb(response.body), res);
}
