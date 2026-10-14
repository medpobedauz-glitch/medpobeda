// MedPobeda - About Page
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

export function renderAbout() {
  const challenge = ['about.ch1', 'about.ch2', 'about.ch3'].map((k) =>
    '<li class="about-list__item"><span class="about-list__icon" aria-hidden="true">✓</span>' + t(k) + '</li>'
  ).join('');
  const body =
    pageHeaderHtml({ breadcrumbKey: 'footer.link.about', titleKey: 'about.title', ledeKey: 'about.lede' }) +
    '<section class="section"><div class="container about-grid">' +
    '<div class="about-block"><h2 class="about-block__title">' + t('about.why.title') + '</h2>' +
    '<p class="about-block__text">' + t('about.why.p1') + '</p>' +
    '<p class="about-block__text">' + t('about.why.p2') + '</p></div>' +
    '<div class="about-block"><h2 class="about-block__title">' + t('about.challenges.title') + '</h2>' +
    '<ul class="about-list">' + challenge + '</ul></div></div></section>' +
    '<section class="section section--alt"><div class="container about-grid">' +
    '<div class="about-block"><h2 class="about-block__title">' + t('about.approach.title') + '</h2>' +
    '<p class="about-block__text">' + t('about.approach.p') + '</p></div>' +
    '<div class="about-block"><h2 class="about-block__title">' + t('about.uz.title') + '</h2>' +
    '<p class="about-block__text">' + t('about.uz.p') + '</p></div></div></section>' +
    '<section class="quote-band"><div class="container"><blockquote class="quote-band__quote">' + t('about.quote') + '</blockquote></div></section>' +
    '<section class="section"><div class="container about-grid">' +
    '<div class="about-block"><h2 class="about-block__title">' + t('about.vision.title') + '</h2>' +
    '<p class="about-block__text">' + t('about.vision.p') + '</p></div>' +
    '<div class="about-block about-block--card"><h2 class="about-block__title">' + t('about.status.title') + '</h2>' +
    '<p class="about-block__text">' + t('about.status.p') + '</p>' +
    '<p class="notice-pill">' + t('common.notice.planned') + '</p></div></div></section>';
  return { titleKey: 'about.title', descKey: 'meta.about', activePage: 'about', bodyHtml: body, init: null };
}
