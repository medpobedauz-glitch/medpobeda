// MedPobeda - Tests Page (timed practice exams)
import { t } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';
import { requireStudent } from '../auth-state.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function renderTests() {
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.tests', titleKey: 'testspage.title', ledeKey: 'testspage.lede' }) +
    '<section class="section"><div class="container">' +
    '<div id="tests-loading" class="qbank-status">Loading...</p>' +
    '<div id="tests-content" hidden>' +
    '<div id="tests-list"></div>' +
    '<div id="tests-quiz" hidden></div>' +
    '</div>' +
    '</div></section>';
  return {
    titleKey: 'testspage.title', descKey: 'meta.tests', activePage: 'tests', bodyHtml: body,
    init: () => {
      requireStudent(window.location.pathname + window.location.search).then((student) => {
        if (!student) return;
        loadTests();
      });
    },
  };
}

async function loadTests() {
  const loading = document.getElementById('tests-loading');
  const content = document.getElementById('tests-content');
  const list = document.getElementById('tests-list');
  try {
    const res = await fetch('/api/public/learn?lang=' + (document.documentElement.lang || 'uz'));
    const data = await res.json();
    const curricula = data.curricula || [];
    if (!curricula.length) {
      list.innerHTML = '<p class="qbank-status">No tests available.</p>';
    } else {
      list.innerHTML = '<h2 style="font-size:18px;font-weight:700;color:#0F2745;margin-bottom:16px;">Choose a test</h2>' +
        '<div class="tests-grid">' + curricula.map((c) =>
          '<button class="tcard" data-curriculum="' + esc(c.slug) + '" style="cursor:pointer;text-align:left;border:1px solid #E2E8F0;border-radius:14px;padding:22px;background:#fff;">' +
          '<div class="tcard__icon" aria-hidden="true">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></div>' +
          '<h3 class="tcard__title">' + esc(c.name) + '</h3>' +
          '<p class="tcard__desc">10 questions · 5 minutes</p>' +
          '</button>'
        ).join('') + '</div>';
      list.querySelectorAll('.tcard').forEach((card) => {
        card.addEventListener('click', () => startTest(card.getAttribute('data-curriculum')));
      });
    }
    loading.hidden = true;
    content.hidden = false;
  } catch (e) {
    list.innerHTML = '<p class="qbank-status qbank-status--error">Failed to load tests.</p>';
    loading.hidden = true;
    content.hidden = false;
  }
}

async function startTest(curriculumSlug) {
  const list = document.getElementById('tests-list');
  const quiz = document.getElementById('tests-quiz');
  list.hidden = true;
  quiz.hidden = false;
  quiz.innerHTML = '<p class="qbank-status">Loading questions...</p>';
  try {
    const subRes = await fetch('/api/public/learn/' + curriculumSlug + '?lang=' + (document.documentElement.lang || 'uz'));
    const subData = await subRes.json();
    const subjects = subData.subjects || [];
    let allQuestions = [];
    for (const sub of subjects.slice(0, 3)) {
      const modRes = await fetch('/api/public/learn/' + curriculumSlug + '/' + sub.slug + '?lang=' + (document.documentElement.lang || 'uz'));
      const modData = await modRes.json();
      const modules = modData.modules || [];
      for (const mod of modules.slice(0, 2)) {
        const topRes = await fetch('/api/public/learn/' + curriculumSlug + '/' + sub.slug + '/' + mod.slug + '?lang=' + (document.documentElement.lang || 'uz'));
        const topData = await topRes.json();
        const topics = topData.topics || [];
        for (const top of topics.slice(0, 2)) {
          const qRes = await fetch('/api/public/learn/' + curriculumSlug + '/' + sub.slug + '/' + mod.slug + '/' + top.slug + '/questions?lang=' + (document.documentElement.lang || 'uz'));
          const qData = await qRes.json();
          if (qData.questions && qData.questions.length) {
            allQuestions = allQuestions.concat(qData.questions.map((q) => ({ ...q, subjectName: sub.name, topicName: top.name })));
          }
        }
      }
    }
    if (!allQuestions.length) {
      quiz.innerHTML = '<p class="qbank-status">No questions available.</p>' +
        '<button class="btn btn--outline" id="quiz-back-btn">← Back</button>';
      document.getElementById('quiz-back-btn').addEventListener('click', () => { list.hidden = false; quiz.hidden = true; });
      return;
    }
    allQuestions = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
    runQuiz(allQuestions, curriculumSlug);
  } catch (e) {
    quiz.innerHTML = '<p class="qbank-status qbank-status--error">Failed to load questions.</p>';
  }
}

