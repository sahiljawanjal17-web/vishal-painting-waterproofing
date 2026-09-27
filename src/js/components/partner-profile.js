import { el, emphasis } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange, selectPartner } from '../core/app-state.js';
import { greeting, resolveContact, waHref } from '../services/contact.js';
import { initBeforeAfterSlider } from './before-after-slider.js';

/**
 * team.html: renders ONE specialist's full profile, chosen by the URL hash (#p2).
 * Selecting the partner keeps the contact dock pointed at them. A hash that matches
 * nobody sends the visitor back to the team list on the home page.
 */
export function initPartnerProfile(root, { partners, site, pairs }) {
  let slider = null;

  const currentId = () => decodeURIComponent(location.hash.slice(1));

  function buildProfile(partner, lang) {
    const name = pick(partner.name, lang);
    const otherLang = lang === 'en' ? 'hi' : 'en';
    const contact = resolveContact(partner, site);
    const pair = pairs.find((p) => p.id === partner.beforeAfterId);
    const slot = el('div', { class: 'profile-ba' });

    const section = el('section', { id: partner.id, class: 'partner-profile theme-minimal', 'data-partner-id': partner.id },
      el('div', { class: 'container' },
        el('div', { class: 'profile-hero profile-hero--cover' },
          el('img', {
            class: 'profile-cover',
            src: partner.visual.coverImage,
            alt: pick(partner.visual.coverAlt, lang),
            width: '1200',
            height: '800',
            decoding: 'async'
          }),
          el('div', { class: 'profile-hero__body' },
            el('div', { class: 'profile-icon', html: icon(partner.visual.icon, 'icon-blade') }),
            el('div', { class: 'profile-subtitle', text: `${t('partnerN', lang, { n: String(partner.order).padStart(2, '0') })} · ${pick(partner.eyebrow, lang).toUpperCase()}` }),
            partner.isLead && el('span', { class: 'badge partner-card__lead', text: t('leadBadge', lang) }),
            el('h1', { class: 'profile-name', text: name }),
            el('p', { class: 'profile-role', text: pick(partner.roleTitle, lang) }),
            el('p', { class: 'profile-role-hi', lang: otherLang, text: pick(partner.roleTitle, otherLang) }),
            el('p', { class: 'profile-desc', text: pick(partner.bio, lang) }),
            el('div', { class: 'profile-actions' },
              el('a', {
                class: 'btn btn-primary',
                href: waHref(contact.wa, greeting(name, lang)),
                target: '_blank',
                rel: 'noopener',
                'data-contact-wa': partner.id,
                text: t('bookWa', lang)
              }),
              el('a', {
                class: 'btn btn-outline',
                href: contact.tel,
                'data-contact-call': partner.id,
                text: t('callNumber', lang, { phone: contact.display })
              })
            )
          )
        ),

        el('div', { class: 'profile-stats' }, partner.stats.map((stat) =>
          el('div', { class: 'stat-item' },
            el('div', { class: 'stat-value', text: stat.value }),
            el('div', { class: 'stat-label', text: pick(stat.label, lang) })
          ))),

        el('hr', { class: 'divider' }),

        el('div', { class: 'profile-method' },
          el('div', { class: 'method-header' },
            el('h2', {}, emphasis(pick(partner.method.title, lang))),
            el('p', { text: pick(partner.method.subtitle, lang) })
          ),
          el('div', { class: 'method-grid' }, partner.method.steps.map((step, i) =>
            el('div', { class: 'method-card' },
              el('div', { class: 'method-step', text: String(i + 1).padStart(2, '0') }),
              el('h3', { text: pick(step.title, lang) }),
              el('p', { text: pick(step.desc, lang) })
            )))
        ),

        el('div', { class: 'profile-details' },
          el('div', { class: 'details-left' },
            el('h2', { text: t('beforeAfter', lang) }),
            pair && slot,
            pair && el('p', { class: 'ba-caption', text: pick(pair.caption, lang) })
          ),
          el('div', { class: 'details-right' },
            el('h2', { text: t('credentials', lang) }),
            el('ul', { class: 'credentials-list' }, partner.credentials.map((c) =>
              el('li', {},
                el('span', { class: 'cred-name', text: pick(c.name, lang) }),
                el('span', { class: 'cred-year', text: c.year })
              ))),
            el('div', { class: 'expertise-tags' }, partner.expertiseTags.map((tag) =>
              el('span', { class: 'tag', text: pick(tag, lang) })))
          )
        ),

        buildOthers(partner, lang)
      )
    );

    if (pair) slider = initBeforeAfterSlider(slot, { pair, lang });
    return section;
  }

  // Links (not full profiles) to the rest of the team.
  function buildOthers(current, lang) {
    return el('nav', { class: 'profile-others', 'aria-label': t('otherSpecialists', lang) },
      el('h2', { text: t('otherSpecialists', lang) }),
      el('div', { class: 'team-nav' }, partners.filter((p) => p.id !== current.id).map((p) =>
        el('a', { class: 'team-nav__chip', href: `#${p.id}`, text: pick(p.name, lang) }))));
  }

  function render() {
    const partner = partners.find((p) => p.id === currentId());
    if (!partner) {
      location.replace('index.html#team');
      return;
    }
    const lang = getLang();
    slider?.destroy();
    slider = null;
    root.replaceChildren(buildProfile(partner, lang));
    document.title = `${pick(partner.name, lang)} · ${pick(site.business.name, lang)}`;
    selectPartner(partner.id);
  }

  // Switching to another specialist via the links at the bottom starts at the top of their page.
  const onHashChange = () => {
    render();
    window.scrollTo(0, 0);
  };

  render();
  window.addEventListener('hashchange', onHashChange);
  const offLang = onLangChange(render);

  return {
    update: render,
    destroy() {
      offLang();
      slider?.destroy();
      window.removeEventListener('hashchange', onHashChange);
    }
  };
}
