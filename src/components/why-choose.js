// MedPobeda - "Why choose MedPobeda?" section (shown above subscription plans)
import { t } from '../i18n/index.js';
import { icon } from './icons.js';
import '../styles/why-choose.css';

// Custom colourful illustrated icons (blue / orange / teal palette), 64x64 viewBox
const CARD_ART = {
  // Curriculum compliance — graduation cap over a stack of books
  c1: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<rect x="8" y="47" width="48" height="8" rx="3" fill="#1A6BCC"/>' +
    '<rect x="12" y="39" width="40" height="8" rx="3" fill="#3B8CE8"/>' +
    '<rect x="16" y="31" width="32" height="8" rx="3" fill="#BDD7F5"/>' +
    '<path d="M32 6l26 10-26 10L6 16z" fill="#F28C28"/>' +
    '<path d="M20 24v8c0 3.6 5.4 6 12 6s12-2.4 12-6v-8l-12 4.6z" fill="#FDBA74"/>' +
    '<rect x="55" y="16" width="3" height="12" rx="1.5" fill="#F28C28"/>' +
    '<circle cx="56.5" cy="31.5" r="2.5" fill="#F28C28"/></svg>',
  // Expert teachers — teacher pointing at a board
  c2: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<rect x="4" y="8" width="38" height="26" rx="3.5" fill="#E0F6F4" stroke="#00B4A6" stroke-width="2.5"/>' +
    '<path d="M11 16h18M11 22h13M11 28h16" stroke="#00B4A6" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="49" cy="21" r="6.5" fill="#FDBA74"/>' +
    '<path d="M36 52c0-8 5.8-13 13-13s13 5 13 13z" fill="#00B4A6"/>' +
    '<path d="M31 33l10 8" stroke="#F28C28" stroke-width="2.5" stroke-linecap="round"/></svg>',
  // Complete set of resources — laptop with a play button
  c3: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<rect x="12" y="11" width="40" height="28" rx="3.5" fill="#0B1D3A"/>' +
    '<rect x="16" y="15" width="32" height="20" rx="2" fill="#E9EEF6"/>' +
    '<path d="M27 20l11 5.5-11 5.5z" fill="#1A6BCC"/>' +
    '<path d="M6 44h52l-4 8H10z" fill="#3B8CE8"/>' +
    '<rect x="26" y="46.5" width="12" height="3" rx="1.5" fill="#BDD7F5"/></svg>',
  // Real-time analytics — rising bars with a trend arrow
  c4: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<rect x="8" y="36" width="9" height="18" rx="2.5" fill="#FDBA74"/>' +
    '<rect x="21" y="27" width="9" height="27" rx="2.5" fill="#F28C28"/>' +
    '<rect x="34" y="32" width="9" height="22" rx="2.5" fill="#FDBA74"/>' +
    '<path d="M8 58h48" stroke="#E2E8F0" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M10 22l13-8 7 6 11-8" stroke="#00B4A6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M48 6l-2.5 9-6.5-3.5z" fill="#00B4A6"/></svg>',
  // Blended learning — gear with a pencil
  c5: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<circle cx="26" cy="34" r="14" fill="#BDD7F5"/>' +
    '<circle cx="26" cy="34" r="14" stroke="#1A6BCC" stroke-width="5" stroke-dasharray="4.5 5.6"/>' +
    '<circle cx="26" cy="34" r="6.5" fill="#1A6BCC"/>' +
    '<path d="M37 45L51 31l7 7-14 14-9.5 2z" fill="#F28C28"/>' +
    '<path d="M50 32l7 7" stroke="#FDBA74" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M34.5 54l4-1-3-3z" fill="#0B1D3A"/></svg>',
  // Flexible tariff plans — hand holding a percent coin
  c6: '<svg width="46" height="46" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<circle cx="36" cy="20" r="12" fill="#FDBA74" stroke="#F28C28" stroke-width="2.5"/>' +
    '<circle cx="32" cy="16" r="2.2" fill="#F28C28"/>' +
    '<circle cx="40" cy="24" r="2.2" fill="#F28C28"/>' +
    '<path d="M28.5 27.5l15-15" stroke="#F28C28" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M8 42c6-5 15-5 21 1l5 5h11c3.5 0 3.5 5 0 5H22c-7 0-12-4-14-11z" fill="#00B4A6"/></svg>',
};

const CARDS = [
  { key: 'c1', variant: 'blue' },
  { key: 'c2', variant: 'teal' },
  { key: 'c3', variant: 'navy' },
  { key: 'c4', variant: 'orange' },
  { key: 'c5', variant: 'blue' },
  { key: 'c6', variant: 'orange' },
];

const TAG_SLOTS = ['t1', 't2', 't3', 't4'];

const TRUST = [
  { key: 'b1', icon: 'shield', variant: 'blue' },
  { key: 'b2', icon: 'device', variant: 'teal' },
  { key: 'b3', icon: 'phone', variant: 'orange' },
  { key: 'b4', icon: 'users', variant: 'navy' },
];

export function whyChooseHtml() {
  const cards = CARDS.map((c) => {
    const tags = TAG_SLOTS.map((tk) => {
      const label = t('home.why.' + c.key + '.' + tk);
      if (!label || label.indexOf('home.why.') === 0) return '';
      return '<span class="why-card__tag">' + label + '</span>';
    }).filter(Boolean).join('<span class="why-card__tag-dot" aria-hidden="true"></span>');
    return '<article class="why-card why-card--' + c.variant + '">' +
      '<div class="why-card__icon" aria-hidden="true">' + CARD_ART[c.key] + '</div>' +
      '<div class="why-card__content"><h3 class="why-card__title">' + t('home.why.' + c.key + '.title') + '</h3>' +
      '<p class="why-card__desc">' + t('home.why.' + c.key + '.desc') + '</p>' +
      '<div class="why-card__tags">' + tags + '</div></div></article>';
  }).join('');

  const trust = TRUST.map((b) =>
    '<div class="why-trust why-trust--' + b.variant + '">' +
    '<span class="why-trust__icon" aria-hidden="true">' + icon(b.icon, 22) + '</span>' +
    '<div><p class="why-trust__title">' + t('home.why.' + b.key + '.title') + '</p>' +
    '<p class="why-trust__desc">' + t('home.why.' + b.key + '.desc') + '</p></div></div>'
  ).join('');

  return '<section class="why" id="why-choose"><div class="container">' +
    '<div class="why__header">' +
    '<span class="why__badge">🎓 ' + t('home.why.eyebrow') + '</span>' +
    '<h2 class="why__title">' + t('home.why.title') + ' <span class="why__title-accent">' + t('home.why.title-accent') + '</span></h2>' +
    '<p class="why__subtitle">' + t('home.why.subtitle') + '</p></div>' +
    '<div class="why__grid">' + cards + '</div>' +
    '<div class="why__trust">' + trust + '</div></div></section>';
}
