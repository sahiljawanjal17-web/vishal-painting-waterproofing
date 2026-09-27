import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';
import { greeting, resolveContact, waHref } from '../services/contact.js';
import { getPosition, locationMessage, mapEmbedUrl, mapOpenUrl } from '../services/location.js';

/**
 * One business-wide location, two cards:
 *  1. where we are (site.json.location) as a click-to-load Google Map;
 *  2. a button that sends the CUSTOMER's location to us on WhatsApp.
 * The customer's coordinates go only to the business hotline (never a partner's
 * number), only when they tap the button, and are not stored. The map iframe is
 * shown straight away but `loading="lazy"`, so the browser fetches it only near the viewport.
 */
export function initLocation(root, { site }) {
  const loc = site.location;
  const { wa } = resolveContact(null, site);
  let notice = { key: '', url: '', linkKey: '' }; // last status, re-drawn on language change

  function mapFrame(city, lang) {
    return el('iframe', {
      src: mapEmbedUrl(loc.mapQuery, lang),
      title: t('mapTitle', lang, { city }),
      loading: 'lazy',
      referrerpolicy: 'no-referrer-when-downgrade'
    });
  }

  function render() {
    const lang = getLang();
    const city = `${pick(loc.city, lang)}, ${pick(loc.region, lang)}`;
    const businessName = pick(site.business.name, lang);

    // --- Card 1: our location ---
    const mapBox = el('div', { class: 'loc-map' }, mapFrame(city, lang));

    const ourCard = el('div', { class: 'loc-card' },
      el('h3', { text: t('ourLocation', lang) }),
      mapBox,
      el('p', { class: 'loc-card__meta', html: `${icon('map-pin')}<span></span>` }),
      el('a', {
        class: 'btn btn-outline btn-sm',
        href: mapOpenUrl(loc.mapQuery),
        target: '_blank',
        rel: 'noopener',
        text: t('openInMaps', lang)
      }));
    ourCard.querySelector('.loc-card__meta span').textContent = t('basedIn', lang, { city });

    // --- Card 2: the customer's location ---
    const status = el('p', { class: 'loc-status', role: 'status' });
    const sendLink = el('a', { class: 'btn btn-whatsapp', target: '_blank', rel: 'noopener', hidden: true });
    const shareBtn = el('button', {
      class: 'btn btn-whatsapp',
      type: 'button',
      html: `${icon('whatsapp')}<span>${t('shareLocation', lang)}</span>`
    });

    function show(key, url = '', linkKey = '') {
      notice = { key, url, linkKey };
      status.textContent = key ? t(key, lang) : '';
      sendLink.hidden = !url;
      if (url) {
        sendLink.href = url;
        sendLink.textContent = t(linkKey, lang);
      }
    }

    shareBtn.addEventListener('click', async () => {
      shareBtn.disabled = true;
      show('locating');
      try {
        const url = waHref(wa, locationMessage(lang, await getPosition()));
        // The permission prompt can use up the click's "user activation"; if the popup
        // blocker eats the window, fall back to a link the visitor can tap.
        const win = window.open(url, '_blank');
        if (win) {
          win.opener = null;
          show('locationSent');
        } else {
          show('locationReady', url, 'shareLocation');
        }
      } catch {
        show('locationDenied', waHref(wa, greeting('', lang)), 'openWa');
      } finally {
        shareBtn.disabled = false;
      }
    });

    const customerCard = el('div', { class: 'loc-card' },
      el('h3', { text: t('yourLocationTitle', lang) }),
      el('p', { text: t('yourLocationDesc', lang, { name: businessName }) }),
      shareBtn,
      sendLink,
      status,
      el('p', { class: 'loc-card__privacy', text: t('locationPrivacy', lang) }));
    if (notice.key && notice.key !== 'locating') show(notice.key, notice.url, notice.linkKey);

    root.replaceChildren(el('div', { class: 'loc-grid' }, ourCard, customerCard));
  }

  render();
  const offLang = onLangChange(render);
  return { update: render, destroy: offLang };
}
