// MedPobeda — Admin panel shared shell: sidebar nav, session guard, API helper.
import { getLang } from '../i18n/index.js';
import { getStoredCsrfToken, storeCsrfToken, clearCsrfToken } from '../pages/admin-login.js';

// Navigation model. Sections with `soon: true` render disabled (API/UI pending).
export const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin' },
  { key: 'curricula', label: 'Curricula', href: '/admin/curricula' },
  { key: 'subjects', label: 'Subjects', href: '/admin/subjects' },
  { key: 'modules', label: 'Modules', href: '/admin/modules' },
  { key: 'topics', label: 'Topics', href: '/admin/topics' },
  { key: 'questions', label: 'Questions', href: '/admin/questions' },
  { key: 'pdf-import', label: '📄 PDF Qbank Import', href: '/admin/pdf-import' },
  { key: 'media', label: 'Media', href: null },
  { key: 'users', label: 'Users', href: '/admin/users' },
  { key: 'audit', label: 'Audit Log', href: '/admin/audit' },
];

// Fetch wrapper for admin APIs: same-origin cookies + CSRF header on writes.
export function adminFetch(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const headers = Object.assign({}, opts.headers || {});
  if (method !== 'GET') headers['X-CSRF-Token'] = getStoredCsrfToken();
  if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  return fetch(url, Object.assign({}, opts, { credentials: 'same-origin', headers }));
}

// Session guard: resolves the admin identity or redirects to the login page.
export async function requireAdmin() {
  try {
    const res = await fetch('/api/admin/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
      window.location.replace('/' + getLang() + '/admin/login');
      return null;
    }
    const data = await res.json();
    // Always sync the CSRF token from /me — sessionStorage may be empty (new
    // tab) or stale (older session), which would fail every write with 403.
    if (data.csrfToken) storeCsrfToken(data.csrfToken);
    return data.user;
  } catch {
    window.location.replace('/' + getLang() + '/admin/login');
    return null;
  }
}

// Sidebar + content frame. `contentHtml` is the section-specific markup.
export function adminShell(activeKey, contentHtml) {
  const lang = getLang();
  const links = ADMIN_NAV.map((item) => {
    const isActive = item.key === activeKey;
    const cls = 'admin-nav__link' + (isActive ? ' admin-nav__link--active' : '');
    if (!item.href) {
      return '<span class="' + cls + ' admin-nav__link--soon" title="Coming soon">' + item.label + ' <small>soon</small></span>';
    }
    return '<a class="' + cls + '" href="/' + lang + item.href + '" data-admin-nav>' + item.label + '</a>';
  }).join('');
  return (
    '<div class="admin-layout">' +
    '<aside class="admin-sidebar">' +
    '<div class="admin-sidebar__brand">MedPobeda <span>Admin</span></div>' +
    '<nav class="admin-nav">' + links + '</nav>' +
    '<button class="btn btn--primary admin-sidebar__logout" id="admin-logout" type="button">Log out</button>' +
    '</aside>' +
    '<div class="admin-main"><div class="admin-content">' + contentHtml + '</div></div>' +
    '</div>'
  );
}

// Binds the shared logout button (call once per page init).
export function bindAdminLogout() {
  document.getElementById('admin-logout')?.addEventListener('click', async () => {
    await adminFetch('/api/admin/auth/logout', { method: 'POST' }).catch(() => {});
    clearCsrfToken();
    window.location.replace('/' + getLang() + '/admin/login');
  });
}

// Standard page config factory for admin pages (skips the public header lede).
export function adminPage(activeKey, contentHtml, init) {
  return {
    titleKey: null, descKey: null, activePage: null,
    bodyHtml: adminShell(activeKey, contentHtml),
    init: () => { bindAdminLogout(); if (typeof init === 'function') init(); },
  };
}