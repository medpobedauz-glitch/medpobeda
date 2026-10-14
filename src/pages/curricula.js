// MedPobeda - Curricula Page
// Curriculum & Subjects Explorer: selectable cards, study-year notice, subject grid.
import { t } from '../i18n/index.js';
import { curriculumCatalogHtml } from '../components/curriculum-catalog.js';
import { showSubjectModal, showHelpModal } from '../components/modal.js';
import {
  renderBreadcrumb,
  renderIntroduction,
  renderCurriculumSelector,
  renderStudyYearArea,
  renderSubjectExplorer,
  renderLearningPath,
  renderHelpSection,
  getSelectedCurriculum,
} from './curricula-render.js';

function selectCurriculum(id, { updateUrl = true } = {}) {
  const grid = document.querySelector('.curriculum-selector__grid');
  if (!grid) return;
  grid.querySelectorAll('.curriculum-card').forEach((card) => {
    const isSelected = card.getAttribute('data-curriculum') === id;
    card.classList.toggle('curriculum-card--selected', isSelected);
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    const check = card.querySelector('.curriculum-card__check');
    if (check) check.remove();
    if (isSelected) {
      const mark = document.createElement('span');
      mark.className = 'curriculum-card__check';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '✓';
      card.appendChild(mark);
    }
  });
  if (updateUrl) {
    const url = new URL(window.location);
    url.searchParams.set('track', id);
    window.history.replaceState({}, '', url);
  }
  const explorer = document.getElementById('subject-explorer-body');
  if (explorer) {
    explorer.innerHTML = renderSubjectExplorer(id);
    const heading = explorer.querySelector('.subject-explorer__title');
    if (heading) heading.setAttribute('tabindex', '-1');
  }
}

function initCurriculaEvents() {
  const grid = document.querySelector('.curriculum-selector__grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.curriculum-card'));

  cards.forEach((card) => {
    card.addEventListener('click', () => selectCurriculum(card.getAttribute('data-curriculum')));
    card.addEventListener('keydown', (e) => {
      const index = cards.indexOf(card);
      let target = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = cards[(index + 1) % cards.length];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = cards[(index - 1 + cards.length) % cards.length];
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        selectCurriculum(card.getAttribute('data-curriculum'));
        return;
      }
      if (target) {
        e.preventDefault();
        target.focus();
        selectCurriculum(target.getAttribute('data-curriculum'));
      }
    });
  });

  // Subject "view" buttons open an accessible informational modal (no fake links).
  document.querySelectorAll('.subject-view-btn').forEach((btn) => {
    btn.addEventListener('click', () => showSubjectModal());
  });

  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) helpBtn.addEventListener('click', () => showHelpModal());
}

export function renderCurricula(lang) {
  if (!new URLSearchParams(window.location.search).has('track')) {
    return {titleKey:'meta.curricula',descKey:'meta.curricula',activePage:'curricula',
      bodyHtml:'<div class="curricula-page">'+renderBreadcrumb()+renderIntroduction()+'<section class="container" style="padding-bottom:64px">'+curriculumCatalogHtml()+'</section></div>',init:null};
  }
  const selected = getSelectedCurriculum();
  const bodyHtml =
    '<div class="curricula-page">' +
    renderBreadcrumb() +
    renderIntroduction() +
    renderCurriculumSelector(selected) +
    renderStudyYearArea() +
    '<div id="subject-explorer-body">' + renderSubjectExplorer(selected) + '</div>' +
    renderLearningPath() +
    renderHelpSection() +
    '</div>';
  return {
    titleKey: 'meta.curricula',
    descKey: 'meta.curricula',
    activePage: 'curricula',
    bodyHtml,
    init: initCurriculaEvents,
  };
}

