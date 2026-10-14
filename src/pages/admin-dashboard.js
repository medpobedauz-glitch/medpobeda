// MedPobeda — Admin dashboard: session guard, identity, and content stats.
import { adminPage, requireAdmin, adminFetch } from '../admin/shell.js';

export function renderAdminDashboard() {
  const contentHtml =
    '<div class="admin-topbar"><h1>Dashboard</h1><span class="admin-user" id="admin-identity"></span></div>' +
    '<div id="admin-stats" class="admin-stats"><p class="admin-empty">Loading stats…</p></div>' +
    '<div id="admin-body"></div>';

  return adminPage('dashboard', contentHtml, () => {
    document.title = 'Admin — MedPobeda';

    (async () => {
      const user = await requireAdmin();
      if (!user) return;
      document.getElementById('admin-identity').textContent =
        (user.display_name || user.email) + ' · ' + user.role;

      // Content counts from the live admin APIs.
      const [curricula, questions, media, users] = await Promise.all([
        adminFetch('/api/admin/content/curricula').then((r) => (r.ok ? r.json() : [])),
        adminFetch('/api/admin/questions').then((r) => (r.ok ? r.json() : [])),
        adminFetch('/api/admin/media').then((r) => (r.ok ? r.json() : [])),
        adminFetch('/api/admin/users').then((r) => (r.ok ? r.json() : [])),
      ]);

      const stats = [
        { label: 'Curricula', value: Array.isArray(curricula) ? curricula.length : 0 },
        { label: 'Questions', value: Array.isArray(questions) ? questions.length : 0 },
        { label: 'Media files', value: Array.isArray(media) ? media.length : 0 },
        { label: 'Admin users', value: Array.isArray(users) ? users.length : 0 },
      ];
      document.getElementById('admin-stats').innerHTML = stats
        .map((s) => '<div class="admin-stat"><div class="admin-stat__value">' + s.value + '</div><div class="admin-stat__label">' + s.label + '</div></div>')
        .join('');

      document.getElementById('admin-body').innerHTML =
        '<p class="admin-empty">Use the sidebar to manage content. Questions, Media, Users and Audit Log sections are coming next.</p>';
    })();
  });
}