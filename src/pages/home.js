import { qbankArtHtml } from '../theme/qbank-art.js';
import '../styles/home-subjects-premium.css';
import { homePhotoHtml, homeExplorerHtml, homeQuizHtml, initHomeExplore } from '../components/home-explore.js';
// MedPobeda - Home Page (approved homepage design, ported to router)
import { t, langPath, getLang } from '../i18n/index.js';
import { curriculaData, getSubjectName } from '../data/curricula.js';
import { curriculumIcons, subjectIcons } from './curricula-icons.js';
import '../styles/home-journey.css';
import '../styles/academic-curricula.css';
import { curriculumCatalogHtml } from '../components/curriculum-catalog.js';
import { whyChooseHtml } from '../components/why-choose.js';

const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function sectionHeader(eyebrowKey, titleKey, subtitleKey) {
  return '<div class="section-header">' +
    '<p class="section-header__eyebrow">' + t(eyebrowKey) + '</p>' +
    '<h2 class="section-header__title">' + t(titleKey) + '</h2>' +
    '<p class="section-header__subtitle">' + t(subtitleKey) + '</p></div>';
}
function accentLastWord(str) {
  const m = str.match(/(\S+[.!?…])(\s*)$/);
  return m ? str.slice(0, m.index) + '<span class="hero__title-accent">' + m[1] + '</span>' : str;
}
function heroSection() {
  return '<section class="hero"><div class="container"><div class="hero__inner">' +
    '<div class="hero__content"><p class="hero__eyebrow">' + t('home.hero.badge') + '</p>' +
    '<h1 class="hero__title">' + accentLastWord(t('home.hero.title')) + '</h1>' +
    '<p class="hero__subtitle">' + t('home.hero.subtitle') + '</p>' +
    '<div class="hero__actions">' +
    '<a class="btn btn--primary btn--lg" href="' + langPath('curricula') + '">' + t('home.hero.cta1') + ARROW + '</a>' +
    '<a class="btn btn--ghost btn--lg" href="' + langPath('platform') + '">' + t('home.hero.cta2') + '</a></div></div>' +
    '<div class="hero__visual" aria-hidden="true"><div class="hero__card">' +
    '<div class="hero__card-header"><span class="hero__card-dot"></span><span class="hero__card-title">' + t('home.hero.card.title') + '</span></div>' +
    '<div class="hero__card-body"><p class="hero__card-stat-label">' + t('home.hero.card.subject') + '</p>' +
    '<p class="hero__card-stat-num">' + t('home.hero.card.topic') + '</p>' +
    '<div class="hero__card-progress"><div class="hero__card-progress-label"><span>' + t('home.hero.card.progress') + '</span><span>68%</span></div>' +
    '<div class="hero__card-progress-bar"><div class="hero__card-progress-fill" style="width:68%"></div></div></div>' +
    '<div class="hero__card-stats"><div class="hero__card-stat"><span class="hero__card-stat-num">12</span><span class="hero__card-stat-label">' + t('home.hero.float1') + '</span></div>' +
    '<div class="hero__card-stat"><span class="hero__card-stat-num">48</span><span class="hero__card-stat-label">' + t('home.hero.float2') + '</span></div></div></div></div>' +
    '<div class="hero__floating hero__floating--1"><span class="hero__floating-icon">▶</span>' + t('home.hero.float1') + '</div>' +
    '<div class="hero__floating hero__floating--2"><span class="hero__floating-icon">✓</span>' + t('home.hero.float2') + '</div></div>' +
    '</div><p class="hero__note">' + t('home.hero.note') + '</p></div></section>';
}

