import { qsa } from '../core/dom.js';
import { getLang, onLangChange, setLang } from '../core/app-state.js';

// Shared by index.html and team.html. Also syncs the buttons to the persisted
// language on load — the static markup always starts on "EN".
export function initLangToggle() {
  const buttons = qsa('.lang-btn');

  function paint(lang) {
    buttons.forEach((btn) => {
      const on = btn.dataset.lang === lang;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    document.documentElement.lang = lang;
  }

  buttons.forEach((btn) => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
  paint(getLang());
  return { destroy: onLangChange(paint) };
}
