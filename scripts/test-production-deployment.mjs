import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { once } from 'node:events';

const dir = mkdtempSync(path.join(tmpdir(), 'medpobeda-production-'));
const port = 14873;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'production', PORT: String(port),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'), COOKIE_SECURE: 'true', TRUST_PROXY_HOPS: '1',
  DATABASE_PATH: path.join(dir, 'test.sqlite'), STORAGE_DIR: path.join(dir, 'uploads'),
  PDF_IMPORT_DIR: path.join(dir, 'pdf'), ADMIN_EMAIL: 'deployment-test@example.com',
  ADMIN_PASSWORD: crypto.randomBytes(24).toString('hex') };
let server;
async function start() {
  server = spawn(process.execPath, ['server/app.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  server.stdout.on('data', b => { output += b; });
  server.stderr.on('data', b => { output += b; });
  for (let n = 0; n < 100; n++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Startup timed out: ${output}`);
}
async function stop() {
  if (server && server.exitCode === null) { const ended = once(server, 'exit'); server.kill('SIGTERM'); await ended; }
}
try {
  const weak = spawnSync(process.execPath, ['-e', "import('./server/config.js')"], { env: { ...env, SESSION_SECRET: 'weak' }, encoding: 'utf8' });
  assert.notEqual(weak.status, 0, 'Weak production session secrets must be rejected');
  const admin = spawnSync(process.execPath, ['scripts/create-admin.mjs'], { env, encoding: 'utf8' });
  assert.equal(admin.status, 0, admin.stderr);
  const duplicate = spawnSync(process.execPath, ['scripts/create-admin.mjs'], { env, encoding: 'utf8' });
  assert.notEqual(duplicate.status, 0, 'Existing admin must not be overwritten');
  await start();
  const health = await fetch(`${base}/health`);
  assert.equal(health.headers.get('set-cookie'), null);
  assert.equal((await fetch(`${base}/en/login`)).status, 200);
  const login = await fetch(`${base}/api/admin/auth/login`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
    body: JSON.stringify({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /Secure/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
  const headers = { Cookie: cookie.split(';')[0], 'X-Forwarded-Proto': 'https' };
  assert.equal((await fetch(`${base}/api/admin/auth/me`, { headers })).status, 200);
  await stop(); await start();
  assert.equal((await fetch(`${base}/api/admin/auth/me`, { headers })).status, 200, 'SQLite sessions survive restart');
  assert.equal((await fetch(`${base}/api/not-a-route`)).status, 404);
  console.log('PASS: production startup, secret validation, admin bootstrap, HTTPS cookies, SPA and persistent sessions.');
} finally { await stop(); rmSync(dir, { recursive: true, force: true }); }
