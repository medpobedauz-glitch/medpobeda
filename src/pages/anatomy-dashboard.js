// MedPobeda - Anatomy Dashboard / Home Page
// The main anatomy learning dashboard: all anatomy topics organized into
// sections with lazy 3D preview cards. Public route; signed-in students get
// progress tracking hooks (data-progress), guests see a login CTA.
import { t, langPath, getLang } from '../i18n/index.js';
import { student, loginUrl } from '../auth-state.js';
import { ANATOMY_SECTIONS, lname } from '../data/anatomy-dashboard.js';
import { anatomySectionHtml, initSection } from '../components/anatomy-section.js';

const catalogCopy = {
  uz: { search: 'Anatomiya mavzusini qidirish', placeholder: 'Masalan: yurak, kalla suyagi, buyrak…', section: 'Tizim yoki bo‘lim', all: 'Barcha bo‘limlar', ready: 'Faqat mavjud 3D modellar', results: 'Ko‘rsatilgan mavzular', empty: 'Mavzu topilmadi', hint: 'Boshqa so‘z kiriting yoki filtrlarni tozalang.', clear: 'Filtrlarni tozalash', pause: '360° aylanishni to‘xtatish', resume: '360° aylanishni davom ettirish' },
  en: { search: 'Search anatomy topics', placeholder: 'Try heart, skull, kidney…', section: 'System or section', all: 'All sections', ready: 'Available 3D models only', results: 'Topics shown', empty: 'No topics found', hint: 'Try another word or clear your filters.', clear: 'Clear filters', pause: 'Pause 360° previews', resume: 'Resume 360° previews' },
  ru: { search: 'Поиск тем анатомии', placeholder: 'Например: сердце, череп, почка…', section: 'Система или раздел', all: 'Все разделы', ready: 'Только доступные 3D-модели', results: 'Показано тем', empty: 'Темы не найдены', hint: 'Попробуйте другое слово или сбросьте фильтры.', clear: 'Сбросить фильтры', pause: 'Приостановить вращение 360°', resume: 'Продолжить вращение 360°' },
};
const normalizeSearch = (value) => value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f'’‘ʻʼ`]/g, '').trim();

