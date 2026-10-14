import {showCommunityAnswer} from '../components/question-community.js';
import '../styles/student-question.css';
import { setBookmark } from '../components/question-bookmarks.js';
import '../styles/question-features.css';
import '../styles/explanation-editor.css';
import { moduleArtHtml } from '../theme/module-art.js';
import '../styles/learn-modules.css';
// MedPobeda - Learn Page (student practice drill-down).
// /learn/:curriculum/:subject — publishes subjects from QBank lead here:
// subject overview → modules → topics → MCQ practice session.
// Students only; guests are redirected to login.
import { t, langPath } from '../i18n/index.js';
import { requireStudent } from '../auth-state.js';
import { subjectTint } from '../theme/subject-art.js';
import { qbankArtHtml } from '../theme/qbank-art.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Same title-casing as the QBank cards for all-caps DB names.
function prettyName(name) {
  const s = String(name == null ? '' : name).trim();
  if (s === s.toUpperCase() && /[A-Za-z]/.test(s) && s.length > 2) {
    return s.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (m, p, ch) => p + ch.toUpperCase());
  }
  return s;
}

const state = {
  curSlug: null, subSlug: null,
  curName: '', subName: '',
  modules: null,        // { slug, name, description, questionCount }
  loadedModules: {},    // moduleSlug -> bool
};

function fetchJson(url) {
  return fetch(url, { credentials: 'same-origin' }).then(async (r) => {
    if (!r.ok) throw new Error('request failed: ' + r.status);
    return r.json();
  });
}

function countText(n) {
  return t('learnpage.questions', { n: String(n) });
}

function breadcrumbHtml() {
  return '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    '<div class="breadcrumb__inner">' +
    '<a href="' + langPath('') + '" class="breadcrumb__link">' + t('common.breadcrumb.home') + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<a href="' + langPath('qbank') + '" class="breadcrumb__link">QBank</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<span class="breadcrumb__current" aria-current="page" id="bk-subject">…</span>' +
    '</div></nav>';
}

function subjectDescription(subject) {
  if (subject.long_desc && subject.long_desc.trim()) return subject.long_desc.trim();
  if (subject.short_desc && subject.short_desc.trim()) return subject.short_desc.trim();
  const key = 'qbankpage.subjdesc.' + subject.slug.replace('-lor', '');
  const direct = t(key);
  if (direct && direct !== key) return direct;
  return t('qbankpage.subjdesc.default', { name: (subject.name || '').toLowerCase() || subject.slug });
}

function subjectHeaderHtml(sub) {
  const tint = subjectTint(sub.slug);
  const count = Number(sub.questionCount) || 0;
  const desc = subjectDescription(sub);
  return '<header class="learn-hero">' +
    '<div class="learn-hero__art learn-hero__art--' + tint + '" aria-hidden="true">' + qbankArtHtml(sub.slug) + '</div>' +
    '<div class="learn-hero__body">' +
    '<span class="learn-hero__cur">' + esc(prettyName(state.curName)) + '</span>' +
    '<h1 class="learn-hero__title">' + esc(prettyName(sub.name)) + '</h1>' +
    (desc ? '<p class="learn-hero__desc">' + esc(desc) + '</p>' : '') +
    '<p class="learn-hero__stats">' + countText(count) + ' · <a class="learn-hero__back" href="' + langPath('qbank') + '">' + t('learnpage.back') + '</a></p>' +
    '</div></header>' +
    teacherProfileHtml();
}

