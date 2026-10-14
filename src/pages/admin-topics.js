// MedPobeda — Admin: topics CRUD (subject → module → topics).
// Cascade: pick the subject, then the module; the topics table + form follow.
// Names in UZ/RU/EN with auto-translate; edit + status change (no delete:
// the server has no topic delete endpoint — children protected by design).
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const state = { editing: null, subjects: [], modules: [], subjectId: '', moduleId: '', role: '' };

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

function rowHtml(tp) {
  const name = tp.translations?.uz?.name || tp.slug;
  const canPub = state.role === 'super_admin' || state.role === 'reviewer';
  const statusBtn = canPub
    ? (tp.status === 'published'
        ? '<button class="btn" data-status="draft" data-id="' + tp.id + '" style="padding:.25rem .7rem;font-size:.8rem">Unpublish</button>'
        : '<button class="btn" data-status="published" data-id="' + tp.id + '" style="padding:.25rem .7rem;font-size:.8rem">Publish</button>')
    : '';
  return (
    '<tr>' +
    '<td><strong>' + esc(name) + '</strong><br><small>' + esc(tp.slug) + '</small></td>' +
    '<td>' + (tp.questionCount ?? 0) + '</td>' +
    '<td>' + (tp.publishedQuestionCount ?? 0) + '</td>' +
    '<td>' + statusBadge(tp.status) + '</td>' +
    '<td>' + (tp.display_order ?? 0) + '</td>' +
    '<td>' +
    '<button class="btn" data-edit="' + tp.id + '" style="padding:.25rem .7rem;font-size:.8rem;margin-right:.35rem">Edit</button>' +
    statusBtn +
    '</td>' +
    '</tr>'
  );
}

function setFormValues(tp) {
  const tr = tp?.translations || {};
  document.getElementById('tp-name-uz').value = tr.uz?.name || '';
  document.getElementById('tp-name-ru').value = tr.ru?.name || '';
  document.getElementById('tp-name-en').value = tr.en?.name || '';
  document.getElementById('tp-slug').value = tp?.slug || '';
  document.getElementById('tp-status').value = tp?.status || 'draft';
  document.getElementById('tp-order').value = String(tp?.display_order ?? 0);
}

function resetFormMode() {
  state.editing = null;
  document.getElementById('tp-form-title').textContent = 'Create new topic';
  document.getElementById('tp-submit').textContent = 'Create topic';
  document.getElementById('tp-cancel').style.display = 'none';
}

