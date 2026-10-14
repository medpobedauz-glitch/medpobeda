// Seeds realistic sample curricula through the admin API (idempotent by slug).
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
if (login.status !== 200) { console.error('login failed', login.status); process.exit(1); }
const csrf = login.body.csrfToken;

const samples = [
  {
    slug: 'asosiy-tibbiy-fanlar',
    display_order: 1,
    translations: {
      uz: { name: 'Asosiy tibbiy fanlar', short_desc: '1-kurs: anatomiya, gistologiya va fiziologiya asoslari.' },
      ru: { name: 'Основные медицинские дисциплины', short_desc: '1 курс: основы анатомии, гистологии и физиологии.' },
      en: { name: 'Core Medical Sciences', short_desc: 'Year 1: foundations of anatomy, histology and physiology.' },
    },
  },
  {
    slug: 'klinik-fanlar',
    display_order: 2,
    translations: {
      uz: { name: 'Klinik fanlar', short_desc: 'Propedevtika, terapiya va jarrohlik klinik tsikllari.' },
      ru: { name: 'Клинические дисциплины', short_desc: 'Клинические циклы пропедевтики, терапии и хирургии.' },
      en: { name: 'Clinical Disciplines', short_desc: 'Clinical cycles of propaedeutics, internal medicine and surgery.' },
    },
  },
  {
    slug: 'milliy-sertifikat',
    display_order: 3,
    translations: {
      uz: { name: 'Milliy sertifikatga tayyorgarlik', short_desc: 'Test bazasi va imtihon mashqlari bilan to‘liq kurs.' },
      ru: { name: 'Подготовка к национальному сертификату', short_desc: 'Полный курс с тестовой базой и тренировочными экзаменами.' },
      en: { name: 'National Certificate Preparation', short_desc: 'Full course with question bank and mock exams.' },
    },
  },
  {
    slug: 'ordinatura-tayyorgarlik',
    display_order: 4,
    translations: {
      uz: { name: 'Ordinaturaga tayyorgarlik', short_desc: 'Mutaxassislik bo‘yicha chuqurlashtirilgan kurslar.' },
      ru: { name: 'Подготовка к ординатуре', short_desc: 'Углублённые курсы по специальностям.' },
      en: { name: 'Residency Preparation', short_desc: 'Advanced specialty-specific courses.' },
    },
  },
];

const existing = await api('/api/admin/content/curricula');
const existingSlugs = new Set((existing.body || []).map((c) => c.slug));

for (const s of samples) {
  if (existingSlugs.has(s.slug)) {
    console.log('skip (exists):', s.slug);
    continue;
  }
  const r = await api('/api/admin/content/curricula', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
    body: JSON.stringify({ ...s, status: 'published' }),
  });
  console.log(r.status === 201 ? 'created:' : 'FAILED:', s.slug, r.status, JSON.stringify(r.body));
}

const after = await api('/api/admin/content/curricula');
console.log('total curricula now:', (after.body || []).length, '|', (after.body || []).map((c) => c.slug).join(', '));