// Teacher profile data (can be fetched from API later)
function getTeacherForSubject(subjectSlug) {
  const teachers = {
    'anatomy': { name: 'Dr. Sarah Johnson', specialization: 'Human Anatomy', experience: '12 years', bio: 'Specialized in human anatomy with extensive teaching experience in medical education. Published 20+ research papers on neuroanatomy.' },
    'farmakologiya': { name: 'Dr. Michael Chen', specialization: 'Pharmacology', experience: '8 years', bio: 'Expert in clinical pharmacology and drug interactions. Former hospital pharmacist turned educator.' },
    'biokimyo': { name: 'Dr. Emily Davis', specialization: 'Biochemistry', experience: '10 years', bio: 'Research focus on molecular biology and metabolic pathways. Award-winning medical educator.' },
    'mikrobiologiya': { name: 'Dr. James Wilson', specialization: 'Microbiology', experience: '14 years', bio: 'Leading researcher in infectious diseases and antimicrobial resistance. 30+ publications.' },
    'patologiya': { name: 'Dr. Maria Garcia', specialization: 'Pathology', experience: '11 years', bio: 'Board-certified pathologist with expertise in clinical diagnostics and laboratory medicine.' },
  };
  return teachers[subjectSlug] || { name: 'Dr. Alex Smith', specialization: 'Medical Sciences', experience: '15 years', bio: 'Experienced medical educator with comprehensive knowledge across multiple disciplines.' };
}

function teacherProfileHtml() {
  const teacher = getTeacherForSubject(state.subSlug);
  return '<div class="teacher-card" id="teacher-card">' +
    '<div class="teacher-card__avatar">' + esc(teacher.name.charAt(0)) + '</div>' +
    '<div class="teacher-card__info">' +
    '<span class="teacher-card__label">' + esc(t('learnpage.teacher.title')) + '</span>' +
    '<span class="teacher-card__name">' + esc(teacher.name) + '</span>' +
    '</div>' +
    '<button type="button" class="teacher-card__btn" id="teacher-view-btn">' + esc(t('learnpage.teacher.viewProfile')) + '</button>' +
    '</div>';
}

function showTeacherPopup() {
  const teacher = getTeacherForSubject(state.subSlug);
  const existing = document.getElementById('teacher-popup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'teacher-popup';
  popup.className = 'teacher-popup';
  popup.innerHTML =
    '<div class="teacher-popup__overlay"></div>' +
    '<div class="teacher-popup__content">' +
    '<button class="teacher-popup__close" id="teacher-popup-close">✕</button>' +
    '<div class="teacher-popup__avatar">' + esc(teacher.name.charAt(0)) + '</div>' +
    '<h3 class="teacher-popup__name">' + esc(teacher.name) + '</h3>' +
    '<p class="teacher-popup__spec"><strong>' + esc(t('learnpage.teacher.specialization')) + ':</strong> ' + esc(teacher.specialization) + '</p>' +
    '<p class="teacher-popup__exp"><strong>' + esc(t('learnpage.teacher.experience')) + ':</strong> ' + esc(teacher.experience) + '</p>' +
    '<p class="teacher-popup__bio">' + esc(teacher.bio) + '</p>' +
    '</div>';
  document.body.appendChild(popup);
  // Close handlers
  popup.querySelector('#teacher-popup-close').addEventListener('click', () => popup.remove());
  popup.querySelector('.teacher-popup__overlay').addEventListener('click', () => popup.remove());
}

// Save practice score to server
async function saveScore(topicSlug, correct, total) {
  try {
    await fetch('/api/auth/progress', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicSlug, correct, total, subjectSlug: state.subSlug, curriculumSlug: state.curSlug }),
    });
  } catch (e) {
    // Silently fail - progress tracking is non-critical
  }
}

function moduleLabels() {
  return ({ en: {open:'View topics',search:'Search modules…'}, uz:{open:'Mavzularni ko‘rish',search:'Bo‘limlarni qidirish…'}, ru:{open:'Открыть темы',search:'Поиск разделов…'} })[document.documentElement.lang] || {open:'View topics',search:'Search modules…'};
}

function moduleCardHtml(m) {
  return '<div class="learn-module" data-module="' + esc(m.slug) + '">' +
    '<button type="button" class="learn-module__toggle" aria-expanded="false">' +
    '<span class="learn-module__art">' + moduleArtHtml(m, state.subSlug) + '</span>' +
    '<span class="learn-module__main">' +
    '<span class="learn-module__name">' + esc(m.name) + '</span>' +
    '<span class="learn-module__desc">' + esc(m.description || '') + '</span>' +
    '</span>' +
    '<span class="learn-module__meta">' + countText(m.questionCount) + ' ' + t('learnpage.questions') + '</span>' +
    '</button><div class="learn-module__topics" hidden></div>' +
    '</div>';
}


