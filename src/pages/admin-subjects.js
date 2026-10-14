// MedPobeda — Admin: subjects CRUD (faculty → subjects).
// One screen: pick the curriculum(s)/faculty the subject belongs to, give it
// names in Uzbek / Russian / English (auto-translate helper included), and
// manage status. Edit and Delete work from the table below.
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const state = { editing: null, curricula: [] };

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusBadge(status) {
  return '<span class="admin-badge admin-badge--' + esc(status) + '">' + esc(status) + '</span>';
}

function curriculaChips(subjectsCurricula) {
  if (!subjectsCurricula || !subjectsCurricula.length) return '<span style="color:#999">—</span>';
  return subjectsCurricula.map((c) => {
    const name = c.translations?.uz?.name || c.slug;
    return '<span class="admin-badge admin-badge--draft" style="margin-right:.25rem">' + esc(name) + '</span>';
  }).join('');
}

function rowHtml(s) {
  const name = s.translations?.uz?.name || s.slug;
  return (
    '<tr>' +
    '<td><strong>' + esc(name) + '</strong><br><small>' + esc(s.slug) + '</small></td>' +
    '<td>' + curriculaChips(s.curricula) + '</td>' +
    '<td>' + (s.moduleCount ?? 0) + '</td>' +
    '<td>' + (s.questionCount ?? 0) + '</td>' +
    '<td>' + statusBadge(s.status) + '</td>' +
    '<td>' + (s.display_order ?? 0) + '</td>' +
    '<td>' +
    '<button type="button" class="btn" data-edit="' + s.id + '" style="padding:.25rem .7rem;font-size:.8rem;margin-right:.35rem">Edit</button>' +
    '<button type="button" class="btn" data-delete="' + s.id + '" data-name="' + esc(name) + '" style="padding:.25rem .7rem;font-size:.8rem">Delete</button>' +
    '</td>' +
    '</tr>'
  );
}

function setFormValues(s) {
  const tr = s?.translations || {};
  document.getElementById('sb-name-uz').value = tr.uz?.name || '';
  document.getElementById('sb-name-ru').value = tr.ru?.name || '';
  document.getElementById('sb-name-en').value = tr.en?.name || '';
  document.getElementById('sb-slug').value = s?.slug || '';
  document.getElementById('sb-status').value = s?.status || 'draft';
  document.getElementById('sb-order').value = String(s?.display_order ?? 0);
  const selected = new Set((s?.curricula || []).map((c) => c.id));
  state.curricula.forEach((c) => {
    const el = document.getElementById('sb-cur-' + c.id);
    if (el) el.checked = selected.has(c.id);
  });
}

function resetFormMode() {
  state.editing = null;
  document.getElementById('cu-form-title').textContent = 'Create new subject';
  document.getElementById('subject-submit').textContent = 'Create subject';
  document.getElementById('subject-cancel').style.display = 'none';
}

function flashForm(msg) {
  const el = document.getElementById('subject-error');
  el.textContent = msg;
  el.style.display = 'block';
}

