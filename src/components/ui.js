// MedPobeda - Shared UI Helpers (used by all pages)
import { t, getLang, langPath } from '../i18n/index.js';
import { icon } from './icons.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Section heading block: eyebrow + h2 + optional subtitle
export function sectionHead(eyebrowKey, titleKey, subKey, align = 'center') {
  return '<div class="section-head section-head--' + align + '">' +
    (eyebrowKey ? '<span class="section-head__eyebrow">' + t(eyebrowKey) + '</span>' : '') +
    '<h2 class="section-head__title">' + t(titleKey) + '</h2>' +
    (subKey ? '<p class="section-head__subtitle">' + t(subKey) + '</p>' : '') +
    '</div>';
}

// Status pill: available / dev / planned
export function statusPill(kind) {
  const keyMap = { available: 'common.status.available', dev: 'common.status.dev', planned: 'common.status.planned' };
  return '<span class="status-pill status-pill--' + kind + '">' +
    '<span class="status-pill__dot"></span>' + t(keyMap[kind] || keyMap.planned) + '</span>';
}

// Breadcrumb: Home / Current
export function breadcrumb(currentKey) {
  return '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    '<div class="breadcrumb__inner">' +
    '<a class="breadcrumb__link" href="' + langPath('') + '">' + t('common.breadcrumb.home') + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<span class="breadcrumb__current" aria-current="page">' + t(currentKey) + '</span>' +
    '</div></nav>';
}

// Standard page header: breadcrumb + h1 + lede
export function pageHead(breadcrumbKey, titleKey, ledeKey) {
  return breadcrumb(breadcrumbKey) +
    '<section class="page-head"><div class="page-head__inner">' +
    '<h1 class="page-head__title">' + t(titleKey) + '</h1>' +
    (ledeKey ? '<p class="page-head__lede">' + t(ledeKey) + '</p>' : '') +
    '</div></section>';
}

// Info notice bar (sample data / awaiting confirmation)
export function notice(text, kind = 'info') {
  return '<div class="notice notice--' + kind + '" role="note">' +
    icon('info') + '<p>' + esc(text) + '</p></div>';
}

// Feature card with icon, title, description and optional status
export function featureCard(iconName, titleKey, descKey, status = null) {
  return '<article class="feature-card">' +
    '<div class="feature-card__icon">' + icon(iconName) + '</div>' +
    '<h3 class="feature-card__title">' + t(titleKey) + '</h3>' +
    '<p class="feature-card__desc">' + t(descKey) + '</p>' +
    (status ? statusPill(status) : '') +
    '</article>';
}

// CTA section with primary + secondary buttons
export function ctaSection(titleKey, textKey, btnKey, btnHref, secondaryKey = null, secondaryHref = null) {
  return '<section class="cta-section"><div class="cta-section__inner">' +
    '<h2 class="cta-section__title">' + t(titleKey) + '</h2>' +
    (textKey ? '<p class="cta-section__text">' + t(textKey) + '</p>' : '') +
    '<div class="cta-section__actions">' +
    '<a class="btn btn--primary btn-lg" href="' + btnHref + '">' + t(btnKey) + '</a>' +
    (secondaryKey ? '<a class="btn btn--ghost btn-lg" href="' + secondaryHref + '">' + t(secondaryKey) + '</a>' : '') +
    '</div></div></section>';
}

// Patriotic quote band (used sparingly, one per page max)
export function quoteBand(quoteText, attributionKey = null) {
  return '<section class="quote-band"><div class="quote-band__inner">' +
    '<p class="quote-band__text">\u201C' + esc(quoteText) + '\u201D</p>' +
    (attributionKey ? '<p class="quote-band__attr">' + t(attributionKey) + '</p>' : '') +
    '</div></section>';
}

// Numbered step list item
export function stepItem(num, titleKey, descKey) {
  return '<li class="step-item">' +
    '<span class="step-item__num" aria-hidden="true">' + num + '</span>' +
    '<div class="step-item__body">' +
    '<h3 class="step-item__title">' + t(titleKey) + '</h3>' +
    '<p class="step-item__desc">' + t(descKey) + '</p>' +
    '</div></li>';
}

// Form field: label + input
export function formField(type, name, labelKey, opts = {}) {
  const req = opts.required ? ' required' : '';
  const ph = opts.placeholderKey ? ' placeholder="' + t(opts.placeholderKey) + '"' : '';
  const autoComplete = opts.autocomplete ? ' autocomplete="' + opts.autocomplete + '"' : '';
  const selectHtml = opts.options ? opts.options : '';
  const tag = type === 'select' ? 'select' : 'input';
  const attrs = type === 'select' ? '' : ' type="' + type + '" id="' + name + '" name="' + name + '"' + ph + autoComplete;
  return '<div class="form-field">' +
    '<label class="form-field__label" for="' + name + '">' + t(labelKey) + (opts.required ? ' <span class="form-field__req" aria-hidden="true">*</span>' : '') + '</label>' +
    '<' + tag + ' class="form-field__control"' + attrs + req + '>' + selectHtml + (tag === 'select' ? '</select>' : '') +
    '</div>';
}

export { esc, t, getLang, langPath };