// Event delegation for module expand/collapse
function wireModules() {
  document.querySelectorAll('.learn-module__toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.learn-module');
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      card.classList.toggle('is-open', !open);
      const host = card.querySelector('.learn-module__topics');
      host.hidden = open;
      if (open || state.loadedModules[card.dataset.module]) return;
      host.textContent = t('learnpage.loading');
      try {
        const data = await fetchJson('/api/public/learn/' + state.curSlug + '/' + state.subSlug + '/' + encodeURIComponent(card.dataset.module) + '?lang=' + (document.documentElement.lang || 'uz'));
        host.innerHTML = (data.topics || []).map(topic => '<div class="learn-topic"><span class="learn-topic__name">' + esc(topic.name) + '</span><span class="learn-topic__count">' + topic.questionCount + '</span><button class="btn learn-topic__go" type="button" data-topic="' + esc(topic.slug) + '">' + esc(t('learnpage.topicPractice')) + '</button></div>').join('') || '<p>' + esc(t('learnpage.noQuestions')) + '</p>';
        host.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => startPractice(card.dataset.module, b.dataset.topic)));
        state.loadedModules[card.dataset.module] = true;
      } catch { host.textContent = t('learnpage.error'); }

    });
  });
}

async function renderModules(data) {
  const host = document.getElementById('learn-modules');
  if (!host) return;
  state.modules = data.modules || [];
  if (!state.modules.length) {
    host.innerHTML = '<p class="qbank-status">' + esc(t('learnpage.noModules')) + '</p>';
    return;
  }
  host.innerHTML = '<div class="learn-modules">' +
    '<div class="learn-modules__head"><h2 class="learn-modules__title">' + esc(t('learnpage.modules')) + '</h2><input type="search" class="learn-module-search" aria-label="' + moduleLabels().search + '" placeholder="' + moduleLabels().search + '"></div>' +
    '<div class="learn-module-list">' + state.modules.map(moduleCardHtml).join('') + '</div></div>';
  host.querySelector('.learn-module-search').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLocaleLowerCase();
    host.querySelectorAll('.learn-module').forEach((card, index) => {
      const m = state.modules[index];
      card.hidden = !`${m.name} ${m.description || ''}`.toLocaleLowerCase().includes(query);
    });
  });
  wireModules();
}

// --- MCQ practice session -------------------------------------------------
const practice = { questions: [], index: 0, correct: 0, moduleSlug: null, topicSlug: null, topicName: '', locked: false, answers: {} };

