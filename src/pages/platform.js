// MedPobeda - Platform Page (learning ecosystem, honest status labels)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

const FEATURES = [
  { key: 'videos', status: 'dev' }, { key: 'subjects', status: 'dev' },
  { key: 'mcq', status: 'dev' }, { key: 'qbank', status: 'planned' },
  { key: 'tests', status: 'planned' }, { key: 'explanations', status: 'dev' },
  { key: 'saved', status: 'planned' }, { key: 'mistakes', status: 'planned' },
  { key: 'dashboard', status: 'planned' }, { key: 'progress', status: 'planned' },
  { key: 'leaderboard', status: 'planned' }, { key: 'oneaccount', status: 'dev' },
];

export function renderPlatform() {
  const cards = FEATURES.map((f) =>
    '<article class="pfcard">' +
    '<div class="pfcard__head"><h3 class="pfcard__title">' + t('platformpage.' + f.key + '.name') + '</h3>' +
    '<span class="status-pill status-pill--' + f.status + '">' + t('common.status.' + f.status) + '</span></div>' +
    '<p class="pfcard__desc">' + t('platformpage.' + f.key + '.desc') + '</p></article>'
  ).join('');
  const legend =
    '<div class="status-legend">' +
    ['dev', 'planned'].map((s) =>
      '<span class="status-legend__item"><span class="status-pill status-pill--' + s + '">' + t('common.status.' + s) + '</span></span>'
    ).join('') + '</div>';
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.platform', titleKey: 'platformpage.title', ledeKey: 'platformpage.lede' }) +
    '<section class="section"><div class="container">' + legend +
    '<div class="platform-grid">' + cards + '</div>' +
    '<div class="dash-preview" aria-hidden="true">' +
    '<p class="dash-preview__label">' + t('platformpage.preview.label') + '</p>' +
    '<div class="dash-preview__window"><div class="dash-preview__bar"><span></span><span></span><span></span></div>' +
    '<div class="dash-preview__body">' +
    '<div class="dash-preview__card"><span class="dash-preview__k">' + t('home.hero.card.title') + '</span><span class="dash-preview__v">' + t('home.hero.card.subject') + '</span></div>' +
    '<div class="dash-preview__card"><span class="dash-preview__k">' + t('home.app.card2') + '</span><span class="dash-preview__v">68%</span></div>' +
    '<div class="dash-preview__card"><span class="dash-preview__k">' + t('home.app.card3') + '</span><span class="dash-preview__v">7</span></div>' +
    '</div></div>' +
    '<p class="dash-preview__note">' + t('platformpage.preview.note') + '</p></div>' +
    '</div></section>' +
    '<section class="quote-band"><div class="container"><blockquote class="quote-band__quote">' + t('platformpage.quote') + '</blockquote></div></section>';
  return { titleKey: 'platformpage.title', descKey: 'meta.platform', activePage: 'platform', bodyHtml: body, init: null };
}
