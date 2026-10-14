// E2E check of the public student auth flow (register → me → logout → login).
const BASE = 'http://127.0.0.1:4000';
const uniq = Date.now().toString().slice(-6);
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

let r = await api('/api/public/learn');
console.log('1. curricula list:', r.status, JSON.stringify(r.body.curricula));

r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    full_name: 'Ali Valiyev',
    contact: 'ali.valiyev.' + uniq + '@example.com',
    password: 'studentPass1',
    curriculum_id: r.body.curricula[0]?.id ?? 1,
    preferred_lang: 'uz',
  }),
});
console.log('2. register:', r.status, JSON.stringify(r.body));
const csrf = r.body?.csrfToken;

r = await api('/api/auth/me');
console.log('3. me:', r.status, r.body?.student?.full_name);

r = await api('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrf } });
console.log('4. logout:', r.status, JSON.stringify(r.body));

r = await api('/api/auth/me');
console.log('5. me after logout (expect 401):', r.status);

r = await api('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ contact: 'ali.valiyev.' + uniq + '@example.com', password: 'studentPass1' }),
});
console.log('6. login:', r.status, r.body?.student?.full_name, '| csrf:', Boolean(r.body?.csrfToken));

r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ full_name: 'Dup', contact: 'ali.valiyev.' + uniq + '@example.com', password: 'studentPass1' }),
});
console.log('7. duplicate register (expect 409):', r.status);

r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ full_name: 'Bad', contact: 'not-a-contact', password: 'studentPass1' }),
});
console.log('8. invalid contact (expect 400):', r.status, r.body?.error);

// Phone registration path.
const phone = '+998 90 ' + uniq.slice(0, 2) + ' ' + uniq.slice(2, 4) + ' ' + uniq.slice(4, 6);
const phoneDigits = '+99890' + uniq;
r = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ full_name: 'Phone User', contact: phone, password: 'phonePass12' }),
});
console.log('9. phone register:', r.status, r.body?.student?.contact_type, r.body?.student?.contact);

// Wrong password (expect 401) then login by phone (expect 200).
r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ contact: phoneDigits, password: 'wrongpass1' }) });
console.log('10. wrong password (expect 401):', r.status);
r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ contact: phone, password: 'phonePass12' }) });
console.log('11. login by phone:', r.status, r.body?.student?.full_name);