function showModules() {
  const panel = document.getElementById('learn-practice');
  const modules = document.getElementById('learn-modules');
  if (panel) { panel.hidden = true; panel.classList.remove('is-visible'); }
  if (modules) modules.hidden = false;
  // Restore header/footer visibility
  document.body.classList.remove('practice-fullscreen');
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const body = document.getElementById('lp-body');
  const progress = document.getElementById('lp-progress');
  const q = practice.questions[practice.index];
  const i = practice.index + 1;
  const n = practice.questions.length;
  if (progress) progress.textContent = t('learnpage.progress', { i: String(i), n: String(n) });
  const score = document.getElementById('lp-score');
  if (score) score.textContent = practice.correct + '/' + i;
  practice.locked = false;

  const isLast = i === n;
  body.innerHTML =
    '<div class="pq__idx">' + i + ' / ' + n + '</div>' +
    '<button type="button" class="btn" id="pq-bookmark" aria-pressed="' + Boolean(q.bookmarked) + '">' + (q.bookmarked ? 'Bookmarked' : 'Bookmark') + '</button><p id="pq-bookmark-error" role="status"></p>' +
    '<h3 class="pq__q">' + esc(q.question_text) + '</h3>' +
    (q.question_image ? '<img class="question-media" src="/api/public/media/' + q.question_image.mediaId + '" alt="' + esc(q.question_image.alt || 'Question image') + '">' : '') +
    (q.question_images || []).map(img => '<img class="question-media" src="/api/public/media/' + img.mediaId + '" alt="Question image">').join('') +
    '<div class="pq__opts">' + q.options.map((o) =>
      '<button type="button" class="pq__opt" data-key="' + esc(o.key) + '">' +
      '<span class="pq__opt-key">' + esc(o.key) + '</span><span class="pq__opt-text">' + esc(o.text) + '</span><span class="pq__percentage" data-option="'+esc(o.key)+'" hidden></span></button>'
    ).join('') + '</div>' +
    (q.question_type==='multiple_correct'?'<p>Select all correct answers.</p><button class="btn btn--primary" id="pq-check">Check answers</button>':'')+
    '<div class="pq__community" role="status" aria-live="polite" hidden></div>' +
    '<div class="pq__navigation"><button type="button" id="pq-next" class="btn btn--primary" hidden>' +
    (isLast ? t('learnpage.results.title') : t('learnpage.next')) + '</button></div>' +
    '<div class="pq__feedback" hidden></div>';

  body.querySelector('#pq-bookmark').addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true;
    const error = body.querySelector('#pq-bookmark-error'); error.textContent = '';
    try {
      q.bookmarked = await setBookmark(q.question_id, !q.bookmarked);
      btn.setAttribute('aria-pressed', String(q.bookmarked));
      btn.textContent = q.bookmarked ? 'Bookmarked' : 'Bookmark';
    } catch (err) { error.textContent = err.message; }
    finally { btn.disabled = false; }
  });
  body.querySelectorAll('.pq__opt').forEach((btn) => {
    btn.addEventListener('click', () => {if(q.question_type==='multiple_correct'){if(!practice.locked){btn.classList.toggle('is-selected');btn.setAttribute('aria-pressed',String(btn.classList.contains('is-selected')));}}else answer(btn,q);});
  });
  body.querySelector('#pq-check')?.addEventListener('click',()=>answer(null,q));
  const nextBtn = body.querySelector('#pq-next');
  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (practice.index + 1 < practice.questions.length) {
      practice.index += 1;
      renderQuestion();
    } else {
      renderSummary();
    }
  });
}

function answer(btn, q) {
  if (practice.locked) return;
  const picked = btn?[btn.getAttribute('data-key')]:[...document.querySelectorAll('.pq__opt.is-selected')].map(b=>b.getAttribute('data-key'));
  if(!picked.length)return;
  practice.locked = true;
  showCommunityAnswer(document.getElementById('lp-body'),q,picked);
  const correct = q.options.filter(o=>o.is_correct).map(o=>o.key);
  const ok = picked.length===correct.length&&picked.every(key=>correct.includes(key));
  const check=document.getElementById('pq-check');if(check)check.disabled=true;
  // Store answer for review
  practice.answers[practice.index] = { picked, correct, ok };

  document.querySelectorAll('.pq__opt').forEach((b) => b.disabled = true);
  if(ok)practice.correct+=1;
  document.querySelectorAll('.pq__opt').forEach(b=>{const key=b.getAttribute('data-key');if(correct.includes(key))b.classList.add('is-correct');else if(picked.includes(key))b.classList.add('is-wrong');});

  const fb = document.querySelector('.pq__feedback');
  if (fb) {
    fb.hidden = false;
    fb.innerHTML =
      '<p class="pq__fb-label">' + esc(ok ? t('learnpage.correct') : t('learnpage.incorrect')) + '</p>' +
      '<div class="pq__expl"><h4>Explanation</h4><div class="explanation-content">' + (q.explanation_html || '') +
      (q.explanation_image ? '<img class="question-media" src="/api/public/media/' + q.explanation_image.mediaId + '" alt="Explanation image">' : '') + '</div></div>' +
      (q.reference ? '<div class="question-detail"><h4>Reference / Source</h4><p>' + esc(q.reference) + '</p></div>' : '') +
      '<div class="question-detail"><h4>Question ID</h4><span class="question-public-id">' + esc(q.question_id) + '</span></div>';
  }
  const nextBtn = document.getElementById('pq-next');
  if (nextBtn) nextBtn.hidden = false;
  const score = document.getElementById('lp-score');
  if (score) score.textContent = practice.correct + '/' + (practice.index + 1);
}

