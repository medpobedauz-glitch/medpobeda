// Isolated HTTP integration: private object storage, uploads and restart recovery.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'medpobeda-cloud-'));
const key = crypto.randomBytes(32).toString('hex');
const password = crypto.randomBytes(24).toString('hex');
const objects = new Map();
let bucket = null;
let failUpload = false;
const storage = http.createServer(async (req, res) => {
  assert.equal(req.headers.apikey, key);
  assert.equal(req.headers.authorization, `Bearer ${key}`);
  const parts = req.url.split('/');
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  if (req.url === '/storage/v1/bucket/medpobeda-media') {
    res.writeHead(bucket ? 200 : 404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(bucket || {}));
  }
  if (req.url === '/storage/v1/bucket' && req.method === 'POST') {
    bucket = JSON.parse(body); assert.equal(bucket.public, false);
    return res.end('{}');
  }
  const name = parts[5];
  if (req.method === 'POST') {
    if (failUpload) { res.writeHead(503); return res.end('unavailable'); }
    objects.set(name, { body, mime: req.headers['content-type'] });
    return res.end('{}');
  }
  if (req.method === 'DELETE') {
    for (const filename of JSON.parse(body).prefixes) objects.delete(filename);
    return res.end('[]');
  }
  const object = objects.get(name);
  if (!object) { res.writeHead(404); return res.end('{}'); }
  res.setHeader('Content-Type', object.mime); res.setHeader('Content-Length', object.body.length);
  res.end(req.method === 'HEAD' ? undefined : object.body);
});
await new Promise(resolve => storage.listen(0, '127.0.0.1', resolve));
const env = { ...process.env, NODE_ENV: 'development', PORT: '14874', DATABASE_DRIVER: 'libsql',
  TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', EPHEMERAL_HOST: 'false',
  DATABASE_PATH: path.join(dir, 'test.sqlite'), STORAGE_DIR: path.join(dir, 'uploads'),
  PDF_IMPORT_DIR: path.join(dir, 'pdf'), PDF_IMPORT_ENABLED: 'false',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), COOKIE_SECURE: 'false',
  MEDIA_STORAGE: 'supabase', SUPABASE_URL: `http://127.0.0.1:${storage.address().port}`,
  SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_MEDIA_BUCKET: 'medpobeda-media',
  ADMIN_EMAIL: 'cloud-test@example.com', ADMIN_PASSWORD: password };
const base = 'http://127.0.0.1:14874';
let server, cookie = '', token = '';
let logs = '';
async function start() {
  server = spawn(process.execPath, ['server/app.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', data => { logs += data; }); server.stderr.on('data', data => { logs += data; });
  for (let n = 0; n < 100; n++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { if ((await fetch(base + '/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server startup timed out.');
}
async function stop() { if (server?.exitCode === null) { const ended = once(server, 'exit'); server.kill(); await ended; } }
async function request(route, options = {}) {
  return fetch(base + route, { ...options, headers: { Cookie: cookie, 'X-CSRF-Token': token, ...options.headers } });
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
function form(bytes = png) { const data = new FormData(); data.append('file', new Blob([bytes], { type: 'image/png' }), 'pixel.png'); return data; }
try {
  const unsafeHost = spawnSync(process.execPath, ['-e', "import('./server/config.js')"], {
    env: { ...env, EPHEMERAL_HOST: 'true' }, encoding: 'utf8',
  });
  assert.notEqual(unsafeHost.status, 0, 'An ephemeral host must reject a local database');
  const wrongDriver = spawnSync(process.execPath, ['-e', "import('./server/config.js')"], {
    env: { ...env, DATABASE_DRIVER: 'sqlite', TURSO_DATABASE_URL: 'libsql://example.invalid', TURSO_AUTH_TOKEN: 'test' }, encoding: 'utf8',
  });
  assert.notEqual(wrongDriver.status, 0, 'A Turso URL must never fall back to SQLite');
  const admin = spawnSync(process.execPath, ['scripts/create-admin.mjs'], { env, encoding: 'utf8' });
  assert.equal(admin.status, 0, admin.stderr);
  await start();
  const denied = await fetch(base + '/api/admin/media/upload', { method: 'POST', body: form() });
  assert.equal(denied.status, 401); assert.equal(objects.size, 0);
  const login = await request('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.ADMIN_EMAIL, password }) });
  assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0]; token = (await login.json()).csrfToken;
  assert.equal((await request('/api/admin/media/upload', { method: 'POST', body: form(), headers: { 'X-CSRF-Token': 'wrong' } })).status, 403);
  assert.equal((await request('/api/admin/media/upload', { method: 'POST', body: form(Buffer.from('fake image')) })).status, 400);
  const upload = await request('/api/admin/media/upload', { method: 'POST', body: form() });
  assert.equal(upload.status, 201, await upload.clone().text());
  const { id } = await upload.json();
  const media = await (await request('/api/admin/media/' + id)).json();
  assert.match(media.storage_path, /^supabase:\/\//); assert.equal(objects.size, 1);
  assert.equal(fs.readdirSync(env.STORAGE_DIR).length, 0);
  const served = await request('/media/' + media.safe_filename);
  assert.equal(served.status, 200); assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  const byId = await request('/api/public/media/' + id);
  assert.equal(byId.status, 200); assert.deepEqual(Buffer.from(await byId.arrayBuffer()), png);
  assert.equal((await request('/media/' + media.safe_filename, { method: 'HEAD' })).status, 200);
  await stop(); fs.rmSync(env.STORAGE_DIR, { recursive: true, force: true }); await start();
  assert.equal((await request('/api/admin/auth/me')).status, 200);
  assert.equal((await request('/media/' + media.safe_filename)).status, 200);
  assert.equal((await request('/api/admin/pdf-import')).status, 503);
  failUpload = true;
  assert.equal((await request('/api/admin/media/upload', { method: 'POST', body: form() })).status, 503);
  assert.equal(objects.size, 1); assert.equal(fs.readdirSync(env.STORAGE_DIR).length, 0);
  assert.equal((await (await request('/api/admin/media')).json()).length, 1);
  failUpload = false;
  assert.equal((await request(`/api/admin/media/${id}/delete`, { method: 'POST' })).status, 200);
  assert.equal(objects.size, 0); assert.equal((await request('/media/' + media.safe_filename)).status, 404);
  assert.ok(!logs.includes(key));
  console.log('PASS: private cloud storage, authenticated/CSRF uploads, invalid-image rejection, both media URLs, HEAD, restart recovery, failure cleanup and deletion.');
} finally {
  await stop(); await new Promise(resolve => storage.close(resolve)); fs.rmSync(dir, { recursive: true, force: true });
}
