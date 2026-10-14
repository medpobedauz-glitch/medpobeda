// E2E: curricula create/update/delete + CSRF behavior.
const BASE = 'http://127.0.0.1:4000';
let cookie = '';
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(BASE + path, { ...opts, headers });
  const setC = res.headers.get('set-cookie');
  if (setC) cookie = setC.split(';')[0];
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

const login = await api('/api/admin/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'admin@medpobeda.local', password: 'TestPass123' }),
});
const token = login.body.csrfToken;
console.log('1. login:', login.status);
const h = { 'X-CSRF-Token': token };

// The bug the user hit: empty/stale sessionStorage token → 403.
let r = await api('/api/admin/content/curricula', {
  method: 'POST', headers: { 'X-CSRF-Token': 'wrong-token' },
  body: JSON.stringify({ translations: { uz: { name: 'CSRF Test' } } }),
});
console.log('2. create with WRONG token (expect 403):', r.status);

r = await api('/api/admin/content/curricula', {
  method: 'POST', headers: h,
  body: JSON.stringify({
    status: 'published',
    translations: {
      uz: { name: 'CSRF Test Curr' },
      ru: { name: 'CSRF Тест' },
      en: { name: 'CSRF Test' },
    },
  }),
});
console.log('3. create with fresh token (expect 201):', r.status, JSON.stringify(r.body));
const id = r.body.id;

// Simulate the /me token sync that requireAdmin() now does.
r = await api('/api/admin/auth/me');
console.log('4. /me token matches login token:', r.body?.csrfToken === token);

r = await api('/api/admin/content/curricula/' + id, {
  method: 'PUT', headers: h,
  body: JSON.stringify({
    status: 'draft',
    translations: {
      uz: { name: 'CSRF Test Curr (edited)' },
      ru: { name: 'CSRF Тест (изм.)' },
      en: { name: 'CSRF Test (edited)' },
    },
  }),
});
console.log('5. update (PUT, expect 200):', r.status, JSON.stringify(r.body));

r = await api('/api/admin/content/curricula/' + id);
console.log('6. verify update persisted:', r.body?.status, '|', r.body?.translations?.uz?.name);

r = await api('/api/admin/content/curricula/1', { method: 'DELETE', headers: h });
console.log('7. delete curriculum with subjects (expect 400 guard):', r.status, r.body?.error);

r = await api('/api/admin/content/curricula/' + id, { method: 'DELETE', headers: h });
console.log('8. delete empty curriculum (expect 200):', r.status, JSON.stringify(r.body));

r = await api('/api/admin/content/curricula/' + id);
console.log('9. get deleted (expect 404):', r.status);