// MedPobeda — Admin: registered students (public users) viewer.
// Lists everyone who registered on the public site (students table), with
// search by name/contact, status, curriculum and registration date.
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const LANGS = [
  { code: '', label: 'All' },
  { code: 'uz', label: '🇺🇿 Uzbek' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ru', label: '🇷🇺 Russian' },
];

const state = { role: '', q: '', lang: '', curriculum: '' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusBadge(status) {
  return '<span class="admin-badge admin-badge--' + (status === 'active' ? 'published' : 'draft') + '">' + esc(status) + '</span>';
}

function contactLabel(s) {
  const icon = s.contact_type === 'phone' ? '📱' : '✉️';
  return icon + ' ' + esc(s.contact);
}

function dateLabel(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T') + 'Z');
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function rowHtml(s) {
  const curriculum = s.curriculum_slug
    ? '<span class="admin-badge admin-badge--draft">' + esc(s.curriculum_slug) + '</span>'
    : '—';
  return (
    '<tr>' +
    '<td><strong>' + esc(s.full_name) + '</strong><br><small style="opacity:.65">ID: ' + s.id + '</small></td>' +
    '<td>' + contactLabel(s) + '</td>' +
    '<td>' + (s.preferred_lang || 'uz').toUpperCase() + '</td>' +
    '<td>' + curriculum + '</td>' +
    '<td>' + (s.progress_count ?? 0) + '</td>' +
    '<td>' + statusBadge(s.status) + '</td>' +
    '<td>' + dateLabel(s.created_at) + '</td>' +
    '</tr>'
  );
}

async function loadStudents() {
  const list = document.getElementById('su-list');
  const summary = document.getElementById('su-summary');
  list.innerHTML = '<p class="admin-empty">Loading…</p>';
  const q = (state.q || '').trim();
  const lang = state.lang || '';
  const curriculum = state.curriculum || '';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (lang) params.set('lang', lang);
  if (curriculum) params.set('curriculum', curriculum);
  const qs = params.toString();
  const url = '/api/admin/students' + (qs ? '?' + qs : '');
  try {
    const res = await adminFetch(url);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      list.innerHTML = '<p class="admin-empty admin-empty--error">' + esc(d.error || 'Failed to load students.') + '</p>';
      return;
    }
    const data = await res.json();
    const rows = data.rows || [];
    // Keep the curriculum dropdown options in sync (only once / on change).
    syncCurriculumOptions(data.curriculums || []);
    const langLabel = LANGS.find((l) => l.code === lang)?.label || 'all languages';
    const curLabel = curriculum ? curriculum : 'all curriculums';
    summary.textContent = 'Showing ' + rows.length + ' of ' + (data.total ?? 0) + ' registered students (' + langLabel + ' · ' + curLabel + (q ? ', search: "' + q + '"' : '') + ')';
    if (!rows.length) {
      list.innerHTML = '<p class="admin-empty">' + (q
        ? 'No students match "' + esc(q) + '"'
        : 'No students registered yet') + (lang || curriculum ? ' for the selected filters' : '') + '.</p>';
      return;
    }
    list.innerHTML =
      '<table class="admin-table"><thead><tr>' +
      '<th>Name</th><th>Contact</th><th>Lang</th><th>Curriculum</th><th>Practice runs</th><th>Status</th><th>Registered</th>' +
      '</tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table>';
  } catch {
    list.innerHTML = '<p class="admin-empty admin-empty--error">Network error while loading students.</p>';
  }
}

function syncCurriculumOptions(curriculums) {
  const select = document.getElementById('su-curriculum');
  if (!select) return;
  const current = state.curriculum || '';
  const options = ['<option value="">All curriculums</option>']
    .concat(curriculums.map((c) =>
      '<option value="' + esc(c.value) + '"' + (c.value === current ? ' selected' : '') + '>' + esc(c.label) + '</option>'
    ));
  select.innerHTML = options.join('');
  select.value = current;
}

export function renderAdminUsers() {
  const langButtons = LANGS.map((l) =>
    '<button type="button" class="btn su-lang-btn' + (l.code === '' ? ' btn--primary' : '') + '" data-lang="' + l.code + '">' +
    esc(l.label) + '</button>'
  ).join('');
  const contentHtml =
    '<div class="admin-topbar"><h1>Users</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<p class="admin-hint">Registered students from the public site. ' +
    'Filter by language, search by name/contact, and export to Excel.</p>' +
    '<div class="su-filters" style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:.75rem 0;">' +
    '<span style="font-size:.85rem;opacity:.7;">Language:</span>' + langButtons +
    '<span style="font-size:.85rem;opacity:.7;margin-left:.5rem;">Curriculum:</span>' +
    '<select class="form-input" id="su-curriculum" style="flex:0 1 200px;min-width:140px;"><option value="">All curriculums</option></select></div>' +
    '<form id="su-search-form" style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0;">' +
    '<input class="form-input" id="su-search" type="search" placeholder="Search by name or contact…" style="flex:1 1 220px;min-width:0;" autocomplete="off">' +
    '<button class="btn btn--primary" type="submit">Search</button>' +
    '<button class="btn" type="button" id="su-clear" hidden>Clear</button>' +
    '<button class="btn" type="button" id="su-export" title="Download current list as Excel (CSV)">⬇ Export Excel</button>' +
    '</form>' +
    '<p class="qbank-status" id="su-summary"></p>' +
    '<div id="su-list"><p class="admin-empty">Loading…</p></div>';

  return adminPage('users', contentHtml, () => {
    document.title = 'Users — Admin — MedPobeda';
    initUsersPage();
  });
}

async function initUsersPage() {
  const user = await requireAdmin();
  if (!user) return;
  state.role = user.role;
  document.getElementById('admin-identity').textContent =
    (user.display_name || user.email) + ' · ' + user.role;

  const form = document.getElementById('su-search-form');
  const input = document.getElementById('su-search');
  const clear = document.getElementById('su-clear');
  const exportBtn = document.getElementById('su-export');
  const langBar = document.querySelector('.su-filters');
  const curriculumSelect = document.getElementById('su-curriculum');

  const exportUrl = () => {
    const params = new URLSearchParams();
    if (state.q.trim()) params.set('q', state.q.trim());
    if (state.lang) params.set('lang', state.lang);
    if (state.curriculum) params.set('curriculum', state.curriculum);
    const qs = params.toString();
    return '/api/admin/students/export' + (qs ? '?' + qs : '');
  };

  curriculumSelect.addEventListener('change', () => {
    state.curriculum = curriculumSelect.value;
    loadStudents();
  });

  langBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.su-lang-btn');
    if (!btn) return;
    state.lang = btn.dataset.lang || '';
    langBar.querySelectorAll('.su-lang-btn').forEach((b) => {
      b.classList.toggle('btn--primary', b === btn);
    });
    loadStudents();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.q = input.value;
    loadStudents();
    clear.hidden = !input.value.trim();
  });
  input.addEventListener('input', () => {
    clear.hidden = !input.value.trim();
    if (!input.value.trim()) {
      state.q = '';
      loadStudents();
    }
  });
  clear.addEventListener('click', () => {
    input.value = '';
    clear.hidden = true;
    state.q = '';
    loadStudents();
    input.focus();
  });
  exportBtn.addEventListener('click', () => {
    window.location.href = exportUrl();
  });

  await loadStudents();
}