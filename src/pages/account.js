// MedPobeda — Student account page (after public registration/login).
// Verifies the session via GET /api/auth/me; logout via POST /api/auth/logout.
import { setBookmark } from '../components/question-bookmarks.js';
import '../styles/question-features.css';
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

export function renderAccount() {
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.home', titleKey: 'loginpage.title', ledeKey: 'registerpage.subtitle' }) +
    '<section class="section"><div class="container auth-wrap">' +
    '<div class="auth-card">' +
    '<p class="form-note" id="acc-loading">…</p>' +
    '<div id="acc-info" style="display:none">' +
    '<p><strong id="acc-name"></strong></p>' +
    '<p class="form-note"><span id="acc-contact"></span></p>' +
    '<p class="form-note"><span id="acc-curriculum"></span></p>' +
    '<p class="form-note"><span id="acc-lang"></span></p>' +
    '<div id="acc-progress"></div><section><h3>Bookmarked Questions</h3><div id="acc-bookmarks" aria-live="polite">Loading…</div></section>' +
    '<button class="btn btn--primary" id="acc-logout" type="button">' + t('loginpage.submit') + '</button>' +
    '</div>' +
    '</div>' +
    '</div></section>';
  return {
    titleKey: 'loginpage.title', descKey: null, activePage: null, bodyHtml: body,
    init: () => {
      document.title = 'MedPobeda — Account';
      const logoutBtn = document.getElementById('acc-logout');
      logoutBtn.textContent = t('common.close') === 'Close' ? 'Log out' : (document.documentElement.lang === 'ru' ? 'Выйти' : 'Chiqish');

      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(async (res) => {
          if (!res.ok) {
            window.location.replace('/' + (document.documentElement.lang || 'uz') + '/login');
            return;
          }
          const data = await res.json();
          const s = data.student;
          document.getElementById('acc-name').textContent = s.full_name;
          document.getElementById('acc-contact').textContent =
            (s.contact_type === 'phone' ? '📞 ' : '✉️ ') + s.contact;
          document.getElementById('acc-lang').textContent =
            (document.documentElement.lang === 'ru' ? 'Язык: ' : document.documentElement.lang === 'en' ? 'Language: ' : 'Til: ') + s.preferred_lang.toUpperCase();
          if (s.curriculum_id) {
            try {
              const res2 = await fetch('/api/public/learn?lang=' + (document.documentElement.lang || 'uz'));
              const list = (await res2.json()).curricula || [];
              const c = list.find((x) => x.id === s.curriculum_id);
              document.getElementById('acc-curriculum').textContent = '🎓 ' + (c ? c.name : '#' + s.curriculum_id);
            } catch { /* ignore */ }
          }
          document.getElementById('acc-loading').style.display = 'none';
          document.getElementById('acc-info').style.display = 'block';
        })
        .catch(() => { window.location.replace('/' + (document.documentElement.lang || 'uz') + '/login'); });

      loadBookmarks();

      // Load progress history
      fetch('/api/auth/progress', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((progData) => {
          const progDiv = document.getElementById('acc-progress');
          if (progDiv && progData && progData.progress && progData.progress.length) {
            progDiv.innerHTML = '<h3 style="margin:24px 0 12px;font-size:16px;color:#0F2745;">' + (document.documentElement.lang === 'ru' ? 'История' : document.documentElement.lang === 'en' ? 'History' : 'Tarix') + '</h3>' +
              progData.progress.slice(0, 10).map((p) => {
                const pct = Math.round((p.correct / p.total) * 100);
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E2E8F0;font-size:13.5px;">' +
                  '<span>' + (p.subject_slug || '') + ' · ' + (p.topic_slug || '') + '</span>' +
                  '<span style="font-weight:700;color:' + (pct >= 70 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626') + '">' + p.correct + '/' + p.total + ' (' + pct + '%)</span>' +
                  '</div>';
              }).join('');
          }
        })
        .catch(() => {});

      logoutBtn.addEventListener('click', async () => {
        // Fetch a fresh CSRF token from /me first (this page's session may not have one in memory).
        let csrf = '';
        try { csrf = (await (await fetch('/api/auth/me', { credentials: 'same-origin' })).json()).csrfToken || ''; } catch {}
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        }).catch(() => {});
        window.location.replace('/' + (document.documentElement.lang || 'uz') + '/login');
      });
    },
  };
}
const escapeBookmark = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function loadBookmarks() {
  const el = document.getElementById('acc-bookmarks');
  try {
    const res = await fetch('/api/auth/bookmarks?lang=' + (document.documentElement.lang || 'uz'), { credentials: 'same-origin' });
    if (!res.ok) throw new Error();
    const { bookmarks } = await res.json();
    el.innerHTML = bookmarks.length ? bookmarks.map(q => {
      const url = langPath('learn/' + encodeURIComponent(q.curriculum) + '/' + encodeURIComponent(q.subject)) + '?module=' + encodeURIComponent(q.module) + '&topic=' + encodeURIComponent(q.topic) + '&question=' + encodeURIComponent(q.question_id);
      return '<div class="question-detail"><strong>' + escapeBookmark(q.question_id) + '</strong><p>' + escapeBookmark(q.question_text.slice(0, 180)) + '</p><a class="btn" href="' + escapeBookmark(url) + '">Open question</a> <button class="btn" type="button" aria-pressed="true" data-bookmark="' + escapeBookmark(q.question_id) + '">Bookmarked · Remove</button></div>';
    }).join('') : '<p>No bookmarked questions yet.</p>';
    el.querySelectorAll('[data-bookmark]').forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await setBookmark(btn.dataset.bookmark, false); await loadBookmarks(); }
      catch (err) { btn.disabled = false; const p = document.createElement('p'); p.textContent = err.message; btn.after(p); }
    }));
  } catch { el.textContent = 'Could not load bookmarks. Refresh to try again.'; }
}
