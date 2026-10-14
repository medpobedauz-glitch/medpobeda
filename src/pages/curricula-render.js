// MedPobeda - Curricula Page Render Functions
import { t, getLang, langPath } from '../i18n/index.js';
import { curriculaData, getSubjectName, getSubjectDescription, getCurriculumById } from '../data/curricula.js';
import { curriculumIcons, subjectIcons } from './curricula-icons.js';

export function renderBreadcrumb() {
  return `
    <div class="breadcrumb">
      <div class="container">
        <a href="${langPath('')}" class="breadcrumb__link">${t('common.breadcrumb.home')}</a>
        <span class="breadcrumb__separator">/</span>
        <span class="breadcrumb__current" aria-current="page">${t('breadcrumb.curricula')}</span>
      </div>
    </div>
  `;
}

export function renderIntroduction() {
  return `
    <section class="page-intro">
      <div class="container">
        <h1 class="page-intro__title" data-i18n="curricula.title">${t('curricula.title')}</h1>
        <p class="page-intro__subtitle" data-i18n="curricula.subtitle">${t('curricula.subtitle')}</p>
      </div>
    </section>
  `;
}

export function renderCurriculumSelector(selected) {
  const cards = curriculaData.map(curriculum => {
    const isSelected = selected === curriculum.id;
    return `
      <button
        class="curriculum-card ${isSelected ? 'curriculum-card--selected' : ''}"
        data-curriculum="${curriculum.id}"
        role="radio"
        aria-checked="${isSelected}"
        aria-label="${t('curriculum.' + curriculum.id + '.title')}"
        tabindex="0"
      >
        <div class="curriculum-card__icon" style="--accent: ${curriculum.accentColor}">
          ${curriculumIcons[curriculum.icon] || ''}
        </div>
        <h3 class="curriculum-card__title" data-i18n="curriculum.${curriculum.id}.title">${t('curriculum.' + curriculum.id + '.title')}</h3>
        <p class="curriculum-card__desc" data-i18n="curriculum.${curriculum.id}.desc">${t('curriculum.' + curriculum.id + '.desc')}</p>
        ${isSelected ? '<span class="curriculum-card__check">✓</span>' : ''}
      </button>
    `;
  }).join('');

  return `
    <section class="curriculum-selector">
      <div class="container">
        <div class="curriculum-selector__grid" role="radiogroup" aria-label="${t('curricula.aria')}">
          ${cards}
        </div>
      </div>
    </section>
  `;
}

export function renderStudyYearArea() {
  return `
    <section class="study-year">
      <div class="container">
        <h2 class="study-year__title" data-i18n="studyyear.title">${t('studyyear.title')}</h2>
        <div class="study-year__notice">
          <span class="study-year__notice-icon">ⓘ</span>
          <p data-i18n="studyyear.notice">${t('studyyear.notice')}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderSubjectExplorer(curriculumId) {
  const curriculum = getCurriculumById(curriculumId);
  if (!curriculum) return '';

  const lang = getLang();
  const subjects = curriculum.subjects;

  const subjectCards = subjects.map(subject => {
    const name = getSubjectName(subject.id, lang);
    const desc = getSubjectDescription(subject.id, lang);
    const icon = subjectIcons[subject.icon] || subjectIcons.anatomy;

    return `
      <article class="subject-card" data-subject="${subject.id}">
        <div class="subject-card__icon" style="--accent: ${curriculum.accentColor}">
          ${icon}
        </div>
        <h4 class="subject-card__title">${name}</h4>
        <p class="subject-card__desc">${desc}</p>
        <div class="subject-card__action">
          <button class="btn btn--outline btn--sm subject-view-btn" data-subject="${subject.id}">
            <span data-i18n="subject.view">${t('subject.view')}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </article>
    `;
  }).join('');

  return `
    <section class="subject-explorer" id="subjects">
      <div class="container">
        <h2 class="subject-explorer__title" data-i18n="subjects.title">${t('subjects.title')}</h2>
        <div class="subject-explorer__grid">
          ${subjectCards}
        </div>
        <p class="subject-explorer__notice" data-i18n="subjects.notice">${t('subjects.notice')}</p>
      </div>
    </section>
  `;
}

export function renderLearningPath() {
  const steps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
  const pathSteps = steps.map((step, index) => `
    <div class="path-step">
      <div class="path-step__num">${index + 1}</div>
      <span class="path-step__label" data-i18n="path.${step}">${t('path.' + step)}</span>
    </div>
  `).join('<div class="path-arrow">→</div>');

  return `
    <section class="learning-path">
      <div class="container">
        <h2 class="learning-path__title" data-i18n="path.title">${t('path.title')}</h2>
        <p class="learning-path__subtitle" data-i18n="path.subtitle">${t('path.subtitle')}</p>
        <div class="learning-path__flow">
          ${pathSteps}
        </div>
      </div>
    </section>
  `;
}

export function renderHelpSection() {
  return `
    <section class="help-section">
      <div class="container">
        <div class="help-section__card">
          <h3 class="help-section__title" data-i18n="help.title">${t('help.title')}</h3>
          <p class="help-section__text" data-i18n="help.text">${t('help.text')}</p>
          <button class="btn btn--primary help-section__btn" id="helpBtn" data-i18n="help.button">${t('help.button')}</button>
        </div>
      </div>
    </section>
  `;
}

export function getSelectedCurriculum() {
  const params = new URLSearchParams(window.location.search);
  const track = params.get('track');
  if (track && getCurriculumById(track)) return track;
  return 'medicine';
}