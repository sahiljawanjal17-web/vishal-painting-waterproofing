import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, getSelectedPartnerId, onLangChange, onPartnerSelected, selectPartner } from '../core/app-state.js';
import { greeting, resolveContact, waHref } from '../services/contact.js';

/**
 * Home-page team grid. Every card carries its own Call/WhatsApp links built from
 * that partner's number; clicking or focusing a card also marks the partner as
 * "selected" so the sticky contact dock follows.
 */
export function initPartnerCards(root, { partners, site }) {
  function buildCard(partner, lang) {
    const name = pick(partner.name, lang);
    const contact = resolveContact(partner, site);
    const tags = partner.expertiseTags.slice(0, 3).map((tag) => el('li', { class: 'partner-card__tag', text: pick(tag, lang) }));

    return el('article', { class: 'team-card partner-card', 'data-partner-id': partner.id },
      el('img', {
        class: 'partner-card__cover',
        src: partner.visual.coverImage,
        alt: pick(partner.visual.coverAlt, lang),
        width: '1200',
        height: '800',
        loading: 'lazy',
        decoding: 'async'
      }),
      el('div', { class: 'partner-card__body' },
        el('div', { class: 'partner-card__badge', html: icon(partner.visual.icon, 'partner-card__icon') }),
        partner.isLead && el('span', { class: 'badge partner-card__lead', text: t('leadBadge', lang) }),
        el('h3', { text: name }),
        el('p', { class: 'partner-card__role', text: pick(partner.roleTitle, lang) }),
        el('p', { class: 'partner-card__meta', text: `${t('yearsExp', lang, { n: partner.yearsExperience })} · ★ ${partner.stats.at(-1).value}` }),
        el('ul', { class: 'partner-card__tags' }, tags),
        el('div', { class: 'partner-card__actions' },
          el('a', { class: 'btn btn-outline btn-sm partner-card__view', href: `team.html#${partner.id}`, text: t('viewWork', lang) }),
          el('div', { class: 'partner-card__contact' },
            el('a', {
              class: 'btn btn-outline btn-sm',
              href: contact.tel,
              'data-contact-call': partner.id,
              'aria-label': `${t('call', lang)} ${name} ${contact.display}`,
              html: `${icon('phone')}<span>${t('call', lang)}</span>`
            }),
            el('a', {
              class: 'btn btn-whatsapp btn-sm',
              href: waHref(contact.wa, greeting(name, lang)),
              target: '_blank',
              rel: 'noopener',
              'data-contact-wa': partner.id,
              'aria-label': `${t('whatsapp', lang)} ${name}`,
              html: `${icon('whatsapp')}<span>${t('whatsapp', lang)}</span>`
            })
          )
        )
      )
    );
  }

  function markSelected() {
    const id = getSelectedPartnerId();
    root.querySelectorAll('.partner-card').forEach((card) => {
      card.classList.toggle('partner-card--selected', card.dataset.partnerId === id);
    });
  }

  function render() {
    const lang = getLang();
    root.replaceChildren(...partners.map((p) => buildCard(p, lang)));
    markSelected();
  }

  // Delegated: survives re-renders on language change.
  const onSelect = (e) => {
    const card = e.target.closest('.partner-card');
    if (card) selectPartner(card.dataset.partnerId);
  };
  root.addEventListener('click', onSelect);
  root.addEventListener('focusin', onSelect);

  render();
  const offLang = onLangChange(render);
  const offSelect = onPartnerSelected(markSelected);

  return {
    update: render,
    destroy() {
      offLang();
      offSelect();
      root.removeEventListener('click', onSelect);
      root.removeEventListener('focusin', onSelect);
    }
  };
}