function flashForm(msg) {
  const el = document.getElementById('tp-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function modulesForSubject() {
  const sid = Number(state.subjectId);
  return sid ? state.modules.filter((m) => Number(m.subject_id) === sid) : [];
}

export function renderAdminTopics() {
  const contentHtml =
    '<div class="admin-topbar"><h1>Topics</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<div class="admin-cascade">' +
    '<div class="form-field"><label class="form-label" for="tp-subject">Subject *</label>' +
    '<select class="form-input" id="tp-subject"><option value="">— choose subject —</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="tp-module">Module *</label>' +
    '<select class="form-input" id="tp-module" disabled><option value="">— choose subject first —</option></select></div>' +
    '</div>' +
    '<p class="admin-hint" id="tp-filter-hint"></p>' +
    '<div id="topics-list"><p class="admin-empty">Choose a module to see its topics.</p></div>' +
    '<div class="admin-section-title" id="tp-form-title">Create new topic</div>' +
    '<form id="topic-form" novalidate>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="tp-name-uz">Name (Uzbek) *</label>' +
    '<input class="form-input" id="tp-name-uz" required></div>' +
    '<div class="form-field"><label class="form-label" for="tp-name-ru">Name (Russian)</label>' +
    '<input class="form-input" id="tp-name-ru"></div>' +
    '<div class="form-field"><label class="form-label" for="tp-name-en">Name (English)</label>' +
    '<input class="form-input" id="tp-name-en"></div>' +
    '</div>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="tp-slug">Slug (optional)</label>' +
    '<input class="form-input" id="tp-slug" placeholder="auto from name"></div>' +
    '<div class="form-field"><label class="form-label" for="tp-status">Status</label>' +
    '<select class="form-input" id="tp-status"><option value="draft">draft</option><option value="published">published</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="tp-order">Display order</label>' +
    '<input class="form-input" id="tp-order" type="number" value="0"></div>' +
    '</div>' +
    '<p id="tp-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary" type="submit" id="tp-submit">Create topic</button>' +
    '<button class="btn" type="button" id="tp-translate" style="margin-left:.5rem" title="Fill the other two name fields automatically">🌐 Auto-translate names</button>' +
    '<button class="btn" type="button" id="tp-cancel" style="display:none;margin-left:.5rem">Cancel edit</button>' +
    '</form>';

  return adminPage('topics', contentHtml, () => {
    document.title = 'Topics — Admin — MedPobeda';
    initTopicsPage();
  });
}
function initTopicsPage() {
  (async () => {
    const user = await requireAdmin();
    if (!user) return;
    state.role = user.role;
    document.getElementById('admin-identity').textContent =
      (user.display_name || user.email) + ' · ' + user.role;
    const errorEl = document.getElementById('tp-error');
    const submitBtn = document.getElementById('tp-submit');
    const cancelBtn = document.getElementById('tp-cancel');
    const listEl = document.getElementById('topics-list');
    const subjectSel = document.getElementById('tp-subject');
    const moduleSel = document.getElementById('tp-module');
    const hintEl = document.getElementById('tp-filter-hint');

    // All subjects (with curricula) + all modules for the cascade.
    const [subRes, modRes] = await Promise.all([
      adminFetch('/api/admin/content/subjects'),
      adminFetch('/api/admin/content/modules'),
    ]);
    state.subjects = subRes.ok ? await subRes.json() : [];
    state.modules = modRes.ok ? await modRes.json() : [];
    subjectSel.innerHTML = '<option value="">— choose subject —</option>' +
      state.subjects.map((s) => '<option value="' + s.id + '">' + esc(subjectLabel(s)) + '</option>').join('');
    let rows = [];

    function renderModuleOptions() {
      const list = modulesForSubject();
      moduleSel.innerHTML = '<option value="">— choose module —</option>' +
        list.map((m) => {
          const name = m.translations?.uz?.name || m.slug;
          return '<option value="' + m.id + '">' + esc(name) + '</option>';
        }).join('');
      moduleSel.disabled = list.length === 0;
    }

    async function loadList() {
      const idNum = Number(state.moduleId);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        listEl.innerHTML = '<p class="admin-empty">Choose a module to see its topics.</p>';
        return;
      }
      const res = await adminFetch('/api/admin/content/topics?module_id=' + idNum);
      const data = res.ok ? await res.json() : [];
      rows = data;
      const mod = state.modules.find((m) => m.id === idNum);
      hintEl.textContent = (mod?.translations?.uz?.name || mod?.slug || '') +
        ' — ' + data.length + ' topic(s)';
      if (!data.length) { listEl.innerHTML = '<p class="admin-empty">No topics yet — use the form below to create one.</p>'; return; }
      listEl.innerHTML =
        '<table class="admin-table"><thead><tr>' +
        '<th>Name</th><th>Questions</th><th>Published</th><th>Status</th><th>Order</th><th>Actions</th>' +
        '</tr></thead><tbody>' + data.map(rowHtml).join('') + '</tbody></table>';
      listEl.querySelectorAll('[data-edit]').forEach((b) =>
        b.addEventListener('click', () => startEdit(Number(b.dataset.edit))));
      listEl.querySelectorAll('[data-status]').forEach((b) =>
        b.addEventListener('click', () => setStatus(Number(b.dataset.id), b.dataset.status)));
    }

    function startEdit(id) {
      const tp = rows.find((r) => r.id === id);
      if (!tp) return;
      state.editing = id;
      setFormValues(tp);
      document.getElementById('tp-form-title').textContent = 'Edit topic #' + id;
      submitBtn.textContent = 'Update topic';
      cancelBtn.style.display = '';
      errorEl.style.display = 'none';
    }

    function resetForm() {
      resetFormMode();
      setFormValues({});
    }

    async function setStatus(id, status) {
      const res = await adminFetch('/api/admin/content/topics/' + id + '/status', {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.error || 'Status change failed (' + res.status + ').'); return; }
      await loadList();
    }

    subjectSel.addEventListener('change', async () => {
      state.subjectId = subjectSel.value;
      state.moduleId = '';
      resetForm();
      renderModuleOptions();
      await loadList();
    });

    moduleSel.addEventListener('change', async () => {
      state.moduleId = moduleSel.value;
      resetForm();
      await loadList();
    });

    cancelBtn.addEventListener('click', resetForm);

    // 🌐 Auto-translate names (any one name → other two).
    document.getElementById('tp-translate').addEventListener('click', async () => {
      const uz = document.getElementById('tp-name-uz').value.trim();
      const ru = document.getElementById('tp-name-ru').value.trim();
      const en = document.getElementById('tp-name-en').value.trim();
      let source = null; let text = '';
      if (uz) { source = 'uz'; text = uz; }
      else if (en) { source = 'en'; text = en; }
      else if (ru) { source = 'ru'; text = ru; }
      if (!source) { flashForm('Type a name in any language first, then click Auto-translate.'); return; }
      const tBtn = document.getElementById('tp-translate');
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
          if (typeof t === 'string' && t) document.getElementById('tp-name-' + target).value = t;
        }
        errorEl.style.display = 'none';
      } finally { tBtn.disabled = false; }
    });

    document.getElementById('topic-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';
      const moduleId = Number(state.moduleId);
      if (!Number.isInteger(moduleId) || moduleId <= 0) { flashForm('Choose a module first.'); return; }
      const nameUz = document.getElementById('tp-name-uz').value.trim();
      if (!nameUz) { flashForm('Uzbek name is required.'); return; }
      const isEdit = state.editing !== null;
      const payload = {
        module_id: moduleId,
        slug: document.getElementById('tp-slug').value.trim() || undefined,
        status: document.getElementById('tp-status').value,
        display_order: Number(document.getElementById('tp-order').value) || 0,
        translations: {
          uz: { name: nameUz },
          ru: { name: document.getElementById('tp-name-ru').value.trim() },
          en: { name: document.getElementById('tp-name-en').value.trim() },
        },
      };
      submitBtn.disabled = true;
      try {
        const res = await adminFetch('/api/admin/content/topics' + (isEdit ? '/' + state.editing : ''), {
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