const journeyCopy = {
  en: { label: 'Your journey in medicine', skip: 'Explore MedPobeda', scroll: 'Scroll to follow the journey', chapters: [
    ['Learn smarter. Become a better doctor.', 'For medical students in Uzbekistan. Build your knowledge with interactive lessons, 3D anatomy and daily practice.', 'FOR MEDICAL STUDENTS OF UZBEKISTAN'],
    ['Today, a student.', 'Build your foundation. Explore anatomy, connect ideas, and practise every day.', 'LEARN WITH PURPOSE'],
    ['Tomorrow, a doctor.', 'Carry your knowledge forward — from the classroom to clinical learning.', 'KNOWLEDGE INTO PRACTICE'],
    ['All the best!', 'Keep learning. Keep caring. Your next chapter is waiting.', 'YOUR JOURNEY CONTINUES']
  ], start: 'Start learning', anatomy: 'Explore 3D anatomy' },
  uz: { label: 'Tibbiyotdagi yo‘lingiz', skip: 'MedPobeda bilan tanishing', scroll: 'Davom etish uchun pastga aylantiring', chapters: [
    ['Samarali o‘rganing. Yaxshi shifokor bo‘ling.', 'O‘zbekiston tibbiyot talabalari uchun. Interaktiv darslar, 3D anatomiya va mashqlar bilan bilimingizni rivojlantiring.', 'O‘ZBEKISTON TIBBIYOT TALABALARI UCHUN'],
    ['Bugun — talaba.', 'Bilimingizga poydevor qo‘ying. Anatomiyani o‘rganing va har kuni mashq qiling.', 'MAQSAD SARI O‘RGANING'],
    ['Ertaga — shifokor.', 'Bilimingizni rivojlantiring — auditoriyadan klinik ta’limgacha.', 'BILIMDAN AMALIYOTGA'],
    ['Omad sizga!', 'O‘rganishdan va g‘amxo‘rlik qilishdan to‘xtamang. Oldinda yangi bosqich.', 'YO‘LINGIZ DAVOM ETADI']
  ], start: 'O‘rganishni boshlash', anatomy: '3D anatomiyani o‘rganish' },
  ru: { label: 'Ваш путь в медицине', skip: 'Узнать о MedPobeda', scroll: 'Прокрутите, чтобы продолжить', chapters: [
    ['Призвание. Начало пути.', 'Путь каждого врача начинается с любознательности. Ваш начинается здесь.', 'ПЕРВЫЙ ШАГ'],
    ['Сегодня — студент.', 'Заложите основу знаний. Изучайте анатомию и практикуйтесь каждый день.', 'УЧИТЕСЬ С ЦЕЛЬЮ'],
    ['Завтра — врач.', 'Развивайте свои знания — от аудитории к клиническому обучению.', 'ОТ ЗНАНИЙ К ПРАКТИКЕ'],
    ['Удачи вам!', 'Продолжайте учиться и заботиться. Впереди — новая глава.', 'ВАШ ПУТЬ ПРОДОЛЖАЕТСЯ']
  ], start: 'Начать обучение', anatomy: 'Изучить 3D-анатомию' },
};
function journeySection() {
  const c = journeyCopy[getLang()] || journeyCopy.en;
  return '<section class="med-journey" id="home-journey" aria-label="'+c.label+'" data-chapter="0">' +
    '<div class="med-journey__stage">' +
    '<div class="med-journey__desk" aria-hidden="true"></div><div class="med-journey__ambient" aria-hidden="true"></div><div class="med-journey__flag-display" aria-hidden="true"><img src="/images/home/uzbekistan-flag.svg" alt="" width="240" height="120"><span class="med-journey__flag-pole"></span><span class="med-journey__flag-base"></span></div>' +
    '<div class="med-journey__top"><span>MedPobeda <span class="med-journey__edition">/ '+c.label+'</span><span class="med-journey__country"><span role="img" aria-label="Uzbekistan">🇺🇿</span> O‘zbekiston</span></span><a href="#home-information">'+c.skip+' ↗</a></div>' +
    '<canvas class="med-journey__canvas" aria-hidden="true"></canvas>' +
    '<div class="med-journey__fallback" aria-hidden="true">✚</div>' +
    '<div class="med-journey__copy">'+c.chapters.map((chapter,i)=>
      '<div class="med-journey__chapter"'+(i?' hidden':'')+'><p class="med-journey__eyebrow">0'+(i+1)+' / '+chapter[2]+'</p>' +
      '<'+(i?'h2':'h1')+'>'+chapter[0]+'</'+(i?'h2':'h1')+'><p class="med-journey__description">'+chapter[1]+'</p>' +
      (i===0||i===3?'<div class="med-journey__links"><a href="'+langPath('curricula')+'">'+c.start+' ↗</a><a href="'+langPath('anatomy')+'">'+c.anatomy+' →</a></div>':'')+'</div>'
    ).join('')+'</div>'+
    '<div class="med-journey__bottom"><span class="med-journey__scroll">↓ '+c.scroll+'</span><nav aria-label="'+c.label+'">'+c.chapters.map((chapter,i)=>'<button type="button" data-journey-step="'+i+'" aria-label="'+chapter[0]+'" aria-current="'+(i===0?'step':'false')+'">0'+(i+1)+'</button>').join('')+'</nav></div>'+
    '<div class="med-journey__progress" aria-hidden="true"><span></span></div></div></section>';
}
function initJourney() {
  const root=document.getElementById('home-journey');
  let cancelled=false,dispose;
  window.__anatomyViewerDispose=()=>{cancelled=true;dispose?.();};
  import('../three/home-story.js').then(({mountHomeStory})=>{
    if(!cancelled&&root?.isConnected)dispose=mountHomeStory(root);
  }).catch(()=>{if(!cancelled)root?.classList.add('med-journey--fallback');});
}

