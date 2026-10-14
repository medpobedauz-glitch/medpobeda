// MedPobeda - Shared Page Helpers
// mountPage lives in routes.js; this module holds reusable page-section helpers.
import { t, getLang } from '../i18n/index.js';

export function pageHeader({ breadcrumb, titleKey, ledeKey }) {
  return '<section class="page-hero">' +
    '<div class="container">' +
    '<nav class="page-hero__breadcrumb" aria-label="Breadcrumb">' +
    '<a href="' + breadcrumbHomeHref() + '">' + t('common.breadcrumb.home') + '</a>' +
    '<span class="page-hero__sep" aria-hidden="true">/</span>' +
    '<span aria-current="page">' + breadcrumb + '</span>' +
    '</nav>' +
    '<h1 class="page-hero__title">' + t(titleKey) + '</h1>' +
    (ledeKey ? '<p class="page-hero__lede">' + t(ledeKey) + '</p>' : '') +
    '</div>' +
    '</section>';
}

function breadcrumbHomeHref() {
  return '/' + getLang() + '/';
}
