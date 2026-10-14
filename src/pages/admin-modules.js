// MedPobeda — Admin: modules CRUD (subject → modules).
// Pick the subject the module belongs to, give names in UZ/RU/EN (with the
// auto-translate helper), then create / edit / change status. No Delete: the
// server has no module delete endpoint (children protected by design).
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const state = { editing: null, subjects: [], subjectId: '', role: '' };

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusBadge(status) {
  return '<span class="admin-badge admin-badge--' + esc(status) + '">' + esc(status) + '</span>';
}

function subjectLabel(s) {
  const name = s.translations?.uz?.name || s.slug;
  const fac = (s.curricula || []).map((c) => c.translations?.uz?.name || c.slug).join(', ');
  return name + (fac ? ' — ' + fac : '');
}

function rowHtml(m) {
  const name = m.translations?.uz?.name || m.slug;
  const canPub = state.role === 'super_admin' || state.role === 'reviewer';
  const statusBtn = canPub
    ? (m.status === 'published'
        ? '<button class="btn" data-status="draft" data-id="' + m.id + '" style="padding:.25rem .7rem;font-size:.8rem">Unpublish</button>'
        : '<button class="btn" data-status="published" data-id="' + m.id + '" style="padding:.25rem .7rem;font-size:.8rem">Publish</button>')
    : '';
  return (
    '<tr>' +
    '<td><strong>' + esc(name) + '</strong><br><small>' + esc(m.slug) + '</small></td>' +
    '<td>' + subjectLabel(state.subjects.find((s) => s.id === m.subject_id) || {}) + '</td>' +
    '<td>' + (m.topicCount ?? 0) + '</td>' +
    '<td>' + (m.questionCount ?? 0) + '</td>' +
    '<td>' + statusBadge(m.status) + '</td>' +
    '<td>' + (m.display_order ?? 0) + '</td>' +
    '<td>' +
    '<button class="btn" data-edit="' + m.id + '" style="padding:.25rem .7rem;font-size:.8rem;margin-right:.35rem">Edit</button>' +
    statusBtn +
    '</td>' +
    '</tr>'
  );
}

function setFormValues(m) {
  const tr = m?.translations || {};
  document.getElementById('md-name-uz').value = tr.uz?.name || '';
  document.getElementById('md-name-ru').value = tr.ru?.name || '';
  document.getElementById('md-name-en').value = tr.en?.name || '';
  document.getElementById('md-slug').value = m?.slug || '';
  document.getElementById('md-status').value = m?.status || 'draft';
  document.getElementById('md-order').value = String(m?.display_order ?? 0);
}

function resetFormMode() {
  state.editing = null;
  document.getElementById('md-form-title').textContent = 'Create new module';
  document.getElementById('md-submit').textContent = 'Create module';
  document.getElementById('md-cancel').style.display = 'none';
}

function flashForm(msg) {
  const el = document.getElementById('md-error');
  el.textContent = msg;
  el.style.display = 'block';
}

