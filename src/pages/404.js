// MedPobeda - 404 Page (all languages via central i18n)
import { t, langPath } from '../i18n/index.js';

export function renderNotFound() {
  const body =
    '<section class="notfound"><div class="container notfound__inner">' +
    '<p class="notfound__code" aria-hidden="true">404</p>' +
    '<h1 class="notfound__title">' + t('notfound.title') + '</h1>' +
    '<p class="notfound__text">' + t('notfound.text') + '</p>' +
    '<div class="notfound__actions">' +
    '<a class="btn btn--primary btn--lg" href="' + langPath('') + '">' + t('notfound.action') + '</a>' +
    '</div></div></section>';
  return { titleKey: 'notfound.title', descKey: 'notfound.text', activePage: '', bodyHtml: body, init: null };
}
