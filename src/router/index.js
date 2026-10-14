// MedPobeda - Central Router
// Handles /{lang}/{page} URLs, browser back/forward, link interception, 404.
import { getLang, isValidLang, DEFAULT_LANG } from '../i18n/index.js';

let routes = [];
let notFoundHandler = null;
let currentRoute = null;
let popstateHandler = null;
let clickHandler = null;

export function parsePath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const segments = clean.split('/').filter(Boolean);
  let lang = null;
  let pagePath = clean;
  if (segments.length > 0 && isValidLang(segments[0])) {
    lang = segments[0];
    pagePath = '/' + segments.slice(1).join('/');
    if (pagePath !== '/' && pagePath.endsWith('/')) pagePath = pagePath.replace(/\/+$/, '') || '/';
  }
  return { lang, pagePath, hasLangPrefix: lang !== null };
}

export function matchRoute(pagePath) {
  const normalized = pagePath === '' ? '/' : pagePath.replace(/\/+$/, '') || '/';
  for (const route of routes) {
    if (route.path === normalized) return route;
    if (route.aliases) {
      for (const alias of route.aliases) {
        if (alias === normalized) return route;
      }
    }
  }
  // Dynamic parameterised routes, e.g. /learn/:curriculum/:subject
  for (const route of routes) {
    if (route.path.indexOf(':') === -1) continue;
    const compiled = compileRoute(route);
    const m = normalized.match(compiled.regex);
    if (m) return { ...route, params: compiled.extract(m) };
  }
  return null;
}

function compileRoute(route) {
  if (route._compiled) return route._compiled;
  const parts = route.path.split('/').filter(Boolean);
  let src = '^/';
  const names = [];
  parts.forEach((part, i) => {
    if (i > 0) src += '/';
    if (part.startsWith(':')) {
      src += '([^/]+)';
      names.push(part.slice(1));
    } else {
      src += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  });
  const regex = new RegExp(src + '$');
  route._compiled = {
    regex,
    names,
    extract: (m) => {
      const out = {};
      names.forEach((name, i) => { out[name] = decodeURIComponent(m[i + 1]); });
      return out;
    },
  };
  return route._compiled;
}

function renderCurrent() {
  const { lang, pagePath, hasLangPrefix } = parsePath(window.location.pathname);
  // Invalid or missing language prefix: redirect to Uzbek default, preserving the page path.
  if (!hasLangPrefix || !isValidLang(lang)) {
    const query = window.location.search || '';
    window.location.replace('/' + DEFAULT_LANG + (pagePath === '/' ? '/' : pagePath) + query);
    return;
  }
  const route = matchRoute(pagePath);
  if (!route) {
    if (notFoundHandler) notFoundHandler(lang);
    return;
  }
  currentRoute = { name: route.name, lang, pagePath };
  // Give the outgoing page a chance to release heavy resources (WebGL viewer,
  // render loop, listeners) before the next page replaces the DOM. Without
  // this, navigating away from /anatomy-3d would leave the render loop and
  // event listeners alive on detached nodes.
  if (typeof window.__anatomyViewerDispose === 'function') {
    try { window.__anatomyViewerDispose(); } catch (e) { /* keep rendering */ }
  }
  route.render(lang, route.params || {});
  window.scrollTo(0, 0);
}

export function navigate(href, opts) {
  const replace = opts && opts.replace;
  if (replace) window.location.replace(href);
  else window.history.pushState({}, '', href);
  renderCurrent();
}

export function initRouter(config) {
  routes = config.routes || [];
  notFoundHandler = config.notFound || null;

  popstateHandler = () => renderCurrent();
  window.addEventListener('popstate', popstateHandler);

  // Intercept internal same-origin link clicks for SPA navigation.
  clickHandler = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = e.target.closest && e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const target = new URL(anchor.href, window.location.origin);
    if (target.origin !== window.location.origin) return;
    const targetParsed = parsePath(target.pathname);
    if (!targetParsed.hasLangPrefix) return; // e.g. asset links
    e.preventDefault();
    navigate(target.pathname + target.search);
  };
  document.addEventListener('click', clickHandler);

  renderCurrent();
}

export function getCurrentRoute() {
  return currentRoute;
}