export function renderAdminModules() {
  const contentHtml =
    '<div class="admin-topbar"><h1>Modules</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<div class="admin-cascade">' +
    '<div class="form-field"><label class="form-label" for="md-subject">Subject *</label>' +
    '<select class="form-input" id="md-subject"><option value="">— choose subject —</option></select></div>' +
    '</div>' +
    '<p class="admin-hint" id="md-filter-hint"></p>' +
    '<div id="modules-list"><p class="admin-empty">Choose a subject to see its modules.</p></div>' +
    '<div class="admin-section-title" id="md-form-title">Create new module</div>' +
    '<form id="module-form" novalidate>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="md-name-uz">Name (Uzbek) *</label>' +
    '<input class="form-input" id="md-name-uz" required></div>' +
    '<div class="form-field"><label class="form-label" for="md-name-ru">Name (Russian)</label>' +
    '<input class="form-input" id="md-name-ru"></div>' +
    '<div class="form-field"><label class="form-label" for="md-name-en">Name (English)</label>' +
    '<input class="form-input" id="md-name-en"></div>' +
    '</div>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="md-slug">Slug (optional)</label>' +
    '<input class="form-input" id="md-slug" placeholder="auto from name"></div>' +
    '<div class="form-field"><label class="form-label" for="md-status">Status</label>' +
    '<select class="form-input" id="md-status"><option value="draft">draft</option><option value="published">published</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="md-order">Display order</label>' +
    '<input class="form-input" id="md-order" type="number" value="0"></div>' +
    '</div>' +
    '<p id="md-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary" type="submit" id="md-submit">Create module</button>' +
    '<button class="btn" type="button" id="md-translate" style="margin-left:.5rem" title="Fill the other two name fields automatically">🌐 Auto-translate names</button>' +
    '<button class="btn" type="button" id="md-cancel" style="display:none;margin-left:.5rem">Cancel edit</button>' +
    '</form>';

  return adminPage('modules', contentHtml, () => {
    document.title = 'Modules — Admin — MedPobeda';
    initModulesPage();
  });
function initModulesPage() {
  (async () => {
    const user = await requireAdmin();
    if (!user) return;
    state.role = user.role;
    document.getElementById('admin-identity').textContent =
      (user.display_name || user.email) + ' · ' + user.role;
    const errorEl = document.getElementById('md-error');
    const submitBtn = document.getElementById('md-submit');
    const cancelBtn = document.getElementById('md-cancel');
    const listEl = document.getElementById('modules-list');
    const subjectSel = document.getElementById('md-subject');
    const hintEl = document.getElementById('md-filter-hint');

    // Load all subjects (with their curricula) for the dropdown.
    const subRes = await adminFetch('/api/admin/content/subjects');
    state.subjects = subRes.ok ? await subRes.json() : [];
    subjectSel.innerHTML = '<option value="">— choose subject —</option>' +
      state.subjects.map((s) => '<option value="' + s.id + '">' + esc(subjectLabel(s)) + '</option>').join('');
    let rows = [];

    async function loadList() {
      const idNum = Number(state.subjectId);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        listEl.innerHTML = '<p class="admin-empty">Choose a subject to see its modules.</p>';
        return;
      }
      const res = await adminFetch('/api/admin/content/modules?subject_id=' + idNum);
      const data = res.ok ? await res.json() : [];
      rows = data;
      hintEl.textContent = subjectLabel(state.subjects.find((s) => s.id === idNum) || {}) +
        ' — ' + data.length + ' module(s)';
      if (!data.length) { listEl.innerHTML = '<p class="admin-empty">No modules yet — use the form below to create one.</p>'; return; }
      listEl.innerHTML =
        '<table class="admin-table"><thead><tr>' +
        '<th>Name</th><th>Subject</th><th>Topics</th><th>Questions</th><th>Status</th><th>Order</th><th>Actions</th>' +
        '</tr></thead><tbody>' + data.map(rowHtml).join('') + '</tbody></table>';
      // Use event delegation - single click handler for table
      if (!listEl._listHandler) {
        listEl._listHandler = (e) => {
          const editBtn = e.target.closest("[data-edit]");
          if (editBtn) { e.preventDefault(); startEdit(Number(editBtn.dataset.edit)); return; }
          const statusBtn = e.target.closest("[data-status]");
          if (statusBtn) setStatus(Number(statusBtn.dataset.id), statusBtn.dataset.status);
        };
        listEl.addEventListener("click", listEl._listHandler);
      }
    }

    function startEdit(id) {
      const m = rows.find((r) => r.id === id);
      if (!m) return;
      state.editing = id;
      setFormValues(m);
      document.getElementById('md-form-title').textContent = 'Edit module #' + id;
      submitBtn.textContent = 'Update module';
      cancelBtn.style.display = '';
      errorEl.style.display = 'none';
    }

    function resetForm() {
      resetFormMode();
      setFormValues({});
    }

    async function setStatus(id, status) {
      const res = await adminFetch('/api/admin/content/modules/' + id + '/status', {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Status change failed (' + res.status + ').'); return; }
      await loadList();
    }

    subjectSel.addEventListener('change', async () => {
      state.subjectId = subjectSel.value;
      resetForm();
      await loadList();
    });

    cancelBtn.addEventListener('click', resetForm);
// 🌐 Auto-translate names (any one name → other two).
    document.getElementById('md-translate').addEventListener('click', async () => {
      const uz = document.getElementById('md-name-uz').value.trim();
      const ru = document.getElementById('md-name-ru').value.trim();
      const en = document.getElementById('md-name-en').value.trim();
      let source = null; let text = '';
      if (uz) { source = 'uz'; text = uz; }
      else if (en) { source = 'en'; text = en; }
      else if (ru) { source = 'ru'; text = ru; }
      if (!source) { flashForm('Type a name in any language first, then click Auto-translate.'); return; }
      const tBtn = document.getElementById('md-translate');
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
          if (typeof t === 'string' && t) document.getElementById('md-name-' + target).value = t;
        }
        errorEl.style.display = 'none';
      } finally { tBtn.disabled = false; }
    });

    document.getElementById('module-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const subjectId = Number(state.subjectId);
      if (!Number.isInteger(subjectId) || subjectId <= 0) { flashForm('Choose a subject first.'); return; }
      const nameUz = document.getElementById('md-name-uz').value.trim();
      if (!nameUz) { flashForm('Uzbek name is required.'); return; }
      const isEdit = state.editing !== null;
      const payload = {
        subject_id: subjectId,
        slug: document.getElementById('md-slug').value.trim() || undefined,
        status: document.getElementById('md-status').value,
        display_order: Number(document.getElementById('md-order').value) || 0,
        translations: {
          uz: { name: nameUz },
          ru: { name: document.getElementById('md-name-ru').value.trim() },
          en: { name: document.getElementById('md-name-en').value.trim() },
        },
      };
      submitBtn.disabled = true;
      try {
        const res = await adminFetch('/api/admin/content/modules' + (isEdit ? '/' + state.editing : ''), {
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
}