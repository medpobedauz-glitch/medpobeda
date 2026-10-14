// MedPobeda - Shared Header Component
// Shared page links, Education dropdown, language selector and mobile drawer.
import { t, getLang, langPath, setLang } from '../i18n/index.js';
import { student, logout } from '../auth-state.js';

// Reflects the sign-in state in the shared header/footer without a reload:
// hides QBank for guests; swaps Login/Register for "My account" + "Log out".
export function applyAuthUI() {
  student().then((s) => {
    const signedIn = Boolean(s);
    const show = (el, visible) => { if (!el) return; el.hidden = !visible; el.style.display = visible ? '' : 'none'; };
    document.querySelectorAll('.nav-auth-only').forEach((el) => show(el, signedIn));
    document.querySelectorAll('.header__auth-guest').forEach((el) => show(el, !signedIn));
    document.querySelectorAll('.header__mobile-account').forEach((el) => show(el, signedIn));
    document.querySelectorAll('.header__mobile-logout').forEach((el) => show(el, signedIn));
    const authEl = document.getElementById('header-auth');
    if (authEl) {
      if (signedIn) {
        const lang = document.documentElement.lang || 'uz';
          authEl.innerHTML =
            '<a class="btn btn--outline btn-sm header__account" href="/' + lang + '/dashboard">' + t('nav.account') + '</a>' +
            '<button type="button" class="btn btn--outline btn-sm header__logout" data-action="logout">' + t('nav.logout') + '</button>';
      } else { authEl.innerHTML = ''; }
    }
  });
}

function signOut(btn) {
  if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
  logout().finally(() => { window.location.replace(langPath('')); });
}

function brandHtml(href) {
  return '<a class="brand" href="' + href + '" aria-label="MedPobeda">' +
    '<svg class="brand__mark" width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">' +
    '<rect x="1" y="1" width="28" height="28" rx="8" fill="#00072D"/>' +
    '<path d="M15 8v14M8 15h14" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>' +
    '</svg>' +
    '<span class="brand__word"><span class="brand__med">Med</span><span class="brand__pobeda">Pobeda</span></span>' +
    '</a>';
}

function langSelectorHtml() {
  const current = getLang().toUpperCase();
  return '<div class="lang-selector">' +
    '<button type="button" class="lang-selector__btn" aria-haspopup="true" aria-expanded="false">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
    '<span class="lang-selector__current">' + current + '</span>' +
    '<svg class="lang-selector__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
    '</button>' +
    '<ul class="lang-selector__menu" role="menu">' +
    '<li role="none"><button type="button" role="menuitem" data-lang="uz">O\'zbekcha</button></li>' +
    '<li role="none"><button type="button" role="menuitem" data-lang="ru">Русский</button></li>' +
    '<li role="none"><button type="button" role="menuitem" data-lang="en">English</button></li>' +
    '</ul>' +
    '</div>';
}

function navItemsHtml(activePage) {
  const link = (name, href) => {
    const isActive = activePage === name || name==='anatomy-3d'&&activePage==='anatomy';
    const cls = 'nav__link' + (isActive ? ' is-active' : '');
    const aria = isActive ? ' aria-current="page"' : '';
    return '<a class="' + cls + '" data-nav="' + name + '" href="' + href + '"' + aria + '>' + t('nav.' + name) + '</a>';
  };
  const education = ['curricula','subjects','tests','faculty','platform','app','about'];
  const dropActive = education.includes(activePage);
  return '<ul class="nav__list">' +
    '<li>' + link('home',langPath('')) + '</li>' +
    '<li>' + link('anatomy-3d',langPath('anatomy')) + '</li>' +
    '<li>' + link('qbank',langPath('qbank')) + '</li>' +
    '<li class="nav__item--dropdown"><button type="button" class="nav__link nav__dropdown-btn'+(dropActive?' is-active':'')+'" aria-haspopup="true" aria-expanded="false">'+t('nav.education')+
    '<svg class="nav__chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'+
    '<ul class="nav__dropdown" role="menu">'+education.map(name=>'<li role="none"><a role="menuitem" class="nav__dropdown-link'+(activePage===name?' is-active':'')+'" href="'+langPath(name)+'">'+t('nav.'+name)+'</a></li>').join('')+'</ul></li>'+
    '<li>'+link('plans',langPath('plans'))+'</li>'+
    '<li>'+link('contact',langPath('contact'))+'</li></ul>';

}

export function renderHeader(activePage) {
  const header = document.getElementById('site-header');
  if (!header) return;
  const isAnatomy = activePage === 'anatomy' || activePage === 'anatomy-3d';
  header.className = 'header' + (isAnatomy ? ' header--dark' : '');
  header.innerHTML =
    '<div class="header__inner">' +
    brandHtml(langPath('')) +
    '<nav class="nav" id="site-nav" aria-label="'+t('nav.menu')+'">' + navItemsHtml(activePage) + '<div class="nav__mobile-actions header__auth-guest"><a class="btn btn--outline" href="'+langPath('login')+'">'+t('nav.login')+'</a></div></nav>' +
    langSelectorHtml() +
    '<div class="header__actions">' +
    '<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
    '</button>' +
    '<div class="header__auth" id="header-auth"></div>' +
    '<a class="btn btn--outline btn-sm header__login header__auth-guest" href="' + langPath('login') + '">' + t('nav.login') + '</a>' +
    '</div>' +
    '<button class="header__burger" aria-label="Toggle menu" aria-expanded="false">' +
    '<span class="header__burger-line"></span><span class="header__burger-line"></span><span class="header__burger-line"></span>' +
    '</button>' +
    '</div>' +
    '<div class="header__mobile">' +
    '<div class="header__mobile-account" hidden><a class="btn btn--outline btn-sm" href="' + langPath('dashboard') + '">' + t('nav.account') + '</a></div>' +
    '<div class="header__mobile-logout" hidden><button type="button" class="btn btn--outline btn-sm" data-action="logout">' + t('nav.logout') + '</button></div>' +
    '</div>';
  initHeader();
}

export function initHeader() {
  document.querySelectorAll('#site-header .lang-selector').forEach((root) => {
    const btn = root.querySelector('.lang-selector__btn');
    const menu = root.querySelector('.lang-selector__menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = root.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target)) { root.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { root.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
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

  document.querySelectorAll('.nav__item--dropdown').forEach((item) => {
    const btn = item.querySelector('.nav__dropdown-btn');
    if (!btn) return;
    const close = () => { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => { if (!item.contains(e.target)) close(); });
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); btn.focus(); } });
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) close(); });
  });

  const headerEl = document.querySelector('.header');
  if (headerEl) {
    headerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="logout"]');
      if (!btn) return;
      e.preventDefault();
      signOut(btn);
    });
  }

  const burger = document.querySelector('.header__burger');
  const nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      document.body.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      document.body.classList.remove('nav-open');
      if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
    }
  });

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
}
