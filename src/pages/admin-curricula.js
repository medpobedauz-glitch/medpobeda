// MedPobeda — Admin: curricula list + create/edit/delete (admin content API).
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

const editing = { id: null };

function statusBadge(status) {
  return '<span class="admin-badge admin-badge--' + status + '">' + status + '</span>';
}

function rowHtml(c) {
  const name = c.translations?.uz?.name || c.slug;
  const subjects = (c.assignedSubjects || []).map((s) => s.slug).join(', ');
  return (
    '<tr>' +
    '<td><strong>' + name + '</strong><br><small>' + c.slug + '</small></td>' +
    '<td>' + statusBadge(c.status) + '</td>' +
    '<td>' + (c.subjectCount ?? 0) + '<br><small>' + subjects + '</small></td>' +
    '<td>' + (c.questionCount ?? 0) + '</td>' +
    '<td>' + (c.display_order ?? 0) + '</td>' +
    '<td>' +
    '<button type="button" class="btn" data-edit="' + c.id + '" style="padding:.25rem .7rem;font-size:.8rem;margin-right:.35rem">Edit</button>' +
    '<button type="button" class="btn" data-delete="' + c.id + '" data-name="' + name + '" style="padding:.25rem .7rem;font-size:.8rem">Delete</button>' +
    '</td>' +
    '</tr>'
  );
}

export function renderAdminCurricula() {
  const contentHtml =
    '<div class="admin-topbar"><h1>Curricula</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<div id="curricula-list"><p class="admin-empty">Loading…</p></div>' +
    '<div class="admin-section-title" id="cu-form-title">Create new curriculum</div>' +
    '<form id="curriculum-form" novalidate>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="cu-name-uz">Name (Uzbek) *</label>' +
    '<input class="form-input" id="cu-name-uz" required></div>' +
    '<div class="form-field"><label class="form-label" for="cu-name-ru">Name (Russian)</label>' +
    '<input class="form-input" id="cu-name-ru"></div>' +
    '<div class="form-field"><label class="form-label" for="cu-name-en">Name (English)</label>' +
    '<input class="form-input" id="cu-name-en"></div>' +
    '</div>' +
    '<div class="admin-form-grid">' +
    '<div class="form-field"><label class="form-label" for="cu-slug">Slug (optional)</label>' +
    '<input class="form-input" id="cu-slug" placeholder="auto from name"></div>' +
    '<div class="form-field"><label class="form-label" for="cu-status">Status</label>' +
    '<select class="form-input" id="cu-status"><option value="draft">draft</option><option value="published">published</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="cu-order">Display order</label>' +
    '<input class="form-input" id="cu-order" type="number" value="0"></div>' +
    '</div>' +
    '<p id="curriculum-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary" type="submit" id="curriculum-submit">Create curriculum</button>' +
    '<button class="btn" type="button" id="cu-translate" style="margin-left:.5rem" title="Fill the other two name fields automatically">🌐 Auto-translate names</button>' +
    '<button class="btn" type="button" id="curriculum-cancel" style="display:none;margin-left:.5rem">Cancel edit</button>' +
    '</form>';

  return adminPage('curricula', contentHtml, () => {
    document.title = 'Curricula — Admin — MedPobeda';
    initCurriculaPage();
  });
}

