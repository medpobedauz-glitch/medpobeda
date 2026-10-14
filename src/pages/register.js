// MedPobeda - Register Page. Real registration against POST /api/auth/register.
// New fields: First Name, Last Name, Phone, University, Study Year, Program.
import { t, langPath } from '../i18n/index.js';
import { pageHeaderHtml } from '../components/page-header.js';

function registerNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return null;
}

function loadSelectOptions(url, selectEl, mapFn) {
  fetch(url + (document.documentElement.lang || 'uz'))
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) {
        const items = mapFn(data);
        if (items.length) {
          const placeholder = selectEl.querySelector('option[disabled]');
          selectEl.innerHTML = '';
          if (placeholder) selectEl.appendChild(placeholder);
          items.forEach((item) => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.label;
            selectEl.appendChild(opt);
          });
        }
      }
    })
    .catch(() => { /* keep placeholder */ });
}

export function renderRegister() {
  const yearOptions = [1, 2, 3, 4, 5, 6].map((y) =>
    '<option value="' + y + '">' + t('registerpage.year_' + y) + '</option>'
  ).join('');
  const langOptions = [['uz', 'O\'zbekcha'], ['ru', 'Русский'], ['en', 'English']].map((l) =>
    '<option value="' + l[0] + '">' + l[1] + '</option>'
  ).join('');
  const body =
    pageHeaderHtml({ breadcrumbKey: 'nav.register', titleKey: 'registerpage.title', ledeKey: 'registerpage.subtitle' }) +
    '<section class="section"><div class="container auth-wrap">' +
    '<div class="auth-card auth-card--wide">' +
    '<form class="auth-form" id="register-form" novalidate>' +
    '<div class="form-row"><div class="form-field"><label class="form-label" for="rg-first">' + t('registerpage.first_name') + ' *</label>' +
    '<input class="form-input" id="rg-first" name="first_name" type="text" autocomplete="given-name" required></div>' +
    '<div class="form-field"><label class="form-label" for="rg-last">' + t('registerpage.last_name') + ' *</label>' +
    '<input class="form-input" id="rg-last" name="last_name" type="text" autocomplete="family-name" required></div></div>' +
    '<div class="form-field"><label class="form-label" for="rg-phone">' + t('registerpage.phone') + ' *</label>' +
    '<input class="form-input" id="rg-phone" name="phone" type="tel" autocomplete="tel" placeholder="+998" required></div>' +
    '<div class="form-field"><label class="form-label" for="rg-password">' + t('registerpage.password') + ' *</label>' +
    '<input class="form-input" id="rg-password" name="password" type="password" autocomplete="new-password" minlength="8" required></div>' +
    '<div class="form-row"><div class="form-field"><label class="form-label" for="rg-university">' + t('registerpage.university') + '</label>' +
    '<select class="form-input form-select" id="rg-university" name="university_id">' +
    '<option value="" selected disabled>' + t('registerpage.university.placeholder') + '</option></select></div>' +
    '<div class="form-field"><label class="form-label" for="rg-program">' + t('registerpage.program') + ' *</label>' +
    '<select class="form-input form-select" id="rg-program" name="program_id" required>' +
    '<option value="" selected disabled>' + t('registerpage.program.placeholder') + '</option></select></div></div>' +
    '<div class="form-field"><label class="form-label" for="rg-study-year">' + t('registerpage.study_year') + ' *</label>' +
    '<select class="form-input form-select" id="rg-study-year" name="study_year" required>' +
    '<option value="" selected disabled>' + t('registerpage.study_year.placeholder') + '</option>' + yearOptions + '</select></div>' +
    '<div class="form-field"><label class="form-label" for="rg-contact">' + t('registerpage.contact') + '</label>' +
    '<input class="form-input" id="rg-contact" name="contact" type="text" autocomplete="email"></div>' +
    '<div class="form-field"><label class="form-label" for="rg-language">' + t('registerpage.language') + '</label>' +
    '<select class="form-input form-select" id="rg-language" name="preferred_lang">' + langOptions + '</select></div>' +
    '<p id="register-error" class="form-note" style="color:#c0392b;display:none" role="alert"></p>' +
    '<button class="btn btn--primary btn--full" type="submit" id="register-submit">' + t('registerpage.submit') + '</button>' +
    '<p class="auth-alt">' + t('registerpage.haveacc') + ' <a href="' + langPath('login') + '" class="auth-alt__link">' + t('registerpage.gologin') + '</a></p>' +
    '</form></div></div></section>';
  return {
    titleKey: 'registerpage.title', descKey: 'meta.register', activePage: 'register', bodyHtml: body,
    init: () => {
      const form = document.getElementById('register-form');
      if (!form) return;
      const errorEl = document.getElementById('register-error');
      const submitBtn = document.getElementById('register-submit');
      loadSelectOptions('/api/public/universities?lang=', document.getElementById('rg-university'),
        (data) => data.universities.map((u) => ({ id: u.id, label: (u.city ? u.city + ' \u2014 ' : '') + u.name })));
      loadSelectOptions('/api/public/programs?lang=', document.getElementById('rg-program'),
        (data) => data.programs.map((p) => ({ id: p.id, label: p.name })));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: document.getElementById('rg-first').value.trim(),
              last_name: document.getElementById('rg-last').value.trim(),
              phone: document.getElementById('rg-phone').value.trim(),
              contact: document.getElementById('rg-contact').value.trim(),
              password: document.getElementById('rg-password').value,
              university_id: document.getElementById('rg-university').value ? Number(document.getElementById('rg-university').value) : null,
              program_id: document.getElementById('rg-program').value ? Number(document.getElementById('rg-program').value) : null,
              study_year: document.getElementById('rg-study-year').value ? Number(document.getElementById('rg-study-year').value) : null,
              preferred_lang: document.getElementById('rg-language').value,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { errorEl.textContent = data.error || 'Registration failed.'; errorEl.style.display = 'block'; return; }
          window.location.replace(registerNext() || ('/' + (document.documentElement.lang || 'uz') + '/dashboard'));
        } catch { errorEl.textContent = 'Network error.'; errorEl.style.display = 'block'; }
        finally { submitBtn.disabled = false; }
      });
    },
  };
}
