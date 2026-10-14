// MedPobeda - Anatomy Dashboard Section Component
// Renders a section (e.g. "Bones", "Heart") with a grid of AnatomyCard
// components. Lazy-loads 3D previews when cards enter the viewport.
import { t, getLang, langPath } from '../i18n/index.js';
import { anatomyCardHtml, initAnatomyCard } from './anatomy-card.js';
import { cardToViewerParams, lname } from '../data/anatomy-dashboard.js';

export function anatomySectionHtml(section) {
  const title = t('anat3d.dashboard.sectionTitle.' + section.id) || section.title.en;
  const subtitle = section.subtitle ? (t('anat3d.dashboard.sectionSubtitle.' + section.id) || section.subtitle.en) : '';

  const cardsHtml = section.cards.map((card) => anatomyCardHtml(card)).join('');

  return (
    '<section class="anat-section" data-section-id="' + section.id + '"' +
    (section.subtitle ? ' aria-label="' + title + ' — ' + subtitle + '"' : ' aria-label="' + title + '"') + '>' +
    '<div class="anat-section__header">' +
    '<div>' +
    '<h2 class="anat-section__title">' + title + '</h2>' +
    (subtitle ? '<p class="anat-section__subtitle">' + subtitle + '</p>' : '') +
    '</div>' +
    '</div>' +
    '<div class="anat-section__grid">' +
    cardsHtml +
    '</div>' +
    '</section>'
  );
}

// Initialise a section: fill link hrefs from the data layer and wire up
// the lazy 3D previews. Available cards are native <a> links, so keyboard
// activation and focus come for free; coming-soon cards stay inert.
export function initSection(section, container) {
  const sectionEl = container.querySelector('[data-section-id="' + section.id + '"]');
  if (!sectionEl) return;

  const cleanup=[];
  section.cards.forEach((card) => {
    const cardEl = sectionEl.querySelector('[data-card-id="' + card.id + '"]');
    if (cardEl && card.status === 'available') {
      const params = cardToViewerParams(card);
      if (params) cardEl.setAttribute('href', langPath('anatomy-3d') + '?' + params);
      cardEl.setAttribute('aria-label', lname(card.title, getLang()) + ' — ' + t('anat3d.dashboard.explore'));
    }
    cleanup.push(initAnatomyCard(card, sectionEl));
  });
  return ()=>cleanup.forEach(fn=>fn?.());
}
