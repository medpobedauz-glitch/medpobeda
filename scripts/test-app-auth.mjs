import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { createAppAuthClient } from '../server/services/app-auth-client.js';
import { createAppAuthRouter } from '../server/routes/app-auth.js';

const goodResponse = () => new Response(JSON.stringify({
  id: 7, email: 'test@example.com', firstName: 'Test', password: 'must-not-leak',
}), { headers: { authorization: 'opaque-encrypted-token' } });

test('Java login contract: opaque token header, email/password body, profile allowlist', async () => {
  let request;
  const client = createAppAuthClient({ now: () => 100,
    fetchImpl: async (url, options) => { request = { url, options }; return goodResponse(); },
  });
  const auth = await client.login('test@example.com', 'test-password');
  assert.equal(String(request.url), 'https://api.medpobeda.com/api/auth/login');
  assert.deepEqual(JSON.parse(request.options.body), { email: 'test@example.com', password: 'test-password' });
  assert.equal(request.options.redirect, 'error');
  assert.equal(auth.token, 'opaque-encrypted-token');
  assert.equal(auth.expiresAt, 21600100);
  assert.equal(auth.profile.id, '7');
  assert.equal(auth.profile.password, undefined);
});

test('reject upstream rejection, missing token/identity, malformed data and network errors', async () => {
  for (const response of [
    () => new Response('private backend error', { status: 401 }),
    () => new Response('{}', { headers: { authorization: 'token' } }),
    () => new Response('{"id":7}'),
    () => new Response('not-json', { headers: { authorization: 'token' } }),
    () => { throw new Error('secret-bearing connection error'); },
  ]) {
    const client = createAppAuthClient({ fetchImpl: async () => response() });
    await assert.rejects(client.login('test@example.com', 'password'), e =>
      [401, 502].includes(e.status) && !/private|secret-bearing/.test(e.message));
  }
});

test('reject origins that could redirect or expose credentials', () => {
  for (const baseUrl of ['http://api.medpobeda.com', 'https://user:pass@example.com', 'https://example.com/path']) {
    assert.throws(() => createAppAuthClient({ baseUrl }));
  }
});

test('real SQLite session persistence, isolation, CSRF, expiry, disabled mode', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'medpobeda-app-auth-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.sqlite');
  const { db } = await import('../server/db/index.js');
  const { SqliteSessionStore } = await import('../server/services/session-store.js');
  db.exec(`CREATE TABLE sessions (
    id TEXT PRIMARY KEY, user_id INTEGER, student_id INTEGER, csrf_token TEXT,
    ip TEXT, user_agent TEXT, expires_at TEXT, data TEXT
  )`);
  const app = express();
  let clock = 1000, calls = 0;
  app.use(express.json());
  app.use(session({ secret: 'test-only-secret', resave: false, saveUninitialized: false,
    store: new SqliteSessionStore(), cookie: { httpOnly: true, maxAge: 21600000 },
  }));
  app.use('/enabled', createAppAuthRouter({ enabled: true, origin: 'http://localhost:3000', now: () => clock,
    client: createAppAuthClient({ now: () => clock, fetchImpl: async () => { calls++; return goodResponse(); } }),
  }));
  app.use('/disabled', createAppAuthRouter());
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = (origin = 'http://localhost:3000') => fetch(base + '/enabled/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
  });
  try {
    assert.equal((await login('https://untrusted.example')).status, 403);
    assert.equal(calls, 0);
    assert.equal((await fetch(base + '/disabled/login', { method: 'POST' })).status, 503);
    assert.deepEqual(await (await fetch(base + '/disabled/status')).json(), {
      loginEnabled: false, qbankConnected: false, progressConnected: false,
    });
    const result = await login();
    assert.equal(result.status, 200);
    assert.match(result.headers.get('set-cookie'), /HttpOnly/);
    const cookie = result.headers.get('set-cookie').split(';')[0];
    const text = await result.text();
    assert.ok(!text.includes('opaque-encrypted-token') && !text.includes('must-not-leak'));
    const profile = JSON.parse(text);
    const row = db.prepare('SELECT * FROM sessions').get();
    assert.equal(row.student_id, null);
    assert.equal(JSON.parse(row.data).student, null);
    assert.equal(JSON.parse(row.data).appAuth.token, 'opaque-encrypted-token');
    const sessionResponse = await fetch(base + '/enabled/session', { headers: { cookie } });
    assert.equal(sessionResponse.status, 200);
    assert.equal((await sessionResponse.json()).profileSource, 'login-snapshot');
    assert.equal((await fetch(base + '/enabled/logout', { method: 'POST', headers: { cookie } })).status, 403);
    assert.equal((await fetch(base + '/enabled/logout', { method: 'POST',
      headers: { cookie, 'X-CSRF-Token': profile.csrfToken } })).status, 200);
    assert.equal((await fetch(base + '/enabled/session', { headers: { cookie } })).status, 401);
    const again = await login();
    const nextCookie = again.headers.get('set-cookie').split(';')[0];
    assert.notEqual(nextCookie, cookie);
    await again.json();
    clock += 21600001;
    assert.equal((await fetch(base + '/enabled/session', { headers: { cookie: nextCookie } })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
