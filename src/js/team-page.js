// team-page.js - Entry point for team.html (loaded as type="module" after store.js / event-bus.js)
// Shows a single specialist's profile, picked by the URL hash (team.html#p2).
import { loadAll } from './core/data-loader.js';
import { el } from './core/dom.js';
import { getLang, onLangChange } from './core/app-state.js';
import { applyLabels, t } from './core/labels.js';
import { initLangToggle } from './components/lang-toggle.js';
import { initPartnerProfile } from './components/partner-profile.js';
import { initContactDock } from './components/contact-dock.js';

async function boot() {
  initLangToggle();
  applyLabels(document, getLang());
  onLangChange((lang) => applyLabels(document, lang));

  let data;
  try {
    data = await loadAll(['site', 'partners', 'media']);
  } catch (err) {
    console.error(err);
    document.getElementById('profiles').replaceChildren(
      el('p', { class: 'load-error', role: 'alert', text: t('loadError', getLang()) }));
    return;
  }

  const partners = data.partners.items.filter((p) => p.active).sort((a, b) => a.order - b.order);
  // Blueprint rule: never render media that hasn't been checked as faceless.
  const pairs = data.media.beforeAfter.filter((p) => p.faceless_verified === true);

  initPartnerProfile(document.getElementById('profiles'), {
    partners,
    site: data.site,
    pairs
  });
  initContactDock(document.getElementById('contact-dock'), { partners, site: data.site });
}

boot();