export function renderAnatomyDashboard() {
  const copy = catalogCopy[getLang()] || catalogCopy.en;
  const sectionsHtml = ANATOMY_SECTIONS.map((section) => anatomySectionHtml(section)).join('');

  // Guest CTA — hidden by default, revealed in init() only for visitors
  // who are not signed in. Login returns straight back to the dashboard.
  const guestCta =
    '<div class="anat-dashboard__cta" id="anat-dashboard-cta" hidden>' +
    '<a class="btn btn--outline" href="' + loginUrl(langPath('anatomy')) + '">' +
    t('anat3d.dashboard.loginCta') +
    '</a>' +
    '</div>';

  const body =
    '<nav class="breadcrumb" aria-label="Breadcrumb">' +
    '<div class="breadcrumb__inner">' +
    '<a href="' + langPath('') + '" class="breadcrumb__link">' + t('common.breadcrumb.home') + '</a>' +
    '<span class="breadcrumb__sep" aria-hidden="true">/</span>' +
    '<span class="breadcrumb__current" aria-current="page">' + t('nav.anatomy') + '</span>' +
    '</div></nav>' +
    '<header class="anat-dash-header"><div class="anat-dashboard__container">' +
    '<div class="anat-dash-header__row">' +
    '<h1 class="anat-dash-header__title">' + t('anat3d.dashboard.title') + '</h1>' +
    '<p class="anat-dash-header__lede">' + t('anat3d.dashboard.lede') + '</p>' +
    '</div></div></header>' +
    '<section class="anat-dashboard" id="anatomy-dashboard">' +
    '<div class="anat-dashboard__container">' +
    guestCta +
    '<div class="anat-catalog">' +
    '<div class="anat-catalog__bar">' +
    '<input id="anatomy-search" type="search" placeholder="' + copy.search + ' — ' + copy.placeholder + '" aria-label="' + copy.search + '" autocomplete="off" aria-controls="anatomy-topics">' +
    '<select id="anatomy-section" aria-label="' + copy.section + '"><option value="">' + copy.all + '</option>' +
    ANATOMY_SECTIONS.map(section => '<option value="' + section.id + '">' + lname(section.title, getLang()) + '</option>').join('') + '</select>' +
    '<label class="anat-catalog__check"><input id="anatomy-ready" type="checkbox">' + copy.ready + '</label>' +
    '<button type="button" id="preview-motion" aria-pressed="false">' + copy.pause + '</button>' +
    '<button type="button" id="anatomy-clear" hidden>' + copy.clear + '</button>' +
    '</div>' +
    '<p id="anatomy-results" class="anat-catalog__results" role="status" aria-live="polite" aria-atomic="true"></p>' +
    '<div id="anatomy-empty" class="anat-catalog__empty" hidden><h2>' + copy.empty + '</h2><p>' + copy.hint + '</p></div>' +
    '<div id="anatomy-topics">' +
    sectionsHtml + '</div>' +
    '</div>' +
    '</section>';

  return {
    titleKey: 'anat3d.dashboard.title',
    descKey: 'meta.anatomy-dashboard',
    activePage: 'anatomy',
    bodyHtml: body,
    init: () => {
      const root = document.getElementById('anatomy-dashboard');
      if (!root) return;

      // Initialize each section: link hrefs + lazy 3D previews
      let disposed = false;
      let paused = false;
      const motion = root.querySelector('#preview-motion');
      const renderer = import('../three/preview-renderer.js');
      const updateMotion = () => {
        motion.setAttribute('aria-pressed', String(paused));
        motion.textContent = paused ? copy.resume : copy.pause;
        renderer.then(m => { if (!disposed) m.pausePreviews(paused); }).catch(() => {});
      };
      updateMotion();
      motion.addEventListener('click', () => { paused = !paused; updateMotion(); });
      const search = root.querySelector('#anatomy-search');
      const sectionFilter = root.querySelector('#anatomy-section');
      const ready = root.querySelector('#anatomy-ready');
      const clear = root.querySelector('#anatomy-clear');
      const filter = () => {
        const words = normalizeSearch(search.value).split(/\s+/).filter(Boolean);
        let count = 0;
        for (const section of ANATOMY_SECTIONS) {
          const sectionEl = root.querySelector('[data-section-id="' + section.id + '"]');
          let sectionCount = 0;
          for (const card of section.cards) {
            const text = normalizeSearch([...Object.values(card.title), ...Object.values(card.blurb || {}), ...Object.values(section.title)].join(' '));
            const visible = (!sectionFilter.value || sectionFilter.value === section.id) && (!ready.checked || card.status === 'available') && words.every(word => text.includes(word));
            sectionEl.querySelector('[data-card-id="' + card.id + '"]').hidden = !visible;
            if (visible) sectionCount++;
          }
          sectionEl.hidden = !sectionCount;
          count += sectionCount;
        }
        root.querySelector('#anatomy-results').textContent = copy.results + ': ' + count + ' / ' + ANATOMY_SECTIONS.reduce((n, section) => n + section.cards.length, 0);
        root.querySelector('#anatomy-empty').hidden = count > 0;
        clear.hidden = !search.value && !sectionFilter.value && !ready.checked;
      };
      search.addEventListener('input', filter);
      sectionFilter.addEventListener('change', filter);
      ready.addEventListener('change', filter);
      clear.addEventListener('click', () => { search.value = ''; sectionFilter.value = ''; ready.checked = false; filter(); search.focus(); });
      filter();
      const cleanup=ANATOMY_SECTIONS.map(section=>initSection(section,root));
      window.__anatomyViewerDispose=()=>{ disposed = true; cleanup.forEach(fn=>fn?.()); };

      // Progress hooks are ready for a future backend: every card carries
      // data-progress="not-started"; flip it once tracking exists.
      student().then((s) => {
        if (!s) {
          const cta = document.getElementById('anat-dashboard-cta');
          if (cta) cta.hidden = false;
          return;
        }
        // Signed in: progress endpoints can populate data-progress here later.
      }).catch(() => {
        const cta = document.getElementById('anat-dashboard-cta');
        if (cta) cta.hidden = false;
      });
    },
  };
}