
function renderDashboard(data, el, lang) {
  const s = data.student || {};
  const stats = data.stats || {};
  const streak = data.streak || {};
  document.getElementById('sd-name').textContent = (s.first_name + ' ' + s.last_name).trim() || s.full_name || '';
  document.getElementById('sd-university').textContent = s.university_name || t('profile.no_university');
  document.getElementById('sd-academic').textContent = (s.study_year ? (s.study_year + ' ' + t('profile.year')) + ' \u2022 ' : '') + (s.program_slug || t('profile.no_program'));
  const avatarEl = document.getElementById('sd-avatar');
  if (s.photo_url) { avatarEl.innerHTML = '<img src="' + escapeHtml(s.photo_url) + '" alt="" class="sd-avatar__img">'; }
  else { document.getElementById('sd-avatar-init').textContent = initials(s.full_name || s.first_name); }
  const accuracy = stats.total_questions > 0 ? Math.round((stats.correct / stats.total_questions) * 100) : 0;
  let html = '';
  html += '<section class="sd-stats">';
  html += statCard(stats.total_questions || 0, t('dashboard.questions_attempted'), 'questions');
  html += statCard(stats.correct || 0, t('dashboard.questions_correct'), 'correct');
  html += statCard(stats.incorrect || 0, t('dashboard.questions_incorrect'), 'incorrect');
  html += statCard(accuracy + '%', t('dashboard.accuracy'), 'accuracy');
  html += statCard((streak.current || 0) + ' ' + t('dashboard.days'), t('dashboard.study_streak'), 'streak');
  html += statCard((data.bookmark_count || 0), t('dashboard.bookmarked_questions'), 'bookmarks');
  html += '</section>';
  if (data.continue_learning) {
    const cl = data.continue_learning;
    html += '<section class="sd-card sd-continue"><h3 class="sd-card__title">' + t('dashboard.continue_learning') + '</h3>';
    html += '<p class="sd-continue__path">' + escapeHtml(cl.subject_slug) + ' \u2192 ' + escapeHtml(cl.topic_slug) + '</p>';
    html += '<a class="btn btn--primary" href="' + langPath('qbank') + '?subject=' + encodeURIComponent(cl.subject_slug) + '&topic=' + encodeURIComponent(cl.topic_slug) + '">' + t('dashboard.continue') + '</a></section>';
  } else {
    html += '<section class="sd-card sd-continue sd-continue--empty"><h3 class="sd-card__title">' + t('dashboard.continue_learning') + '</h3>';
    html += '<p>' + t('dashboard.start_first') + '</p><a class="btn btn--primary" href="' + langPath('qbank') + '">' + t('dashboard.continue') + '</a></section>';
  }
  if (data.subject_progress && data.subject_progress.length) {
    html += '<section class="sd-card" id="progress"><h3 class="sd-card__title">' + t('dashboard.by_subject') + '</h3><div class="sd-progress-list">';
    data.subject_progress.forEach((sp) => {
      html += '<div class="sd-progress-item"><div class="sd-progress-item__label"><span>' + escapeHtml(sp.subject_slug) + '</span><span>' + (sp.accuracy || 0) + '%</span></div>';
      html += '<div class="sd-progress-bar"><div class="sd-progress-bar__fill" style="width:' + Math.min(sp.accuracy || 0, 100) + '%"></div></div></div>';
    });
    html += '</div></section>';
  } else {
    html += '<section class="sd-card" id="progress"><h3 class="sd-card__title">' + t('dashboard.my_progress') + '</h3><p class="sd-empty">' + t('dashboard.no_progress_data') + '</p></section>';
  }
  if (data.weak_areas && data.weak_areas.length) {
    html += '<section class="sd-card"><h3 class="sd-card__title">' + t('dashboard.weak_areas') + '</h3><div class="sd-weak-list">';
    data.weak_areas.slice(0, 5).forEach((w) => { html += '<div class="sd-weak-item"><span>' + escapeHtml(w.subject_slug) + ' \u2192 ' + escapeHtml(w.topic_slug) + '</span><strong>' + (w.accuracy || 0) + '%</strong></div>'; });
    html += '</div></section>';
  }
  if (data.recent_activity && data.recent_activity.length) {
    html += '<section class="sd-card"><h3 class="sd-card__title">' + t('dashboard.recent_activity') + '</h3><div class="sd-activity-list">';
    data.recent_activity.slice(0, 7).forEach((a) => {
      html += '<div class="sd-activity-item"><span class="sd-activity-day">' + formatDay(a.day, lang) + '</span><span>' + a.questions_answered + ' ' + t('dashboard.questions_answered').toLowerCase() + '</span><strong>' + (a.accuracy || 0) + '%</strong></div>';
    });
    html += '</div></section>';
  }
  if (data.new_achievements && data.new_achievements.length) {
    html += '<section class="sd-card sd-achievements"><h3 class="sd-card__title">' + t('dashboard.achievements') + '</h3><div class="sd-achievement-list">';
    data.new_achievements.forEach((slug) => { html += '<span class="sd-achievement-badge">' + t('achievement.' + slug) + '</span>'; });
    html += '</div></section>';
  }
  el.innerHTML = html;
}

