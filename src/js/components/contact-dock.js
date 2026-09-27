import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, getSelectedPartnerId, onLangChange, onPartnerSelected } from '../core/app-state.js';
import { greeting, resolveContact, waHref } from '../services/contact.js';

/**
 * Sticky Call + WhatsApp dock (bottom bar on mobile, floating pill on desktop).
 * Its two links always point at the currently selected partner — or the business
 * hotline when nobody is selected. It only ever rewrites href attributes; there is
 * no request to any server.
 */
export function initContactDock(root, { partners, site }) {
  const label = el('span', { class: 'contact-dock__label', 'aria-live': 'polite' });
  const callLink = el('a', { class: 'btn btn-outline contact-dock__btn', 'data-contact-call': '' });
  const waLink = el('a', {
    class: 'btn btn-whatsapp contact-dock__btn',
    'data-contact-wa': '',
    target: '_blank',
    rel: 'noopener'
  });

  root.classList.add('contact-dock');
  root.replaceChildren(label, el('div', { class: 'contact-dock__actions' }, callLink, waLink));

  function render() {
    const lang = getLang();
    const partner = partners.find((p) => p.id === getSelectedPartnerId());
    const contact = resolveContact(partner, site);
    const name = partner ? pick(partner.name, lang) : '';

    label.textContent = partner
      ? t('dockWith', lang, { name })
      : t('dockDefault', lang);

    callLink.href = contact.tel;
    callLink.innerHTML = `${icon('phone')}<span>${t('call', lang)}</span>`;
    callLink.setAttribute('aria-label', `${t('call', lang)} ${name || ''} ${contact.display}`.replace(/\s+/g, ' ').trim());

    waLink.href = waHref(contact.wa, greeting(name, lang));
    waLink.innerHTML = `${icon('whatsapp')}<span>${t('whatsapp', lang)}</span>`;
    waLink.setAttribute('aria-label', `${t('whatsapp', lang)} ${name}`.trim());

    root.dataset.partner = partner ? partner.id : '';

    // Any other CTA on the page can opt in to follow the selected partner.
    document.querySelectorAll('[data-follow-wa]').forEach((a) => { a.href = waLink.href; });
    document.querySelectorAll('[data-follow-call]').forEach((a) => { a.href = callLink.href; });
  }

  render();
  const offLang = onLangChange(render);
  const offSelect = onPartnerSelected(render);

  return {
    update: render,
    destroy() { offLang(); offSelect(); }
  };
}