export function renderAdminSubjects() {
  const contentHtml =
    '<div class="admin-topbar"><h1>Subjects</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<div id="subjects-list"><p class="admin-empty">Loading…</p></div>' +
    '<div class="admin-section-title" id="cu-form-title">Create new subject</div>' +
    '<form id="subject-form" novalidate>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="sb-name-uz">Name (Uzbek) *</label>' +
    '<input class="form-input" id="sb-name-uz" required></div>' +
    '<div class="form-field"><label class="form-label" for="sb-name-ru">Name (Russian)</label>' +
    '<input class="form-input" id="sb-name-ru"></div>' +
    '<div class="form-field"><label class="form-label" for="sb-name-en">Name (English)</label>' +
    '<input class="form-input" id="sb-name-en"></div>' +
    '</div>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="sb-slug">Slug (optional)</label>' +
    '<input class="form-input" id="sb-slug" placeholder="auto from name"></div>' +
    '<div class="form-field"><label class="form-label" for="sb-status">Status</label>' +
    '<select class="form-input" id="sb-status"><option value="draft">draft</option><option value="published">published</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="sb-order">Display order</label>' +
    '<input class="form-input" id="sb-order" type="number" value="0"></div>' +
    '</div>' +
    '<div class="form-field" id="sb-curricula-field"><label class="form-label">Belongs to faculty (curricula)</label>' +
    '<div id="sb-curricula"></div></div>' +
    '<p id="subject-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary" type="submit" id="subject-submit">Create subject</button>' +
    '<button class="btn" type="button" id="sb-translate" style="margin-left:.5rem" title="Fill the other two name fields automatically">🌐 Auto-translate names</button>' +
    '<button class="btn" type="button" id="subject-cancel" style="display:none;margin-left:.5rem">Cancel edit</button>' +
    '</form>';

  return adminPage('subjects', contentHtml, () => {
    document.title = 'Subjects — Admin — MedPobeda';
    initSubjectsPage();
  });
}
function initSubjectsPage() {
  (async () => {
    const user = await requireAdmin();
    if (!user) return;
    document.getElementById('admin-identity').textContent =
      (user.display_name || user.email) + ' · ' + user.role;
    const errorEl = document.getElementById('subject-error');
    const submitBtn = document.getElementById('subject-submit');
    const cancelBtn = document.getElementById('subject-cancel');
    const listEl = document.getElementById('subjects-list');

    // Load curricula for the faculty checkboxes + the subject list.
    const [curRes, subRes] = await Promise.all([
      adminFetch('/api/admin/content/curricula'),
      adminFetch('/api/admin/content/subjects'),
    ]);
    state.curricula = curRes.ok ? await curRes.json() : [];
    let rows = subRes.ok ? await subRes.json() : [];

    document.getElementById('sb-curricula').innerHTML = state.curricula.length
      ? state.curricula.map((c) => {
          const name = c.translations?.uz?.name || c.slug;
          return '<label style="display:inline-flex;align-items:center;gap:.35rem;margin:.15rem .4rem;font-size:.85rem">' +
            '<input type="checkbox" id="sb-cur-' + c.id + '" value="' + c.id + '"> ' + esc(name) +
            ' <small>(' + c.status + ')</small></label>';
        }).join('')
      : '<p class="admin-empty">No curricula yet — create one on the Curricula page first.</p>';

    async function loadList() {
      const res = await adminFetch('/api/admin/content/subjects');
      const data = res.ok ? await res.json() : [];
      rows = data;
      if (!data.length) { listEl.innerHTML = '<p class="admin-empty">No subjects yet — use the form below to create one.</p>'; return; }
      listEl.innerHTML =
        '<table class="admin-table"><thead><tr>' +
        '<th>Name</th><th>Faculty</th><th>Modules</th><th>Questions</th><th>Status</th><th>Order</th><th>Actions</th>' +
        '</tr></thead><tbody>' + data.map(rowHtml).join('') + '</tbody></table>';
      listEl.querySelectorAll('[data-edit]').forEach((b) =>
        b.addEventListener('click', () => startEdit(Number(b.dataset.edit))));
      listEl.querySelectorAll('[data-delete]').forEach((b) =>
        b.addEventListener('click', () => remove(Number(b.dataset.delete), b.dataset.name)));
    }

    function startEdit(id) {
      const s = rows.find((r) => r.id === id);
      if (!s) return;
      state.editing = id;
      setFormValues(s);
      document.getElementById('cu-form-title').textContent = 'Edit subject #' + id;
      submitBtn.textContent = 'Update subject';
      cancelBtn.style.display = '';
      errorEl.style.display = 'none';
    }

    function resetForm() {
      resetFormMode();
      setFormValues({});
    }

    async function remove(id, name) {
      if (!window.confirm('Delete subject "' + name + '"? This cannot be undone.')) return;
      const res = await adminFetch('/api/admin/content/subjects/' + id, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Delete failed (' + res.status + ').'); return; }
      await loadList();
    }

    cancelBtn.addEventListener('click', resetForm);

    // 🌐 Auto-translate names (any one name → other two).
    document.getElementById('sb-translate').addEventListener('click', async () => {
      const uz = document.getElementById('sb-name-uz').value.trim();
      const ru = document.getElementById('sb-name-ru').value.trim();
      const en = document.getElementById('sb-name-en').value.trim();
      let source = null; let text = '';
      if (uz) { source = 'uz'; text = uz; }
      else if (en) { source = 'en'; text = en; }
      else if (ru) { source = 'ru'; text = ru; }
      if (!source) { flashForm('Type a name in any language first, then click Auto-translate.'); return; }
      const tBtn = document.getElementById('sb-translate');
      tBtn.disabled = true;
      try {
        for (const target of ['uz', 'ru', 'en']) {
          if (target === source) continue;
          const res = await adminFetch('/api/admin/translate', {
            method: 'POST',
            body: JSON.stringify({ texts: [text], source, target }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { flashForm(data.error || 'Translation failed.'); continue; }
          const t = (data.translations || [])[0];
          if (typeof t === 'string' && t) document.getElementById('sb-name-' + target).value = t;
        }
        errorEl.style.display = 'none';
      } finally { tBtn.disabled = false; }
    });

    document.getElementById('subject-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const nameUz = document.getElementById('sb-name-uz').value.trim();
      if (!nameUz) { flashForm('Uzbek name is required.'); return; }
      const isEdit = state.editing !== null;
      const curricula_ids = [];
      state.curricula.forEach((c) => {
        const el = document.getElementById('sb-cur-' + c.id);
        if (el && el.checked) curricula_ids.push(c.id);
      });
      const payload = {
        slug: document.getElementById('sb-slug').value.trim() || undefined,
        status: document.getElementById('sb-status').value,
        display_order: Number(document.getElementById('sb-order').value) || 0,
        translations: {
          uz: { name: nameUz },
          ru: { name: document.getElementById('sb-name-ru').value.trim() },
          en: { name: document.getElementById('sb-name-en').value.trim() },
        },
      };
      if (curricula_ids.length) payload.curricula_ids = curricula_ids;
      submitBtn.disabled = true;
      try {
        const res = await adminFetch('/api/admin/content/subjects' + (isEdit ? '/' + state.editing : ''), {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { flashForm(data.error || 'Save failed (' + res.status + ').'); return; }
        resetForm();
        await loadList();
      } catch { flashForm('Network error.'); }
      finally { submitBtn.disabled = false; }
    });

    await loadList();
    resetForm();
  })();
}