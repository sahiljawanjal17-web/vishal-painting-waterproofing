// main.js - Entry point for index.html (loaded as type="module" after store.js / event-bus.js)
import { loadAll } from './core/data-loader.js';
import { el } from './core/dom.js';
import { getLang, onLangChange } from './core/app-state.js';
import { applyLabels, t } from './core/labels.js';
import { initLangToggle } from './components/lang-toggle.js';
import { initHeroSlider } from './components/hero-slider.js';
import { initPartnerCards } from './components/partner-cards.js';
import { initGallery } from './components/gallery.js';
import { initLightbox } from './components/lightbox.js';
import { initVideoReel } from './components/video-reel.js';
import { initContactDock } from './components/contact-dock.js';
import { initLocation } from './components/location-map.js';
import { initPayments } from './components/payments.js';
import { initOffers } from './components/offers.js';
import { initReviews } from './components/reviews-carousel.js';
import { initIntro } from './components/intro.js';
import { initBookingWizard } from './components/booking-wizard.js';
import { initNavDrawer } from './components/nav-drawer.js';
import { initSiteBg } from './components/site-bg.js';
import { initBookingFormat } from './components/booking-format.js';
import { initEstimator } from './components/estimator.js';

function showLoadError(selectors) {
  selectors.forEach((selector) => {
    const target = document.querySelector(selector);
    if (target) target.replaceChildren(el('p', { class: 'load-error', role: 'alert', text: t('loadError', getLang()) }));
  });
}

// Header/hero buttons: smooth-scroll to a section (replaces inline onclick handlers).
function initScrollLinks() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-scroll]');
    if (!target) return;
    document.querySelector(target.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
  });
}

function paintChrome(lang) {
  applyLabels(document, lang);
  document.title = t('pageTitle', lang);
}

async function boot() {
  initLangToggle();
  initScrollLinks();
  paintChrome(getLang());
  onLangChange(paintChrome);
  let data;
  try {
    data = await loadAll(['site', 'partners', 'media', 'offers', 'pricing', 'services', 'reviews', 'booking-options']);
  } catch (err) {
    console.error(err);
    showLoadError(['#estimator .estimator-box', '#hero-slider', '#team-grid', '#gallery-root', '#video-reel', '#reviews-root', '#location-root', '#payments-root', '#offers-root']);
    return;
  }

  const partners = data.partners.items.filter((p) => p.active).sort((a, b) => a.order - b.order);
  // Blueprint rule: never render media that hasn't been checked as faceless.
  const pairs = data.media.beforeAfter.filter((p) => p.faceless_verified === true);
  const lang = getLang();

  const hero = initHeroSlider(document.getElementById('hero-slider'), { pairs: pairs.filter((p) => p.featured), lang });
  onLangChange(hero.setLang);

  initPartnerCards(document.getElementById('team-grid'), { partners, site: data.site });
  initEstimator(document.getElementById('estimator'), { pricing: data.pricing, partners, services: data.services.items, site: data.site });
  initGallery(document.getElementById('gallery-root'), { pairs });
  initLightbox({ pairs, partners, site: data.site });
  initVideoReel(document.getElementById('video-reel'), { videos: data.media.videos });
  initContactDock(document.getElementById('contact-dock'), { partners, site: data.site });
  initReviews(document.getElementById('reviews-root'), { reviews: data.reviews.items, partners });
  initLocation(document.getElementById('location-root'), { site: data.site });
  initPayments(document.getElementById('payments-root'), { site: data.site });
  initOffers(document.getElementById('offers-root'), { offers: data.offers.items, site: data.site });
  initBookingFormat(document.getElementById('format-dialog'), { site: data.site, trigger: document.getElementById('format-open') });
  initBookingWizard(document.getElementById('booking-wizard'), { options: data['booking-options'], services: data.services.items, partners, pricing: data.pricing, site: data.site });
}

initIntro(document.getElementById('intro'));
initNavDrawer(document.getElementById('nav-drawer'), document.getElementById('nav-toggle'));
initSiteBg(document.getElementById('site-bg'), document.getElementById('site-bg-toggle'));
boot();
