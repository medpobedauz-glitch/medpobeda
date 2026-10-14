// MedPobeda — Admin login page. Real authentication against the admin API.
// On success the server sets an httpOnly session cookie; the CSRF token from
// the response is kept in sessionStorage and sent back on write requests.
import { pageHeaderHtml } from '../components/page-header.js';

const CSRF_KEY = 'medpobeda:adminCsrf';

export function getStoredCsrfToken() {
  return sessionStorage.getItem(CSRF_KEY) || '';
}

export function storeCsrfToken(token) {
  sessionStorage.setItem(CSRF_KEY, token);
}

export function clearCsrfToken() {
  sessionStorage.removeItem(CSRF_KEY);
}

export function renderAdminLogin() {
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.login', titleKey: 'loginpage.title', ledeKey: 'loginpage.subtitle' }) +
    '<section class="section"><div class="container auth-wrap">' +
    '<div class="auth-card">' +
    '<form class="auth-form" id="admin-login-form" novalidate>' +
    '<div class="form-field"><label class="form-label" for="adm-email">Email</label>' +
    '<input class="form-input" id="adm-email" name="email" type="email" autocomplete="username" required></div>' +
    '<div class="form-field"><label class="form-label" for="adm-password">Password</label>' +
    '<input class="form-input" id="adm-password" name="password" type="password" autocomplete="current-password" required></div>' +
    '<p id="admin-login-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary btn--full" type="submit" id="admin-login-submit">Log in to Admin Panel</button>' +
    '</form></div>' +
    '</div></section>';
  return {
    titleKey: 'loginpage.title', descKey: 'meta.login', activePage: null, bodyHtml: body,
    init: () => {
      // Already authenticated? Go straight to the dashboard.
      fetch('/api/admin/auth/me', { credentials: 'same-origin' })
        .then((r) => { if (r.ok) window.location.replace('/uz/admin'); })
        .catch(() => {});

      const form = document.getElementById('admin-login-form');
      const errorEl = document.getElementById('admin-login-error');
      const submitBtn = document.getElementById('admin-login-submit');
      if (!form) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adm-email').value.trim();
        const password = document.getElementById('adm-password').value;
        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        try {
          const res = await fetch('/api/admin/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            errorEl.textContent = data.error || 'Login failed. Try again.';
            errorEl.style.display = 'block';
            return;
          }
          storeCsrfToken(data.csrfToken || '');
          window.location.replace('/uz/admin');
        } catch {
          errorEl.textContent = 'Network error. Is the server running?';
          errorEl.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
        }
      });
    },
  };
}