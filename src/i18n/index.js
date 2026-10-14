// MedPobeda Translation System - Main Module
import { uz } from './uz.js';
import { ru } from './ru.js';
import { en } from './en.js';

const translations = { uz, ru, en };
export const VALID_LANGS = ['uz', 'ru', 'en'];
export const DEFAULT_LANG = 'uz';

let currentLang = DEFAULT_LANG;
const listeners = new Set();

export function getLang() {
  return currentLang;
}

export function getValidLangs() {
  return [...VALID_LANGS];
}

export function isValidLang(lang) {
  return VALID_LANGS.includes(lang);
}

export function setLang(lang) {
  if (!isValidLang(lang)) return false;
  currentLang = lang;
  try { localStorage.setItem('medpobeda-lang', lang); } catch (e) { /* private mode */ }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => { try { fn(lang); } catch (e) { /* listener error */ } });
  return true;
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars) {
  const langData = translations[currentLang] || translations.uz;
  let str = langData[key] || translations.uz[key] || key;
  if (vars) {
    Object.keys(vars).forEach((k) => { str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]); });
  }
  return str;
}

export function langPath(page) {
  // page: '' or '/' -> '/uz/' ; 'about' -> '/uz/about'
  if (!page || page === '/') return '/' + currentLang + '/';
  return '/' + currentLang + '/' + String(page).replace(/^\//, '');
}

export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  const langCurrent = document.querySelector('.lang-selector__current');
  if (langCurrent) langCurrent.textContent = currentLang.toUpperCase();
}

export default { getLang, setLang, t, translatePage, getValidLangs, isValidLang, onLangChange, langPath };
/*__MORE__*/