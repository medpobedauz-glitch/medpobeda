// MedPobeda - Subjects Directory Page (search + filters, illustrative dataset)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { curriculaData } from '../data/curricula.js';
import { subjectIcons } from './curricula-icons.js';

// Illustrative dataset: subjectId, category. Final list awaits confirmed curricula.
const CATALOG = [
  { id: 'anatomy', cat: 'fundamental' }, { id: 'physiology', cat: 'fundamental' },
  { id: 'biochemistry', cat: 'fundamental' }, { id: 'histology', cat: 'fundamental' },
  { id: 'microbiology', cat: 'fundamental' }, { id: 'pharmacology', cat: 'applied' },
  { id: 'chemistry', cat: 'fundamental' }, { id: 'organic-chemistry', cat: 'fundamental', icon: 'chemistry' },
  { id: 'dental-anatomy', cat: 'applied', icon: 'dental' },
];

const CURRICULUM_BY_SUBJECT = {
  anatomy: ['medicine', 'dentistry'], physiology: ['medicine', 'dentistry'],
  biochemistry: ['medicine', 'pharmacy'], histology: ['medicine', 'dentistry'],
  microbiology: ['medicine', 'dentistry'], pharmacology: ['medicine', 'pharmacy'],
  chemistry: ['pharmacy'], 'organic-chemistry': ['pharmacy'], 'dental-anatomy': ['dentistry'],
};

function cardHtml(item) {
  const cur = (CURRICULUM_BY_SUBJECT[item.id] || []).map((c) => t('curriculum.' + c + '.title')).join(' · ');
  return '<article class="scard" data-name="' + t('subject.' + item.id + '.name').toLowerCase() + '" data-cat="' + item.cat + '" data-cur="' + (CURRICULUM_BY_SUBJECT[item.id] || []).join(' ') + '">' +
    '<div class="scard__icon">' + (subjectIcons[item.icon || item.id] || '') + '</div>' +
    '<div class="scard__body"><h3 class="scard__title">' + t('subject.' + item.id + '.name') + '</h3>' +
    '<p class="scard__cur">' + cur + '</p>' +
    '<p class="scard__desc">' + t('subject.' + item.id + '.desc') + '</p></div>' +
    '<div class="scard__footer"><span class="scard__future">' + t('subject.future') + '</span>' +
    '<button type="button" class="btn btn--outline btn-sm scard__btn">' + t('subject.view') + '</button></div>' +
    '</article>';
}

export function renderSubjects() {
  const optCur = ['all'].concat(curriculaData.map((c) => c.id)).map((id) =>
    '<option value="' + id + '">' + (id === 'all' ? t('subjectspage.filter.all') : t('curriculum.' + id + '.title')) + '</option>'
  ).join('');
  const optCat = ['all', 'fundamental', 'applied'].map((c) =>
    '<option value="' + c + '">' + (c === 'all' ? t('subjectspage.filter.all') : t('subjectspage.category.' + c)) + '</option>'
  ).join('');
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.subjects', titleKey: 'subjectspage.title', ledeKey: 'subjectspage.lede' }) +
    '<section class="section"><div class="container">' +
    '<div class="toolbar" role="search">' +
    '<label class="visually-hidden" for="subj-search">' + t('subjectspage.search') + '</label>' +
    '<input id="subj-search" class="toolbar__search" type="search" placeholder="' + t('subjectspage.search') + '">' +
    '<div class="toolbar__selects">' +
    '<label class="visually-hidden" for="subj-cur">' + t('subjectspage.filter.curriculum') + '</label>' +
    '<select id="subj-cur" class="toolbar__select">' + optCur + '</select>' +
    '<label class="visually-hidden" for="subj-cat">' + t('subjectspage.filter.category') + '</label>' +
    '<select id="subj-cat" class="toolbar__select">' + optCat + '</select>' +
    '</div></div>' +
    '<p class="toolbar__count" id="subj-count" aria-live="polite"></p>' +
    '<div class="subjects-grid" id="subj-grid">' + CATALOG.map(cardHtml).join('') + '</div>' +
    '<p class="toolbar__empty" id="subj-empty" hidden>' + t('subjectspage.empty') + '</p>' +
    '<p class="notice-pill notice-pill--amber">' + t('subjects.notice') + '</p>' +
    '<p class="notice-pill">' + t('subjectspage.langnote') + '</p>' +
    '</div></section>';
  return { titleKey: 'subjectspage.title', descKey: 'meta.subjects', activePage: 'subjects', bodyHtml: body, init: initSubjects };
}

function initSubjects() {
  const search = document.getElementById('subj-search');
  const curSel = document.getElementById('subj-cur');
  const catSel = document.getElementById('subj-cat');
  const grid = document.getElementById('subj-grid');
  const count = document.getElementById('subj-count');
  const empty = document.getElementById('subj-empty');
  if (!search || !grid) return;

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    const cur = curSel.value;
    const cat = catSel.value;
    let visible = 0;
    grid.querySelectorAll('.scard').forEach((card) => {
      const okName = !q || card.getAttribute('data-name').indexOf(q) !== -1;
      const okCur = cur === 'all' || (' ' + card.getAttribute('data-cur') + ' ').indexOf(' ' + cur + ' ') !== -1;
      const okCat = cat === 'all' || card.getAttribute('data-cat') === cat;
      const show = okName && okCur && okCat;
      card.hidden = !show;
      if (show) visible += 1;
    });
    count.textContent = t('subjectspage.count', { n: String(visible) });
    empty.hidden = visible !== 0;
  };

  search.addEventListener('input', apply);
  curSel.addEventListener('change', apply);
  catSel.addEventListener('change', apply);
  apply();

  grid.querySelectorAll('.scard__btn').forEach((btn) => {
    btn.addEventListener('click', () => import('../components/modal.js').then((m) => m.showSubjectModal()));
  });
}