function curriculaSection() {
  return '<section class="curricula"><div class="container">' +
    sectionHeader('home.curricula.eyebrow', 'home.curricula.title', 'home.curricula.subtitle') +
    curriculumCatalogHtml() + '</div></section>';
}

function subjectsSection() {
  const copy = {
    en: { label: 'FOUNDATIONS OF MEDICINE', open: 'Explore subject', guide: 'Your learning path', steps: ['Choose your direction', 'Build your foundation', 'Explore one idea at a time'], note: 'Explore core subjects in General Medicine.', browse: 'View the full catalogue' },
    uz: { label: 'TIBBIYOT ASOSLARI', open: 'Fanni o‘rganish', guide: 'O‘rganish yo‘lingiz', steps: ['Yo‘nalishni tanlang', 'Bilim poydevorini yarating', 'Mavzularni bosqichma-bosqich o‘rganing'], note: 'Davolash ishi yo‘nalishidagi asosiy fanlar bilan tanishing.', browse: 'To‘liq katalogni ko‘rish' },
    ru: { label: 'ОСНОВЫ МЕДИЦИНЫ', open: 'Изучить предмет', guide: 'Ваш учебный путь', steps: ['Выберите направление', 'Заложите основу знаний', 'Изучайте темы шаг за шагом'], note: 'Откройте основные предметы лечебного дела.', browse: 'Открыть полный каталог' }
  }[getLang()] || { label: 'FOUNDATIONS OF MEDICINE', open: 'Explore subject', guide: 'Your learning path', steps: ['Choose your direction', 'Build your foundation', 'Explore one idea at a time'], note: 'Explore core subjects in General Medicine.', browse: 'View the full catalogue' };
  const subjects = [['anatomy','anatomy','blue'],['physiology','fiziologiya','teal'],['biochemistry','biokimyo','purple'],['histology','gistologiya','purple'],['microbiology','mikrobiologiya','teal'],['pharmacology','farmakologiya','amber']];
  const cards = subjects.map(([id, slug, color], i) =>
    '<a class="home-subject-tile home-subject-tile--'+color+'" href="'+langPath('learn/davolash-ishi/'+slug)+'">' +
    '<div class="home-subject-tile__image">'+qbankArtHtml(slug)+'<span class="home-subject-tile__number">0'+(i+1)+'</span></div>'+
    '<div class="home-subject-tile__body"><h3>'+t('subject.'+id+'.name')+'</h3><p>'+t('subject.'+id+'.desc')+'</p><span class="home-subject-tile__link">'+copy.open+'<span class="home-subject-tile__arrow">'+ARROW+'</span></span></div></a>'
  ).join('');
  return '<section class="home-subjects-premium"><div class="container">'+
    '<div class="home-subjects-premium__heading"><div><p class="home-kicker">'+copy.label+'</p><h2>'+t('home.subjects.title')+'</h2><p>'+t('home.subjects.subtitle')+'</p></div><a class="home-subjects-premium__catalog" href="'+langPath('subjects')+'">'+copy.browse+ARROW+'</a></div>'+
    '<ol class="home-subjects-premium__path" aria-label="'+copy.guide+'">'+['step1','step2','step3'].map((key,i)=>'<li><span class="home-subjects-premium__step">0'+(i+1)+'</span><div><strong>'+t('home.subjects.'+key)+'</strong><p>'+copy.steps[i]+'</p></div><span class="home-subjects-premium__connector" aria-hidden="true">'+ARROW+'</span></li>').join('')+'</ol>'+
    '<div class="home-subjects-premium__grid">'+cards+'</div><p class="home-subjects-premium__note">'+copy.note+'</p></div></section>';
}

