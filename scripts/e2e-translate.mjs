// E2E: admin auto-translate endpoint (en → uz, en → ru).
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
const h = { 'X-CSRF-Token': login.body.csrfToken };
console.log('1. login:', login.status);

const texts = [
  'How many chambers does the human heart have?',
  'The heart has four chambers.',
  'Atrium', 'Ventricle', 'Aorta', 'Pulmonary artery',
];
let r = await api('/api/admin/translate', { method: 'POST', headers: h, body: JSON.stringify({ texts, source: 'en', target: 'uz' }) });
console.log('2. en→uz:', r.status, JSON.stringify(r.body.translations));

r = await api('/api/admin/translate', { method: 'POST', headers: h, body: JSON.stringify({ texts, source: 'en', target: 'ru' }) });
console.log('3. en→ru:', r.status, JSON.stringify(r.body.translations));

r = await api('/api/admin/translate', { method: 'POST', headers: h, body: JSON.stringify({ texts: ['x'], source: 'uz', target: 'en' }) });
console.log('4. uz→en roundtrip:', r.status, JSON.stringify(r.body.translations));

r = await api('/api/admin/translate', { method: 'POST', headers: h, body: JSON.stringify({ texts: ['x'], source: 'en', target: 'en' }) });
console.log('5. same pair (expect 400):', r.status);

r = await api('/api/admin/translate', { method: 'POST', body: JSON.stringify({ texts: ['x'], source: 'en', target: 'uz' }) });
console.log('6. no CSRF (expect 403):', r.status);