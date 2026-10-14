// MedPobeda - QBank Page (practice hub, students only).
// Signed-in students see published subjects as rich cards (thumbnail + details)
// for their curriculum, with a curriculum switcher. Guests are sent to login.
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { requireStudent } from '../auth-state.js';
import { subjectTint } from '../theme/subject-art.js';
import { qbankArtHtml } from '../theme/qbank-art.js';
import '../styles/qbank-premium.css';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Titles the word when the DB stores an all-caps name (e.g. "PHARMACOLOGY").
function prettyName(name) {
  const s = String(name == null ? '' : name).trim();
  if (s === s.toUpperCase() && /[A-Za-z]/.test(s) && s.length > 2) {
    return s.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (m, p, ch) => p + ch.toUpperCase());
  }
  return s;
}

// The student's faculty curriculum name, resolved from their account.
// (No manual switching — each student belongs to exactly one faculty.)

function subjectDescription(subject) {
  if (subject.short_desc && subject.short_desc.trim()) return subject.short_desc.trim();
  const key = 'qbankpage.subjdesc.' + subject.slug.replace('-lor', '');
  const direct = t(key);
  if (direct && direct !== key) return direct;
  return t('qbankpage.subjdesc.default', { name: (subject.name || '').toLowerCase() || subject.slug });
}

export function cardHtml(subject, curSlug, curName) {
  const tint = subjectTint(subject.slug);
  const count = Number(subject.questionCount) || 0;
  const countHtml = '<span class="qcard__dot" aria-hidden="true"></span>' +
    esc(t('qbankpage.questions', { n: String(count) }));
  const href = langPath('learn/' + encodeURIComponent(curSlug) + '/' + encodeURIComponent(subject.slug));
  return '<a class="qcard qcard--' + tint + (count === 0 ? ' qcard--empty' : '') + '" href="' + href + '">' +
    '<span class="qcard__art" aria-hidden="true">' + qbankArtHtml(subject.slug) + '</span>' +
    '<span class="qcard__body">' +
    '<span class="qcard__cur">' + esc(prettyName(curName)) + '</span>' +
    '<span class="qcard__title">' + esc(prettyName(subject.name)) + '</span>' +
    '<span class="qcard__desc">' + esc(subjectDescription(subject)) + '</span>' +
    '</span>' +
    '<span class="qcard__foot">' +
    '<span class="qcard__count">' + countHtml + '</span>' +
    '<span class="qcard__cta">' +
    t('qbankpage.practice') + '<span class="qcard__cta-arrow" aria-hidden="true">→</span></span>' +
    '</span>' +
    '</a>';
}

function renderStatus(message, isError) {
  return '<p class="qbank-status' + (isError ? ' qbank-status--error' : '') + '">' + esc(message) + '</p>';
}

async function loadSubjectsFor(curSlug) {
  const grid = document.getElementById('qbank-grid');
  const status = document.getElementById('qbank-status');
  const stats = document.getElementById('qbank-cur-stats');
  if (!grid || !status) return;
  grid.innerHTML = '';
  stats.textContent = '';
  status.textContent = t('qbankpage.loading');

  try {
    const res = await fetch('/api/public/learn/' + encodeURIComponent(curSlug) + '?lang=' + (document.documentElement.lang || 'uz'));
    if (!res.ok) throw new Error('bad curriculum');
    const data = await res.json();
    const subjects = (data.subjects || []).filter((s) => s.name);
    const curName = data.curriculum && data.curriculum.name ? data.curriculum.name : curSlug;

    if (!subjects.length) {
      status.textContent = t('qbankpage.empty');
      return;
    }
    status.textContent = '';
    const total = Number(data.questionCount) || 0;
    stats.textContent = prettyName(curName) + ' · ' + subjects.length + ' ' + t('qbankpage.subjects') + ' · ' +
      t('qbankpage.questions', { n: String(total) });
    grid.innerHTML = subjects.map((s) => cardHtml(s, curSlug, curName)).join('');
  } catch (e) {
    status.textContent = t('qbankpage.error');
  }
}



export function renderQbank() {
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.qbank', titleKey: 'qbankpage.title', ledeKey: 'qbankpage.lede' }) +
    '<section class="section qbank-premium"><div class="container">' +
    '<div class="qbank-card" id="qbank-root">' +
        '<div class="qbank-toolbar">' +
    '<p class="qbank-toolbar__stats" id="qbank-cur-stats" aria-live="polite"></p>' +
    '</div>' +
    '<p class="qbank-status" id="qbank-status" aria-live="polite">' + t('qbankpage.loading') + '</p>' +
    '<div class="qbank-grid" id="qbank-grid"></div>' +
    '</div>' +
    '<p class="notice-pill notice-pill--amber">' + t('qbankpage.notice') + '</p>' +
    '</div></section>';
  return {
    titleKey: 'qbankpage.title',
    descKey: 'meta.qbank',
    activePage: 'qbank',
    bodyHtml: body,
        init: () => {
      requireStudent(langPath('qbank')).then((student) => {
        if (!student) return; // redirecting to login
        (async () => {
          try {
            const res = await fetch('/api/public/learn?lang=' + (document.documentElement.lang || 'uz'));
            const curriculaList = (res.ok ? ((await res.json()).curricula || []) : []).filter((c) => c.name);
            const studentCurriculum = curriculaList.find((c) => c.id === student.curriculum_id)
              || (curriculaList.length === 1 ? curriculaList[0] : null);

            if (studentCurriculum) {
              const stats = document.getElementById('qbank-cur-stats');
              if (stats) stats.textContent = prettyName(studentCurriculum.name);
              await loadSubjectsFor(studentCurriculum.slug);
            } else if (curriculaList.length === 1) {
              await loadSubjectsFor(curriculaList[0].slug);
            } else {
              const status = document.getElementById('qbank-status');
              if (status) status.textContent = t('qbankpage.no_curriculum');
            }
          } catch (e) {
            const status = document.getElementById('qbank-status');
            if (status) status.textContent = t('qbankpage.error');
          }
        })();
      });
    },
  };
}
