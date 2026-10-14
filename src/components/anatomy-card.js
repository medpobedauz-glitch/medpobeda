// MedPobeda - Anatomy Dashboard Card Component
// Renders a single anatomy topic card with a 3D preview thumbnail, localized
// title/blurb and status indicator (available = link / coming soon = inert).
import { t, getLang } from '../i18n/index.js';
import { lname } from '../data/anatomy-dashboard.js';


// Neutral fallback mark shown while a preview loads or if it fails.
const ANATOMY_ICON = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Z"/><path d="M12 2.5V12m0 0 8.5-5M12 12 3.5 7M12 12v9.5"/></svg>';

export function anatomyCardHtml(card) {
  const lang = getLang();
  const isAvailable = card.status === 'available';
  const badge = isAvailable
    ? '<span class="anat-card__badge anat-card__badge--ready">' + t('anat3d.dashboard.explore') + '<span class="anat-card__arrow" aria-hidden="true">→</span></span>'
    : '<span class="anat-card__badge anat-card__badge--soon">' + t('anat3d.dashboard.comingSoon') + '</span>';
  const blurb = card.blurb ? '<p class="anat-card__blurb">' + lname(card.blurb, lang) + '</p>' : '';

  const preview =
    '<div class="anat-card__preview">' +
    '<canvas class="anat-card__canvas" width="512" height="512" aria-hidden="true"></canvas>' +
    '<div class="anat-card__icon" aria-hidden="true">' + ANATOMY_ICON + '</div>' +
    '<div class="anat-card__loading" aria-label="' + t('anat3d.dashboard.loading') + '">' +
    '<span class="anat-card__spinner"></span>' +
    '</div>' +
    '</div>';
  const body =
    '<div class="anat-card__body">' +
    (card.previewReference?'<p class="anat-card__blurb">'+lname({en:'Skeletal reference · topic model in development',uz:'Skelet namunasi · mavzu modeli tayyorlanmoqda',ru:'Скелетный ориентир · модель темы в разработке'},lang)+'</p>':'') +
    '<h3 class="anat-card__title">' + lname(card.title, lang) + '</h3>' +
    blurb +
    '<div class="anat-card__meta">' + badge + '</div>' +
    '</div>';

  // Available cards are real links (keyboard navigation for free);
  // the href is filled in by the section init using cardToViewerParams.
  if (isAvailable) {
    return (
      '<a class="anat-card anat-card--available" data-card-id="' + card.id + '"' +
      ' data-progress="not-started" href="#">' +
      preview + body + '</a>'
    );
  }
  return (
    '<article class="anat-card anat-card--soon" data-card-id="' + card.id + '"' +
    ' data-progress="not-started" aria-label="' + lname(card.title, lang) + ' — ' + t('anat3d.dashboard.comingSoon') + '">' +
    preview + body + '</article>'
  );
}

// Wire up lazy 3D preview rendering using IntersectionObserver
export function initAnatomyCard(card, root) {
  const cardEl = root.querySelector('[data-card-id="' + card.id + '"]');
  if (!cardEl) return;

  const canvas = cardEl.querySelector('.anat-card__canvas');
  const icon = cardEl.querySelector('.anat-card__icon');
  const loading = cardEl.querySelector('.anat-card__loading');

  if (!canvas) return;

  let cancelled=false;
  // Only render the 3D preview when the card scrolls into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.unobserve(canvas);
        if (loading) loading.style.display = 'flex';
        if (icon) icon.style.opacity = '0.3';

        import('../three/preview-renderer.js').then(({createPreview})=>!cancelled&&canvas.isConnected?createPreview(card,canvas):null).then(() => {
          if(cancelled)import('../three/preview-renderer.js').then(m=>m.stopPreview(canvas));
          if (loading) loading.style.display = 'none';
          if (icon) icon.style.opacity = '0';
        }).catch(() => {
          if (loading) loading.style.display = 'none';
          if (icon) {icon.style.opacity = '1';icon.textContent = ({uz:'3D ko‘rinish mavjud emas',ru:'3D-превью недоступно',en:'3D preview unavailable'})[getLang()];}
        });
      }
    });
  }, { threshold: 0.1, rootMargin: '100px' });

  observer.observe(canvas);
  return ()=>{cancelled=true;observer.disconnect();import('../three/preview-renderer.js').then(m=>m.stopPreview(canvas));};
}
