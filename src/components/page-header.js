// MedPobeda - Page Header Component (breadcrumb + page title + lede)
// String builder: pages embed the returned HTML in their bodyHtml.
import { t, langPath } from '../i18n/index.js';

export function pageHeaderHtml({ breadcrumbKey, titleKey, ledeKey, badgeKey }) {
  return (
    '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    '<div class="breadcrumb__inner">' +
    '<a href="' + langPath('') + '" class="breadcrumb__link">' + t('common.breadcrumb.home') + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<span class="breadcrumb__current" aria-current="page">' + t(breadcrumbKey) + '</span>' +
    '</div>' +
    '</nav>' +
    '<header class="page-header">' +
    '<div class="page-header__inner">' +
    (badgeKey ? '<p class="page-header__eyebrow">' + t(badgeKey) + '</p>' : '') +
    '<h1 class="page-header__title">' + t(titleKey) + '</h1>' +
    (ledeKey ? '<p class="page-header__lede">' + t(ledeKey) + '</p>' : '') +
    '</div>' +
    '</header>'
  );
}

export function renderPageHeader(page) {
  // Legacy DOM-injection variant kept for compatibility.
  const main = document.getElementById('main-content');
  if (main) main.insertAdjacentHTML('afterbegin', pageHeaderHtml(page));
}

export function initPageHeader() { /* rendered inline with page */ }