function statCard(value, label, type) { return '<div class="sd-stat sd-stat--' + type + '"><span class="sd-stat__value">' + value + '</span><span class="sd-stat__label">' + label + '</span></div>'; }

function formatDay(dayStr, lang) {
  const d = new Date(dayStr); const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (today - d) / (1000 * 60 * 60 * 24);
  if (diff < 1) return t('dashboard.today');
  if (diff < 2) return t('dashboard.yesterday');
  return d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' });
}
// MedPobeda — Student Dashboard. Shows learning progress, stats, streak, activity.
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import '../styles/student-dashboard.css';

function escapeHtml(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function initials(name) { return String(name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'; }

export function renderStudentDashboard() {
  const body =
    '<div class="student-dashboard">' +
    '<div class="sd-shell">' +
    '<aside class="sd-sidebar">' +
    '<div class="sd-profile-card">' +
    '<div class="sd-avatar" id="sd-avatar"><span class="sd-avatar__initials" id="sd-avatar-init">?</span></div>' +
    '<div class="sd-profile-info"><h2 class="sd-name" id="sd-name">...</h2>' +
    '<p class="sd-meta" id="sd-university"></p>' +
    '<p class="sd-meta sd-meta--sub" id="sd-academic"></p></div></div>' +
    '<nav class="sd-nav">' +
    '<a class="sd-nav__link is-active" href="' + langPath('dashboard') + '">' + t('dashboard.title') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('qbank') + '">' + t('nav.qbank') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('subjects') + '">' + t('nav.subjects') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('dashboard') + '#bookmarks">' + t('dashboard.bookmarked_questions') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('dashboard') + '#mistakes">' + t('dashboard.my_mistakes') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('dashboard') + '#progress">' + t('dashboard.my_progress') + '</a>' +
    '<a class="sd-nav__link" href="' + langPath('account') + '">' + t('profile.title') + '</a>' +
    '</nav></aside>' +
    '<main class="sd-main"><div id="sd-content"><div class="sd-loading">' + t('dashboard.start_prompt') + '</div></div></main>' +
    '</div></div>';
  return {
    titleKey: 'dashboard.title', descKey: null, activePage: 'dashboard', bodyHtml: body,
    init: () => { loadDashboard(); },
  };
}

async function loadDashboard() {
  const content = document.getElementById('sd-content');
  const lang = document.documentElement.lang || 'uz';
  try {
    const res = await fetch('/api/student/dashboard?lang=' + lang, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    renderDashboard(data, content, lang);
  } catch { content.innerHTML = '<div class="sd-error">' + t('dashboard.error_load') + '</div>'; }
}