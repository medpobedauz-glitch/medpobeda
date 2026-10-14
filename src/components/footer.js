// MedPobeda - Shared Footer Component (4 columns)
import { t, getLang, langPath, setLang } from '../i18n/index.js';

function footerLangSelector() {
  const current = getLang().toUpperCase();
  return '<div class="lang-selector lang-selector--footer">' +
    '<button type="button" class="lang-selector__btn" aria-haspopup="true" aria-expanded="false">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
    '<span class="lang-selector__current">' + current + '</span>' +
    '<svg class="lang-selector__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
    '</button>' +
    '<ul class="lang-selector__menu" role="menu">' +
    '<li role="none"><button type="button" role="menuitem" data-lang="uz">O‘zbekcha</button></li>' +
    '<li role="none"><button type="button" role="menuitem" data-lang="ru">Русский</button></li>' +
    '<li role="none"><button type="button" role="menuitem" data-lang="en">English</button></li>' +
    '</ul>' +
    '</div>';
}

export function renderFooter() {
  const host = document.getElementById('site-footer');
  if (!host) return;
  const li = (name, href) => '<li><a href="' + href + '">' + t(name) + '</a></li>';
  const lp = langPath;
  host.innerHTML =
    '<footer class="footer">' +
    '<div class="footer__inner">' +
    '<div class="footer__grid">' +
    // Column 1: brand
    '<div class="footer__col footer__col--brand">' +
    '<a class="brand brand--footer" href="' + lp('') + '" aria-label="MedPobeda">' +
    '<svg class="brand__mark" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">' +
    '<rect x="1" y="1" width="28" height="28" rx="8" fill="#00072D"/>' +
    '<path d="M15 8v14M8 15h14" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/></svg>' +
    '<span class="brand__word"><span class="brand__med">Med</span><span class="brand__pobeda">Pobeda</span></span></a>' +
    '<p class="footer__desc">' + t('footer.desc') + '</p>' +
    footerLangSelector() +
    '</div>' +
    // Column 2: Education
    '<nav class="footer__col" aria-label="' + t('footer.col.education') + '">' +
    '<h3 class="footer__title">' + t('footer.col.education') + '</h3>' +
    '<ul class="footer__links">' +
    li('nav.curricula', lp('curricula')) +
    li('nav.subjects', lp('subjects')) +
    li('nav.faculty', lp('faculty')) +
    '<li class="nav-auth-only" style="display:none"><a href="' + lp('qbank') + '">' + t('nav.qbank') + '</a></li>' +
    li('nav.tests', lp('tests')) +
    '</ul></nav>' +
    // Column 3: Platform
    '<nav class="footer__col" aria-label="' + t('footer.col.platform') + '">' +
    '<h3 class="footer__title">' + t('footer.col.platform') + '</h3>' +
    '<ul class="footer__links">' +
    li('footer.link.platform', lp('platform')) +
    li('nav.app', lp('app')) +
    li('nav.plans', lp('plans')) +
    li('nav.login', lp('login')) +
    li('nav.register', lp('register')) +
    '</ul></nav>' +
    // Column 4: Company
    '<nav class="footer__col" aria-label="' + t('footer.col.company') + '">' +
    '<h3 class="footer__title">' + t('footer.col.company') + '</h3>' +
    '<ul class="footer__links">' +
    li('footer.link.about', lp('about')) +
    li('footer.link.contact', lp('contact')) +
    li('footer.legal.privacy', lp('legal/privacy')) +
    li('footer.legal.terms', lp('legal/terms')) +
    li('footer.legal.subscription', lp('legal/subscription')) +
    '</ul></nav>' +
    '</div>' +
    '<div class="footer__bottom">' +
    '<p class="footer__copyright">' + t('footer.copyright') + '</p>' +
    '</div>' +
    '</div>' +
    '</footer>';
  initFooter();
}

export function initFooter() {
  document.querySelectorAll('.lang-selector--footer').forEach((root) => {
    const btn = root.querySelector('.lang-selector__btn');
    const menu = root.querySelector('.lang-selector__menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = root.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.querySelectorAll('[data-lang]').forEach((item) => {
      item.addEventListener('click', () => {
        const nextLang = item.getAttribute('data-lang');
        if (nextLang === getLang()) { root.classList.remove('is-open'); return; }
        setLang(nextLang);
        const path = window.location.pathname.replace(/^\/(uz|ru|en|hi)/, '/' + nextLang);
        window.location.href = path + window.location.search;
      });
    });
  });
}