// MedPobeda - App Page (planned website-to-app experience, no store links)
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

export function renderApp() {
  const steps = [1, 2, 3, 4, 5].map((n) =>
    '<li class="qb-step"><span class="qb-step__num">' + n + '</span>' +
    '<div><h3 class="qb-step__title">' + t('apppage.step' + n) + '</h3></div></li>'
  ).join('');
  const body =
    pageHeaderHtml({ breadcrumbKey: 'apppage.breadcrumb', titleKey: 'apppage.title', ledeKey: 'apppage.lede' }) +
    '<section class="section"><div class="container qbank-grid">' +
    '<ol class="qb-steps">' + steps + '</ol>' +
    '<div class="app-visual" aria-hidden="true">' +
    '<div class="app-visual__phone"><div class="app-section__phone-screen">' +
    '<div class="app-section__phone-header">' + t('apppage.phone.title') + '</div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.hero.card.subject') + '</span><span class="app-section__phone-value">' + t('home.hero.card.topic') + '</span></div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.app.card2') + '</span><span class="app-section__phone-value">68%</span></div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.app.card3') + '</span><span class="app-section__phone-value">7</span></div>' +
    '</div></div>' +
    '<p class="app-visual__note">' + t('apppage.phone.note') + '</p></div>' +
    '</div></section>' +
    '<section class="section section--alt"><div class="container about-grid">' +
    '<div class="about-block"><h2 class="about-block__title">' + t('apppage.sync.title') + '</h2>' +
    '<p class="about-block__text">' + t('apppage.sync.desc') + '</p></div>' +
    '<div class="about-block about-block--card"><h2 class="about-block__title">' + t('apppage.planned') + '</h2>' +
    '<p class="about-block__text">' + t('apppage.planned.text') + '</p>' +
    '<p class="notice-pill">' + t('common.notice.planned') + '</p></div></div></section>' +
    '<section class="cta-band"><div class="container"><h2 class="cta-band__title">' + t('home.app.title') + '</h2>' +
    '<p class="cta-band__text">' + t('home.app.subtitle') + '</p>' +
    '<a class="btn btn--primary btn--lg" href="' + langPath('register') + '">' + t('home.cta.btn') + '</a></div></section>';
  return { titleKey: 'apppage.title', descKey: 'meta.app', activePage: 'app', bodyHtml: body, init: null };
}