function renderSummary() {
  const body = document.getElementById('lp-body');
  const progress = document.getElementById('lp-progress');
  if (progress) progress.textContent = '';
  const n = practice.questions.length;
  const pct = n ? Math.round((practice.correct / n) * 100) : 0;
  // Save progress to server
  saveScore(practice.topicSlug, practice.correct, n);

  // Build question-by-question review with all options
  const reviewItems = practice.questions.map((q, i) => {
    const ans = practice.answers[i];
    if (!ans) return '';
    const isOk = ans.ok;
    // Show all options with indicators
    const optionsHtml = q.options.map((o) => {
      const isPicked = ans.picked.includes(o.key);
      const isCorrect = ans.correct.includes(o.key);
      let cls = 'pq-review__opt';
      let icon = '';
      if (isCorrect) { cls += ' pq-review__opt--correct'; icon = '✓'; }
      if (isPicked && !isCorrect) { cls += ' pq-review__opt--wrong'; icon = '✗'; }
      return '<div class="' + cls + '">' +
        '<span class="pq-review__opt-key">' + esc(o.key) + '</span>' +
        '<span class="pq-review__opt-text">' + esc(o.text) + '</span>' +
        (icon ? '<span class="pq-review__opt-icon">' + icon + '</span>' : '') +
        '</div>';
    }).join('');
    return '<div class="pq-review ' + (isOk ? 'pq-review--ok' : 'pq-review--wrong') + '">' +
      '<div class="pq-review__head">' +
      '<span class="pq-review__badge">' + (isOk ? '✓' : '✗') + '</span>' +
      '<span class="pq-review__qnum">' + (i + 1) + '. ' + esc(q.question_text) + '</span>' +
      '</div>' +
      '<div class="pq-review__opts">' + optionsHtml + '</div>' +
      '</div>';
  }).join('');

  body.innerHTML =
    '<div class="pq-results">' +
    '<div class="pq-results__icon" aria-hidden="true">✓</div>' +
    '<h3 class="pq-results__title">' + esc(t('learnpage.results.title')) + '</h3>' +
    '<p class="pq-results__score">' + esc(t('learnpage.results.score', { correct: String(practice.correct), n: String(n) })) + '</p>' +
    '<div class="pq-results__bar"><span style="width:' + pct + '%"></span></div>' +
    '<p class="pq-results__pct">' + pct + '%</p>' +
    '</div>' +
    '<div class="pq-review-section">' +
    '<h4 class="pq-review-section__title">' + esc(t('learnpage.review.title')) + '</h4>' +
    reviewItems +
    '<div class="pq-results__actions" style="margin-top:24px">' +
    '<button type="button" id="lp-again" class="btn btn--primary">' + esc(t('learnpage.results.again')) + '</button>' +
    '<button type="button" id="lp-back" class="btn btn--outline">' + esc(t('learnpage.exit')) + '</button>' +
    '</div>' +
    '</div>';

  document.getElementById('lp-again').addEventListener('click', () => {
    practice.index = 0;
    practice.correct = 0;
    practice.answers = {};
    startPractice(practice.moduleSlug, practice.topicSlug);
  });
  document.getElementById('lp-back').addEventListener('click', showModules);
}

