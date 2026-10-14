// MedPobeda - Subscription Plans Page (no invented prices or features)
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { showPaymentModal } from '../components/modal.js';
import { whyChooseHtml } from '../components/why-choose.js';

export function renderPlans() {
  const plans = ['starter', 'standard', 'premium'].map((p, i) =>
    '<article class="pricing-card' + (i === 1 ? ' pricing-card--featured' : '') + '">' +
    (i === 1 ? '<span class="pricing-card__badge">' + t('home.pricing.popular') + '</span>' : '') +
    '<div class="pricing-card__header"><h3 class="pricing-card__name">' + t('planspage.plan.' + p + '.name') + '</h3>' +
    '<p class="pricing-card__desc">' + t('planspage.plan.' + p + '.desc') + '</p></div>' +
    '<div class="pricing-card__price"><span class="pricing-card__amount">' + t('planspage.price.soon') + '</span></div>' +
    '<div class="pricing-card__body"><p class="pricing-card__period">' + t('planspage.details.pending') + '</p>' +
    '<p class="pricing-card__desc">' + t('planspage.plan.' + p + '.scope') + '</p></div>' +
    '<button type="button" class="btn btn--primary btn--full plans-cta">' + t('planspage.cta') + '</button></article>'
  ).join('');
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.plans', titleKey: 'planspage.title', ledeKey: 'planspage.lede' }) +
    whyChooseHtml() +
    '<section class="section"><div class="container">' +
    '<div class="pricing__grid">' + plans + '</div>' +
    '<p class="notice-pill notice-pill--amber pricing__note">' + t('planspage.honesty.note') + '</p>' +
    '<p class="notice-pill">' + t('planspage.register.note') + '</p>' +
    '<div class="section-cta"><a class="btn btn--outline" href="' + langPath('register') + '">' + t('home.cta.btn') + '</a></div>' +
    '</div></section>';
  return {
    titleKey: 'planspage.title', descKey: 'meta.plans', activePage: 'plans', bodyHtml: body,
    init: () => document.querySelectorAll('.plans-cta').forEach((b) => b.addEventListener('click', showPaymentModal)),
  };
}
