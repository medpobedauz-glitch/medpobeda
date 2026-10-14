// E2E check of the exact API flow the admin Questions page performs.
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
const login = await api('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@medpobeda.local', password: 'TestPass123' }) });
const token = login.body.csrfToken;
console.log('1. login:', login.status);
const h = { 'X-CSRF-Token': token };
let r = await api('/api/admin/questions/2/submit_review', { method: 'POST', headers: h, body: '{}' });
console.log('2. submit_review:', r.status, JSON.stringify(r.body));
r = await api('/api/admin/questions/2/publish', { method: 'POST', headers: h, body: JSON.stringify({ publish_lang: 'uz' }) });
console.log('3. publish:', r.status, JSON.stringify(r.body));
r = await api('/api/admin/questions');
const q = r.body.find((x) => x.id === 2);
console.log('4. question #2 status:', q.status, '| langs:', q.completeness.langs.map((l) => l.lang + ':' + l.complete).join(', '));
const pub = await fetch(BASE + '/api/public/learn/mb-test-curriculum');
const pubBody = await pub.json();
console.log('5. public curriculum questionCount:', pubBody.questionCount, '| subject questionCount:', pubBody.subjects[0].questionCount);