function howSection() {
  const icons = { step1: 'icon-lesson', step2: 'icon-quiz', step3: 'icon-book', step4: 'icon-review' };
  const howSteps = Object.keys(icons).map((s, i) =>
    '<div class="how-it-works__step">' +
    '<span class="how-it-works__step-num">' + (i + 1) + '</span>' +
    '<div class="how-it-works__step-icon">' + (curriculumIcons[icons[s]] || '') + '</div>' +
    '<h3 class="how-it-works__step-title">' + t('home.how.' + s + 't') + '</h3>' +
    '<p class="how-it-works__step-desc">' + t('home.how.' + s + 'd') + '</p></div>'
  ).join('');
  const options = ['A', 'B', 'C', 'D'].map((l) =>
    '<div class="question-preview__option"><span>' + l + '</span>' + t('home.how.preview.opt') + ' ' + l + '</div>'
  ).join('');
  return '<section class="how-it-works"><div class="container">' +
    sectionHeader('home.how.eyebrow', 'home.how.title', 'home.how.subtitle') +
    '<div class="how-it-works__steps">' + howSteps + '</div>' +
    '<div class="how-it-works__preview"><div class="question-preview" aria-hidden="true">' +
    '<div class="question-preview__header"><span class="question-preview__badge">' + t('home.how.preview.badge') + '</span><span class="question-preview__counter">1 / 10</span></div>' +
    '<p class="question-preview__text">' + t('home.how.preview.q') + '</p>' +
    '<div class="question-preview__options">' + options + '</div>' +
    '<div class="question-preview__footer"><span class="btn btn--primary">' + t('home.how.preview.check') + '</span></div>' +
    '<p class="question-preview__note">' + t('home.how.preview.note') + '</p></div></div></div></section>';
}

function facultySection() {
  const cards = curriculaData.map((c) =>
    '<article class="faculty-card"><div class="faculty-card__photo faculty-card__photo--placeholder" aria-hidden="true">' +
    '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg></div>' +
    '<div class="faculty-card__info"><p class="faculty-card__name">' + t('home.faculty.placeholder') + '</p>' +
    '<p class="faculty-card__subject">' + t('curriculum.' + c.id + '.title') + '</p></div></article>'
  ).join('');
  return '<section class="faculty"><div class="container">' +
    sectionHeader('home.faculty.eyebrow', 'home.faculty.title', 'home.faculty.subtitle') +
    '<div class="faculty__grid">' + cards + '</div>' +
    '<p class="faculty__note">' + t('home.faculty.note') + '</p>' +
    '<div class="section-cta"><a class="btn btn--outline" href="' + langPath('faculty') + '">' + t('home.faculty.cta') + ARROW + '</a></div></div></section>';
}
function appSection() {
  const features = ['sync', 'progress', 'offline'].map((f) =>
    '<div class="app-section__feature"><span class="app-section__feature-icon" aria-hidden="true">✓</span>' + t('home.app.feature.' + f) + '</div>'
  ).join('');
  return '<section class="app-section"><div class="container"><div class="app-section__inner">' +
    '<div class="app-section__content"><h2 class="app-section__title">' + t('home.app.title') + '</h2>' +
    '<p class="app-section__desc">' + t('home.app.subtitle') + '</p>' +
    '<div class="app-section__features">' + features + '</div>' +
    '<p class="app-section__note">' + t('home.app.note') + '</p>' +
    '<a class="btn btn--primary" href="' + langPath('app') + '">' + t('home.app.cta') + ARROW + '</a></div>' +
    '<div class="app-section__visual" aria-hidden="true"><div class="app-section__phone"><div class="app-section__phone-screen">' +
    '<div class="app-section__phone-header">' + t('home.app.card1') + '</div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.hero.card.subject') + '</span><span class="app-section__phone-value">' + t('home.hero.card.topic') + '</span></div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.app.card2') + '</span><span class="app-section__phone-value">68%</span></div>' +
    '<div class="app-section__phone-card"><span class="app-section__phone-label">' + t('home.app.card3') + '</span><span class="app-section__phone-value">7</span></div>' +
    '</div></div></div></div></section>';
}

export function renderHome() {
  const body = journeySection() + '<div id="home-information">' + homePhotoHtml() + curriculaSection() + homeExplorerHtml() + subjectsSection() + homeQuizHtml() +
    whyChooseHtml() + appSection() +
    '<section class="cta-band"><div class="container"><h2 class="cta-band__title">' + t('home.cta.title') + '</h2>' +
    '<p class="cta-band__text">' + t('home.cta.text') + '</p>' +
    '<a class="btn btn--primary btn--lg" href="' + langPath('register') + '">' + t('home.cta.btn') + ARROW + '</a></div></section></div>';
  return { titleKey: 'meta.home', descKey: 'meta.home', activePage: 'home', bodyHtml: body, init: () => { initJourney(); initHomeExplore(); } };
}



