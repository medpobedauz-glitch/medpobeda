// MedPobeda - Login Page. Real student login against POST /api/auth/login.
// Supports ?next= internal redirect so gated pages can send users back.
import { t, langPath } from '../i18n/index.js';
import { student } from '../auth-state.js';

function nextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

function goNext() {
  const next = nextPath();
  if (next) {
    window.location.replace(next);
    return;
  }
  // Default redirect after login is the student dashboard
  const lang = document.documentElement.lang || 'uz';
  window.location.replace('/' + lang + '/dashboard');
}
import { pageHeaderHtml } from '../components/page-header.js';

export function renderLogin() {
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.login', titleKey: 'loginpage.title', ledeKey: 'loginpage.subtitle' }) +
    '<section class="section"><div class="container auth-wrap">' +
    '<div class="auth-card">' +
    '<form class="auth-form" id="login-form" novalidate>' +
    '<div class="form-field"><label class="form-label" for="lg-contact">' + t('loginpage.contact') + '</label>' +
    '<input class="form-input" id="lg-contact" name="contact" type="text" autocomplete="username" required></div>' +
    '<div class="form-field"><label class="form-label" for="lg-password">' + t('loginpage.password') + '</label>' +
    '<input class="form-input" id="lg-password" name="password" type="password" autocomplete="current-password" required></div>' +
    '<p id="login-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary btn--full" type="submit" id="login-submit">' + t('loginpage.submit') + '</button>' +
    '<p class="auth-alt">' + t('loginpage.noacc', 'No account yet?') + ' <a href="' + langPath('register') + '" class="auth-alt__link">' + t('loginpage.goregister') + '</a></p>' +
    '</form></div>' +
    '</div></section>';
  return {
    titleKey: 'loginpage.title', descKey: 'meta.login', activePage: 'login', bodyHtml: body,
    init: () => {
      // Already signed in? Skip the form and continue towards the target.
      student().then((s) => { if (s) goNext(); });
      const form = document.getElementById('login-form');
      if (!form) return;
      const errorEl = document.getElementById('login-error');
      const submitBtn = document.getElementById('login-submit');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact: document.getElementById('lg-contact').value.trim(),
              password: document.getElementById('lg-password').value,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            errorEl.textContent = data.error || 'Login failed. Try again.';
            errorEl.style.display = 'block';
            return;
          }
          goNext();
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
