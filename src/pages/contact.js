// MedPobeda - Contact Page (labelled placeholders until verified details arrive)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { showContactModal } from '../components/modal.js';

export function renderContact() {
  const item = (icon, labelKey) =>
    '<div class="contact-item"><span class="contact-item__icon" aria-hidden="true">' + icon + '</span>' +
    '<div><h3 class="contact-item__label">' + t(labelKey) + '</h3>' +
    '<p class="contact-item__value">' + t(labelKey + '.value') + '</p></div></div>';

  const PHONE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.9.7a2 2 0 0 1 1.6 1.9z"/></svg>';
  const MAIL_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>';
  const PIN_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  const CLOCK_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';

  const body =
    pageHeaderHtml({ breadcrumbKey: 'footer.link.contact', titleKey: 'contactpage.title', ledeKey: 'contactpage.lede' }) +
    '<section class="section"><div class="container contact-grid">' +
    '<div class="contact-items">' +
    item(PHONE_SVG, 'contactpage.phone') +
    item(MAIL_SVG, 'contactpage.email') +
    item(PIN_SVG, 'contactpage.address') +
    item(CLOCK_SVG, 'contactpage.hours') +
    '</div>' +
    '<div class="contact-form-wrap">' +
    '<h2 class="contact-form__title">' + t('contactpage.form.title') + '</h2>' +
    '<form class="contact-form" id="contact-form" novalidate>' +
    '<div class="form-field"><label class="form-label" for="cf-name">' + t('contactpage.form.name') + '</label>' +
    '<input class="form-input" id="cf-name" name="name" type="text" autocomplete="name" required></div>' +
    '<div class="form-field"><label class="form-label" for="cf-contact">' + t('contactpage.form.contact') + '</label>' +
    '<input class="form-input" id="cf-contact" name="contact" type="text" autocomplete="email" required></div>' +
    '<div class="form-field"><label class="form-label" for="cf-message">' + t('contactpage.form.message') + '</label>' +
    '<textarea class="form-input form-textarea" id="cf-message" name="message" rows="5" required></textarea></div>' +
    '<button class="btn btn--primary btn--full" type="submit">' + t('contactpage.form.submit') + '</button>' +
    '<p class="form-note">' + t('contactpage.form.note') + '</p>' +
    '</form></div>' +
    '</div></section>';
  return {
    titleKey: 'contactpage.title', descKey: 'meta.contact', activePage: 'contact', bodyHtml: body,
    init: () => {
      const form = document.getElementById('contact-form');
      if (form) form.addEventListener('submit', (e) => { e.preventDefault(); showContactModal(); });
    },
  };
}
