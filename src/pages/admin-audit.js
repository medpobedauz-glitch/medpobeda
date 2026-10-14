// MedPobeda — Admin: audit log viewer.
// Shows every recorded admin action (login, create/update/delete, export…)
// with filters for entity type, action, and pagination.
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const state = { entityType: '', action: '', limit: 50, offset: 0, total: 0 };

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dateLabel(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T') + 'Z');
  if (isNaN(d)) return esc(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Pretty-print the JSON details column; falls back to raw text.
function detailsCell(raw) {
  if (!raw) return '—';
  try {
    const obj = JSON.parse(raw);
    const parts = Object.entries(obj).map(([k, v]) => esc(k) + ': ' + esc(v));
    return parts.length ? parts.join('<br>') : '—';
  } catch {
    return esc(raw);
  }
}

function actionBadge(action) {
  const danger = /delete|destroy/i.test(action);
  const warn = /update|edit/i.test(action);
  const cls = danger ? 'admin-badge--draft' : warn ? 'admin-badge--published' : '';
  return '<span class="admin-badge ' + cls + '">' + esc(action) + '</span>';
}

function rowHtml(a) {
  return (
    '<tr>' +
    '<td style="white-space:nowrap">' + dateLabel(a.created_at) + '</td>' +
    '<td>' + esc(a.user_name || ('#' + (a.user_id ?? '—'))) + '</td>' +
    '<td>' + actionBadge(a.action) + '</td>' +
    '<td>' + esc(a.entity_type || '—') + (a.entity_id != null ? ' #' + esc(a.entity_id) : '') + '</td>' +
    '<td>' + detailsCell(a.details) + '</td>' +
    '<td><small style="opacity:.65">' + esc(a.ip || '—') + '</small></td>' +
    '</tr>'
  );
}

function buildQuery() {
  const params = new URLSearchParams();
  if (state.entityType) params.set('entity_type', state.entityType);
  if (state.action) params.set('action', state.action);
  params.set('limit', String(state.limit));
  params.set('offset', String(state.offset));
  return params.toString();
}

async function loadLog() {
  const list = document.getElementById('al-list');
  const summary = document.getElementById('al-summary');
  list.innerHTML = '<p class="admin-empty">Loading…</p>';
  try {
    const res = await adminFetch('/api/admin/audit-log?' + buildQuery());
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      list.innerHTML = '<p class="admin-empty admin-empty--error">' + esc(d.error || 'Failed to load audit log.') + '</p>';
      return;
    }
    const data = await res.json();
    const rows = data.rows || [];
    state.total = data.total ?? 0;
    const from = state.total === 0 ? 0 : state.offset + 1;
    const to = state.offset + rows.length;
    summary.textContent = 'Showing ' + from + '–' + to + ' of ' + state.total + ' audit entries.';
    document.getElementById('al-prev').disabled = state.offset <= 0;
    document.getElementById('al-next').disabled = to >= state.total;
    if (!rows.length) {
      list.innerHTML = '<p class="admin-empty">No audit entries match the selected filters.</p>';
      return;
    }
    list.innerHTML =
      '<table class="admin-table"><thead><tr>' +
      '<th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th>' +
      '</tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table>';
  } catch {
    list.innerHTML = '<p class="admin-empty admin-empty--error">Network error while loading audit log.</p>';
  }
}

export function renderAdminAudit() {
  const entityOptions = ['user', 'student', 'curriculum', 'subject', 'module', 'topic', 'question']
    .map((e) => '<option value="' + e + '">' + e + '</option>').join('');
  const contentHtml =
    '<div class="admin-topbar"><h1>Audit Log</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<p class="admin-hint">Every recorded admin action — logins, content changes and data exports. Newest first.</p>' +
    '<form id="al-filter-form" style="display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0;">' +
    '<select class="form-input" id="al-entity" style="flex:0 1 180px;min-width:140px;">' +
    '<option value="">All entity types</option>' + entityOptions + '</select>' +
    '<input class="form-input" id="al-action" type="search" placeholder="Filter by action (e.g. login)…" style="flex:1 1 220px;min-width:0;" autocomplete="off">' +
    '<button class="btn btn--primary" type="submit">Apply</button>' +
    '<button class="btn" type="button" id="al-clear" hidden>Clear</button>' +
    '</form>' +
    '<p class="qbank-status" id="al-summary"></p>' +
    '<div id="al-list"><p class="admin-empty">Loading…</p></div>' +
    '<div style="display:flex;gap:.5rem;justify-content:center;margin:1rem 0;">' +
    '<button class="btn" type="button" id="al-prev" disabled>← Newer</button>' +
    '<button class="btn" type="button" id="al-next" disabled>Older →</button>' +
    '</div>';

  return adminPage('audit', contentHtml, () => {
    document.title = 'Audit Log — Admin — MedPobeda';
    initAuditPage();
  });
}

async function initAuditPage() {
  const user = await requireAdmin();
  if (!user) return;
  document.getElementById('admin-identity').textContent =
    (user.display_name || user.email) + ' · ' + user.role;

  const form = document.getElementById('al-filter-form');
  const entity = document.getElementById('al-entity');
  const action = document.getElementById('al-action');
  const clear = document.getElementById('al-clear');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.entityType = entity.value;
    state.action = action.value.trim();
    state.offset = 0;
    clear.hidden = !(state.entityType || state.action);
    loadLog();
  });
  clear.addEventListener('click', () => {
    entity.value = '';
    action.value = '';
    state.entityType = '';
    state.action = '';
    state.offset = 0;
    clear.hidden = true;
    loadLog();
  });
  document.getElementById('al-prev').addEventListener('click', () => {
    state.offset = Math.max(0, state.offset - state.limit);
    loadLog();
  });
  document.getElementById('al-next').addEventListener('click', () => {
    if (state.offset + state.limit < state.total) {
      state.offset += state.limit;
      loadLog();
    }
  });

  await loadLog();
}