async function startPractice(moduleSlug, topicSlug) {
  const panel = document.getElementById('learn-practice');
  const modules = document.getElementById('learn-modules');
  const body = document.getElementById('lp-body');
  const progress = document.getElementById('lp-progress');
  const score = document.getElementById('lp-score');
  if (!panel || !body) return;
  // Hide modules, keep practice panel hidden until questions load (no flash)
  modules.hidden = true;
  panel.hidden = true;
  panel.classList.remove('is-visible');
  if (progress) progress.textContent = '';
  if (score) score.textContent = '';
  body.innerHTML = '<p class="qbank-status">' + esc(t('learnpage.loading')) + '</p>';

  try {
    const data = await fetchJson('/api/public/learn/' + state.curSlug + '/' + state.subSlug + '/' + moduleSlug + '/' + topicSlug +
      '/questions?lang=' + (document.documentElement.lang || 'uz'));
    practice.questions = data.questions || [];
    const requested = new URLSearchParams(window.location.search).get('question');
    const search = new URLSearchParams(window.location.search);
    if (requested && search.get('module') === moduleSlug && search.get('topic') === topicSlug) {
      practice.questions = practice.questions.filter(q => q.question_id === requested);
    }
    practice.answers = {};
    practice.index = 0;
    practice.correct = 0;
    practice.moduleSlug = moduleSlug;
    practice.topicSlug = topicSlug;
    practice.topicName = (data.topic && data.topic.name) || topicSlug;
    if (!practice.questions.length) {
      panel.hidden = false;
      body.innerHTML = '<p class="qbank-status">' + esc(t('learnpage.noQuestions')) + '</p>';
      return;
    }
    renderQuestion();
    // Reveal panel after question is in the DOM — smooth, no glitch
    requestAnimationFrame(() => {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('is-visible'));
    });
    // Enter full-screen practice mode (hide header/footer)
    document.body.classList.add('practice-fullscreen');
  } catch (e) {
    panel.hidden = false;
    body.innerHTML = '<p class="qbank-status qbank-status--error">' + esc(t('learnpage.error')) + '</p>';
  }
}

// --- Page -----------------------------------------------------------------
export function renderLearn(lang, params) {
  state.loadedModules = {};
  state.curSlug = params.curriculum;
  state.subSlug = params.subject;

  const body =
    breadcrumbHtml() +
    '<section class="section"><div class="container learn-page">' +
    '<p class="qbank-status" id="learn-loading">' + t('learnpage.loading') + '</p>' +
    '<div id="learn-content" hidden>' +
    '<div id="learn-hero"></div>' +
    '<div id="learn-modules"></div>' +
    '</div>' +
    '<div id="learn-practice" hidden>' +
    '<div class="learn-practice__topbar">' +
    '<button type="button" id="lp-exit-top" class="practice-close-btn" aria-label="Close">✕</button>' +
    '<span id="lp-progress" class="learn-practice__progress"></span>' +
    '<span id="lp-score" class="learn-practice__score"></span>' +
    '</div>' +
    '<div id="lp-body"></div>' +
    '</div>' +
    '</div></section>';

  return {
    titleKey: 'qbankpage.title',
    descKey: 'meta.qbank',
    activePage: 'qbank',
    bodyHtml: body,
    init: () => {
      requireStudent(window.location.pathname + window.location.search).then((student) => {
        if (!student) return;
        const initPromise = (async () => {
          const loading = document.getElementById('learn-loading');
          const content = document.getElementById('learn-content');
          const crumb = document.getElementById('bk-subject');
          try {
            const data = await fetchJson('/api/public/learn/' + state.curSlug + '/' + state.subSlug +
              '?lang=' + (document.documentElement.lang || 'uz'));
            state.curName = (data.curriculum && data.curriculum.name) || state.curSlug;
            state.subName = (data.subject && data.subject.name) || state.subSlug;
            if (crumb) crumb.textContent = state.subName;
            document.title = state.subName + ' — MedPobeda';
            if (loading) loading.hidden = true;
            if (content) content.hidden = false;
            if (data.subject) data.subject.questionCount = Number(data.questionCount) || 0;
            const hero = document.getElementById('learn-hero');
            if (hero && data.subject) hero.innerHTML = subjectHeaderHtml(data.subject);
            // Teacher profile popup handler
            const teacherBtn = document.getElementById('teacher-view-btn');
            if (teacherBtn) teacherBtn.addEventListener('click', showTeacherPopup);
            await renderModules(data);
            const search = new URLSearchParams(window.location.search);
            if (search.get('module') && search.get('topic') && search.get('question')) await startPractice(search.get('module'), search.get('topic'));
          } catch (e) {
            if (loading) loading.textContent = t('learnpage.error');
          }
        })();

        const exitTop = document.getElementById('lp-exit-top');
        if (exitTop) exitTop.addEventListener('click', showModules);

        initPromise;
      });
    },
  };
}