function runQuiz(questions, curriculumSlug) {
  let index = 0;
  let correct = 0;
  const totalTime = 5 * 60;
  let timeLeft = totalTime;
  const quiz = document.getElementById('tests-quiz');
  document.body.classList.add('practice-fullscreen');

  const timerInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timerEl = document.getElementById('quiz-timer');
    if (timerEl) timerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (timeLeft <= 0) { clearInterval(timerInterval); showResults(); }
  }, 1000);

  function renderQuestion() {
    const q = questions[index];
    quiz.innerHTML =
      '<div class="quiz-topbar">' +
      '<button class="practice-close-btn" id="quiz-exit">✕</button>' +
      '<span id="quiz-timer" class="quiz-timer">5:00</span>' +
      '<span class="quiz-progress">' + (index + 1) + '/' + questions.length + '</span>' +
      '</div>' +
      '<h3 class="pq__q">' + (index + 1) + '. ' + esc(q.question_text) + '</h3>' +
      '<div class="pq__opts">' + q.options.map((o) =>
        '<button type="button" class="pq__opt" data-key="' + esc(o.key) + '">' +
        '<span class="pq__opt-key">' + esc(o.key) + '</span><span class="pq__opt-text">' + esc(o.text) + '</span></button>'
      ).join('') + '</div>';
    document.getElementById('quiz-exit').addEventListener('click', () => { clearInterval(timerInterval); showResults(); });
    quiz.querySelectorAll('.pq__opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = btn.getAttribute('data-key');
        const correctKey = (q.options.find((o) => o.is_correct) || {}).key;
        if (picked === correctKey) { btn.classList.add('is-correct'); correct++; }
        else {
          btn.classList.add('is-wrong');
          quiz.querySelectorAll('.pq__opt').forEach((b) => { if (b.getAttribute('data-key') === correctKey) b.classList.add('is-correct'); });
        }
        quiz.querySelectorAll('.pq__opt').forEach((b) => (b.disabled = true));
        setTimeout(() => { index++; if (index < questions.length) renderQuestion(); else { clearInterval(timerInterval); showResults(); } }, 1200);
      });
    });
  }

  function showResults() {
    const pct = Math.round((correct / questions.length) * 100);
    fetch('/api/auth/progress', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicSlug: 'test-exam', correct, total: questions.length, subjectSlug: 'test', curriculumSlug }),
    }).catch(() => {});
    quiz.innerHTML =
      '<div class="pq-results">' +
      '<div class="pq-results__icon" aria-hidden="true">✓</div>' +
      '<h3 class="pq-results__title">Test Complete!</h3>' +
      '<p class="pq-results__score">You scored ' + correct + ' out of ' + questions.length + '</p>' +
      '<div class="pq-results__bar"><span style="width:' + pct + '%"></span></div>' +
      '<p class="pq-results__pct">' + pct + '%</p>' +
      '<div class="pq-results__actions">' +
      '<button class="btn btn--primary" id="quiz-again">Try Again</button>' +
      '<button class="btn btn--outline" id="quiz-back">Back to Tests</button>' +
      '</div></div>';
    document.body.classList.remove('practice-fullscreen');
    document.getElementById('quiz-again').addEventListener('click', () => startTest(curriculumSlug));
    document.getElementById('quiz-back').addEventListener('click', () => { document.getElementById('tests-list').hidden = false; document.getElementById('tests-quiz').hidden = true; });
  }

  renderQuestion();
}
