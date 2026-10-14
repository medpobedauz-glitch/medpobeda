// MedPobeda - Accessible Modal Component
// Central i18n only: all visible text must come from translation files.
import { t } from '../i18n/index.js';

export function createModal({ title, message, closeText }) {
  // Remove any existing modal
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) existingModal.remove();
  if (document.activeElement && document.activeElement !== document.body) {
    createModal._lastFocus = document.activeElement;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-title');

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title" id="modal-title"></h3>
        <button class="modal__close" aria-label="${t('common.close')}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal__body">
        <p class="modal__message"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary modal__action"></button>
      </div>
    </div>
  `;

  const titleEl = overlay.querySelector('.modal__title');
  const messageEl = overlay.querySelector('.modal__message');
  const actionBtn = overlay.querySelector('.modal__action');
  const closeBtn = overlay.querySelector('.modal__close');

  titleEl.textContent = title;
  messageEl.textContent = message;
  actionBtn.textContent = closeText;

  let closed = false;
  const closeModal = () => {
    if (closed) return;
    closed = true;
    overlay.classList.add('modal-overlay--closing');
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      const last = createModal._lastFocus;
      if (last && document.contains(last)) last.focus();
      createModal._lastFocus = null;
    }, 180);
  };

  actionBtn.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
    // Trap focus within modal
    if (e.key === 'Tab') {
      const focusable = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  actionBtn.focus();

  return overlay;
}

export function showSubjectModal() {
  return createModal({
    title: t('modal.subject.title'),
    message: t('modal.subject.text'),
    closeText: t('modal.subject.action'),
  });
}

export function showHelpModal() {
  return createModal({
    title: t('modal.help.title'),
    message: t('modal.help.text'),
    closeText: t('modal.help.action'),
  });
}

export function showPaymentModal() {
  return createModal({
    title: t('planspage.modal.title'),
    message: t('planspage.modal.text'),
    closeText: t('planspage.modal.action'),
  });
}

export function showContactModal() {
  return createModal({
    title: t('contactpage.modal.title'),
    message: t('contactpage.modal.text'),
    closeText: t('contactpage.modal.action'),
  });
}