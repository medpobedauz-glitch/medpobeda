// MedPobeda - Legal Placeholder Pages (final texts awaiting approval)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

const DOCS = {
  privacy: { titleKey: 'legalpage.privacy.title', textKey: 'legalpage.privacy.text', crumbKey: 'footer.legal.privacy' },
  terms: { titleKey: 'legalpage.terms.title', textKey: 'legalpage.terms.text', crumbKey: 'footer.legal.terms' },
  subscription: { titleKey: 'legalpage.subscription.title', textKey: 'legalpage.subscription.text', crumbKey: 'footer.legal.subscription' },
};

export function renderLegal(_lang, doc) {
  const d = DOCS[doc] || DOCS.privacy;
  const body =
    pageHeaderHtml({ breadcrumbKey: d.crumbKey, titleKey: d.titleKey }) +
    '<section class="section"><div class="container legal-page">' +
    '<p class="notice-pill notice-pill--amber">' + t('legalpage.pending') + '</p>' +
    '<p class="legal-page__text">' + t(d.textKey) + '</p>' +
    '</div></section>';
  return { titleKey: d.titleKey, descKey: d.textKey, activePage: '', bodyHtml: body, init: null };
}
