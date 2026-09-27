import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';

/** "How you can pay us": informational only (methods come from site.json.payments). */
export function initPayments(root, { site }) {
  const { methods, note } = site.payments;

  function render() {
    const lang = getLang();
    root.replaceChildren(
      el('p', { class: 'section-sub', text: t('paymentsSub', lang) }),
      el('ul', { class: 'pay-grid' }, methods.map((m) =>
        el('li', { class: 'pay-tile' },
          el('span', { class: 'pay-tile__icon', html: icon(m.icon) }),
          el('strong', { text: pick(m.label, lang) }),
          el('span', { class: 'pay-tile__note', text: pick(m.note, lang) })))),
      el('p', { class: 'section-note', text: pick(note, lang) }));
  }

  render();
  const offLang = onLangChange(render);
  return { update: render, destroy: offLang };
}
