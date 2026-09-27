import { el } from '../core/dom.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';
import { offerMessage, resolveContact, waHref } from '../services/contact.js';

/**
 * Offer cards; each one opens WhatsApp with a message naming the offer. Goes to the
 * business hotline (no partner), since offers are business-wide.
 */
export function initOffers(root, { offers, site }) {
  const { wa } = resolveContact(null, site);

  function render() {
    const lang = getLang();
    root.replaceChildren(
      el('p', { class: 'section-sub', text: t('offersSub', lang) }),
      el('div', { class: 'offer-grid' }, offers.map((offer) => {
        const title = pick(offer.title, lang);
        return el('article', { class: 'offer-card' },
          el('div', { class: 'offer-card__tags' },
            el('span', { class: 'badge', text: pick(offer.badge, lang) }),
            offer.sample && el('span', { class: 'offer-card__sample', text: t('sample', lang) })),
          el('h3', { text: title }),
          el('p', { text: pick(offer.desc, lang) }),
          el('a', {
            class: 'btn btn-whatsapp btn-sm',
            href: waHref(wa, offerMessage(title, lang)),
            target: '_blank',
            rel: 'noopener',
            text: t('askOffer', lang)
          }));
      })));
  }

  render();
  const offLang = onLangChange(render);
  return { update: render, destroy: offLang };
}