function initCurriculaPage() {
  (async () => {
    const user = await requireAdmin();
    if (!user) return;
    document.getElementById('admin-identity').textContent =
      (user.display_name || user.email) + ' · ' + user.role;

    const listEl = document.getElementById('curricula-list');
    const errorEl = document.getElementById('curriculum-error');
    const submitBtn = document.getElementById('curriculum-submit');
    const cancelBtn = document.getElementById('curriculum-cancel');
    const formTitle = document.getElementById('cu-form-title');

      function flashForm(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }

      function setFormValues(t, c) {
        document.getElementById('cu-name-uz').value = t.uz?.name || '';
        document.getElementById('cu-name-ru').value = t.ru?.name || '';
        document.getElementById('cu-name-en').value = t.en?.name || '';
        document.getElementById('cu-slug').value = c?.slug || '';
        document.getElementById('cu-status').value = c?.status || 'draft';
        document.getElementById('cu-order').value = String(c?.display_order ?? 0);
      }

      function resetFormMode() {
        editing.id = null;
        formTitle.textContent = 'Create new curriculum';
        submitBtn.textContent = 'Create curriculum';
        cancelBtn.style.display = 'none';
        errorEl.style.display = 'none';
      }

      async function startEdit(id) {
        errorEl.style.display = 'none';
        const res = await adminFetch('/api/admin/content/curricula/' + id);
        if (!res.ok) { flashForm('Failed to load curriculum #' + id); return; }
        const c = await res.json();
        setFormValues(c.translations || {}, c);
        editing.id = id;
        formTitle.textContent = 'Edit curriculum #' + id;
        submitBtn.textContent = 'Update curriculum';
        cancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }

      async function remove(id, name) {
        if (!window.confirm('Delete curriculum "' + name + '"? Its subjects will be unlinked (subjects themselves are kept).')) return;
        const res = await adminFetch('/api/admin/content/curricula/' + id, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          flashForm(data.error || 'Delete failed (' + res.status + ').');
          return;
        }
        if (editing.id === id) { resetFormMode(); setFormValues({}, null); }
        await loadList();
      }

      async function loadList() {
        listEl.innerHTML = '<p class="admin-empty">Loading…</p>';
        const res = await adminFetch('/api/admin/content/curricula');
        if (!res.ok) {
          listEl.innerHTML = '<p class="admin-empty">Failed to load curricula (' + res.status + ').</p>';
          return;
        }
        const rows = await res.json();
        if (!rows.length) {
          listEl.innerHTML = '<p class="admin-empty">No curricula yet — create the first one below.</p>';
          return;
        }
        listEl.innerHTML =
          '<table class="admin-table"><thead><tr>' +
          '<th>Curriculum</th><th>Status</th><th>Subjects</th><th>Questions</th><th>Order</th><th>Actions</th>' +
          '</tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table>';

        listEl.querySelectorAll('[data-edit]').forEach((b) =>
          b.addEventListener('click', () => startEdit(Number(b.dataset.edit))));
        listEl.querySelectorAll('[data-delete]').forEach((b) =>
          b.addEventListener('click', () => remove(Number(b.dataset.delete), b.dataset.name)));
      }

      cancelBtn.addEventListener('click', () => { resetFormMode(); setFormValues({}, null); });

      // 🌐 Auto-translate: one name field filled → translate into the other two.
      document.getElementById('cu-translate').addEventListener('click', async () => {
        const uz = document.getElementById('cu-name-uz').value.trim();
        const ru = document.getElementById('cu-name-ru').value.trim();
        const en = document.getElementById('cu-name-en').value.trim();
        let source = null; let text = '';
        if (uz) { source = 'uz'; text = uz; }
        else if (en) { source = 'en'; text = en; }
        else if (ru) { source = 'ru'; text = ru; }
        if (!source) { flashForm('Type a name in any language first, then click Auto-translate.'); return; }

        const tBtn = document.getElementById('cu-translate');
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
            if (typeof t === 'string' && t) {
              document.getElementById('cu-name-' + target).value = t;
            }
          }
          errorEl.style.display = 'none';
        } finally {
          tBtn.disabled = false;
        }
      });

      await loadList();

      document.getElementById('curriculum-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        const nameUz = document.getElementById('cu-name-uz').value.trim();
        if (!nameUz) { flashForm('Uzbek name is required.'); return; }
        const isEdit = editing.id !== null;
        const payload = {
          slug: document.getElementById('cu-slug').value.trim() || undefined,
          status: document.getElementById('cu-status').value,
          display_order: Number(document.getElementById('cu-order').value) || 0,
          translations: {
            uz: { name: nameUz },
            ru: { name: document.getElementById('cu-name-ru').value.trim() },
            en: { name: document.getElementById('cu-name-en').value.trim() },
          },
        };
        submitBtn.disabled = true;
        try {
          const res = await adminFetch('/api/admin/content/curricula' + (isEdit ? '/' + editing.id : ''), {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            flashForm(data.error || 'Save failed (' + res.status + ').');
            return;
          }
          resetFormMode();
          setFormValues({}, null);
          await loadList();
        } catch {
          flashForm('Network error.');
        } finally {
          submitBtn.disabled = false;
        }
      });
  })();
}