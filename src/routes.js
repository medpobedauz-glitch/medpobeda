import {renderAdminSources} from './pages/admin-qbank.js';
import { getCard } from './data/anatomy-dashboard.js';
import { requireStudent } from './auth-state.js';
// MedPobeda - Central Route Configuration
// Single source of truth for every public route. Each page module exports a
// render function returning {titleKey, descKey, activePage, bodyHtml, init};
// mountPage() wraps it with the shared header/footer shell and metadata.
import { t, setLang, getLang, translatePage } from './i18n/index.js';
import { renderHeader, applyAuthUI } from './components/header.js';
import { renderFooter } from './components/footer.js';

import { renderHome } from './pages/home.js';
import { renderNotFound } from './pages/404.js';

// 404 handler: mounted through the same shared shell.
export function notFoundRoute() {
  mountPage(renderNotFound());
}

import { renderAbout } from './pages/about.js';
import { renderCurricula } from './pages/curricula.js';
import { renderCurriculumDetail } from './pages/curriculum-detail.js';
import { renderSubjects } from './pages/subjects.js';
import { renderAnatomy3D } from './pages/anatomy-3d.js';
import { renderAnatomyDashboard } from './pages/anatomy-dashboard.js';
import { renderFaculty } from './pages/faculty.js';
import { renderPlatform } from './pages/platform.js';
import { renderQbank } from './pages/qbank.js';
import { renderTests } from './pages/tests.js';
import { renderPlans } from './pages/plans.js';
import { renderApp } from './pages/app.js';
import { renderContact } from './pages/contact.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderAccount } from './pages/account.js';
import { renderStudentDashboard } from './pages/student-dashboard.js';
import { renderLegal } from './pages/legal.js';
import { renderAdminLogin } from './pages/admin-login.js';
import { renderAdminDashboard } from './pages/admin-dashboard.js';
import { renderAdminCurricula } from './pages/admin-curricula.js';
import { renderAdminSubjects } from './pages/admin-subjects.js';
import { renderAdminModules } from './pages/admin-modules.js';
import { renderAdminTopics } from './pages/admin-topics.js';
import { renderAdminQuestions } from './pages/admin-questions.js';
import { renderAdminPdfImport } from './pages/admin-pdf-import.js';
import { renderAdminUsers } from './pages/admin-users.js';
import { renderAdminAudit } from './pages/admin-audit.js';
import { renderLearn } from './pages/learn.js';

// Shared shell: header + footer + main content + document metadata.
export function mountPage(config) {
  const lang = getLang();
  setLang(lang); // syncs <html lang> attribute
  document.title = config.titleKey ? t(config.titleKey) : 'MedPobeda';
  const meta = document.querySelector('meta[name="description"]');
  if (meta && config.descKey) meta.setAttribute('content', t(config.descKey));
  renderHeader(config.activePage);
  renderFooter();
  applyAuthUI();
  const main = document.getElementById('main-content');
  // Dispose any previous page-level 3D viewer (canvas, event listeners, rAF loop).
  if (typeof window.__anatomyViewerDispose === 'function') {
    try { window.__anatomyViewerDispose(); } catch (e) { /* viewer cleanup is opportunistic */ }
    window.__anatomyViewerDispose = null;
  }
  document.body.classList.toggle('anatomy-app',!!config.immersive);
  if (main) main.innerHTML = config.bodyHtml || '';
  translatePage();
  if (typeof config.init === 'function') config.init();
}

// Renders a page inside the shared shell; params are optional route params.
const page = (renderFn) => (lang, params) => mountPage(renderFn(lang, params));

const anatomyPage = (renderFn) => async (lang, params) => {
 const destination=location.pathname+location.search;
 mountPage({bodyHtml:'<div class="container" role="status" style="padding:64px">…</div>'});
 const signedIn=await requireStudent(destination);
 if(!signedIn || destination!==location.pathname+location.search)return;
 if(location.pathname.endsWith('/anatomy-3d')&&!new URLSearchParams(location.search).has('topic')){
  location.replace('/'+lang+'/anatomy');return;
 }
 const topic=new URLSearchParams(location.search).get('topic');
 if(topic && (!getCard(topic)||getCard(topic).status!=='available')){
  location.replace('/'+lang+'/anatomy');return;
 }
 mountPage(renderFn(lang,params));
};
export const routes = [
  { path: '/', name: 'home', render: page(renderHome) },
  { path: '/about', name: 'about', render: page(renderAbout) },
  { path: '/curricula', name: 'curricula', render: page(renderCurricula) },
  { path: '/curricula/:track', name: 'curriculum-detail', render: page(renderCurriculumDetail) },
  { path: '/subjects', name: 'subjects', render: page(renderSubjects) },
  { path: '/anatomy-3d', name: 'anatomy-3d', render: anatomyPage(renderAnatomy3D) },
  { path: '/anatomy', name: 'anatomy', render: anatomyPage(renderAnatomyDashboard) },
  { path: '/faculty', name: 'faculty', render: page(renderFaculty) },
  { path: '/platform', name: 'platform', render: page(renderPlatform) },
  { path: '/qbank', name: 'qbank', render: page(renderQbank) },
  { path: '/learn/:curriculum/:subject', name: 'learn', render: page(renderLearn) },
  { path: '/tests', name: 'tests', render: page(renderTests) },
  { path: '/plans', name: 'plans', render: page(renderPlans) },
  { path: '/app', name: 'app', render: page(renderApp) },
  { path: '/contact', name: 'contact', render: page(renderContact) },
  { path: '/login', name: 'login', render: page(renderLogin) },
  { path: '/register', name: 'register', render: page(renderRegister) },
  { path: '/account', name: 'account', render: page(renderAccount) },
  { path: '/dashboard', name: 'dashboard', render: anatomyPage(renderStudentDashboard) },
  { path: '/admin/login', name: 'admin-login', render: page(renderAdminLogin) },
  { path: '/admin', name: 'admin-dashboard', render: page(renderAdminDashboard) },
  { path: '/admin/curricula', name: 'admin-curricula', render: page(renderAdminCurricula) },
  { path: '/admin/subjects', name: 'admin-subjects', render: page(renderAdminSubjects) },
  { path: '/admin/modules', name: 'admin-modules', render: page(renderAdminModules) },
  { path: '/admin/topics', name: 'admin-topics', render: page(renderAdminTopics) },
  { path: '/admin/questions', name: 'admin-questions', render: page(renderAdminQuestions) },
  { path: '/admin/qbank', name: 'admin-qbank', render: page(renderAdminQuestions) },
  { path: '/admin/sources', name: 'admin-sources', render: page(renderAdminSources) },
  { path: '/admin/pdf-import', name: 'admin-pdf-import', render: page(renderAdminPdfImport) },
  { path: '/admin/users', name: 'admin-users', render: page(renderAdminUsers) },
  { path: '/admin/audit', name: 'admin-audit', render: page(renderAdminAudit) },
  { path: '/legal/privacy', name: 'legal-privacy', render: page((lang) => renderLegal(lang, 'privacy')) },
  { path: '/legal/terms', name: 'legal-terms', render: page((lang) => renderLegal(lang, 'terms')) },
  { path: '/legal/subscription', name: 'legal-subscription', render: page((lang) => renderLegal(lang, 'subscription')) },
];
