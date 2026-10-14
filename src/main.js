// MedPobeda - Main Entry Point
import { initRouter } from './router/index.js';
import { routes, notFoundRoute } from './routes.js';
import { setLang, isValidLang, DEFAULT_LANG } from './i18n/index.js';

import './styles/site.css';
import './styles/curricula.css';
import './styles/pages.css';
import './styles/anatomy.css';
import './styles/anatomy-dashboard.css';
import './styles/admin.css';
import './styles/mobile-fixes.css';

// Initialise language from the URL before the first render (default: Uzbek).
(function initLangFromUrl() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isValidLang(segments[0])) {
    setLang(segments[0]);
  } else {
    setLang(DEFAULT_LANG);
  }
})();

initRouter({
  routes,
  notFound: notFoundRoute,
});

