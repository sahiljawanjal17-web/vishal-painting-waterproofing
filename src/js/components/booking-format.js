// "Quick booking format": a ready-made form the customer copies (or opens straight in WhatsApp) and
// fills in with only their own details. It lives in a popup opened by a small clipboard icon in the
// header, so it never takes space on the page. The same field list drives the on-screen sheet and
// the text, so what they see is exactly what they paste. Language follows the site toggle.
import { el } from '../core/dom.js';
import { getLang, onLangChange } from '../core/app-state.js';
import { t } from '../core/labels.js';
import { buildUrl, openWhatsApp } from '../services/whatsapp.js';

const FIELDS = [
  ['fmtName', 'fmtNameEx'],
  ['fmtPhone', 'fmtPhoneEx'],
  ['fmtAddress', 'fmtAddressEx'],
  ['fmtService', 'fmtServiceEx'],
  ['fmtProperty', 'fmtPropertyEx'],
  ['fmtCondition', 'fmtConditionEx'],
  ['fmtDate', 'fmtDateEx'],
  ['fmtNotes', 'fmtNotesEx']
];

// Plain text for the clipboard / WhatsApp. "*bold*" is WhatsApp formatting for the heading only.
export function formatText(lang) {
  const rows = FIELDS.map(([label, example], i) => `${i + 1}. ${t(label, lang)}: ______ (${t(example, lang)})`);
  return [`*${t('fmtHeading', lang)}*`, '', ...rows, '', t('fmtPhotoHint', lang)].join('\n');
}

export function initBookingFormat(dialog, { site, trigger }) {
  const root = dialog.querySelector('#format-root');
  const status = el('p', { class: 'format__status', role: 'status' });

  async function copy(lang) {
    try {
      await navigator.clipboard.writeText(formatText(lang));
      status.textContent = t('fmtCopied', lang);
    } catch {
      status.textContent = t('fmtCopyFail', lang);
      const range = document.createRange();
      range.selectNodeContents(root.querySelector('.format__sheet'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
  }

  const close = () => dialog.close();

  function render() {
    const lang = getLang();
    status.textContent = '';
    const sheet = el('ol', { class: 'format__sheet', tabindex: '0' },
      ...FIELDS.map(([label, example]) => el('li', { class: 'format__row' },
        el('span', { class: 'format__label', text: t(label, lang) }),
        el('span', { class: 'format__blank', 'aria-hidden': 'true' }),
        el('span', { class: 'format__example', text: t(example, lang) }))));
    root.replaceChildren(
      el('p', { class: 'format__steps', text: t('fmtSteps', lang) }),
      el('div', { class: 'format__card' },
        el('p', { class: 'format__heading', text: t('fmtHeading', lang) }),
        sheet,
        el('p', { class: 'format__tip', text: t('fmtPhotoHint', lang) })),
      el('div', { class: 'format__actions' },
        el('button', { type: 'button', class: 'btn btn-primary', text: t('fmtCopy', lang), onclick: () => copy(lang) }),
        el('button', { type: 'button', class: 'btn btn-whatsapp', text: t('fmtSend', lang), onclick: () => openWhatsApp(buildUrl(site.contact.whatsapp, formatText(lang))) }),
        el('button', { type: 'button', class: 'btn btn-outline', text: t('fmtOnline', lang), onclick: () => { close(); document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }); } })),
      status);
  }

  trigger?.addEventListener('click', () => { render(); dialog.showModal(); });
  dialog.querySelector('.format-dialog__close')?.addEventListener('click', close);
  // Click on the dim backdrop (the <dialog> element itself, outside its padding box) closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  render();
  return { destroy: onLangChange(render) };
}
