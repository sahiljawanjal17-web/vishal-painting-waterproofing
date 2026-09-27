import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';

const AUTO_MS = 5000; // time between automatic steps
const RESUME_MS = 8000; // how long auto-scroll stays out of the way after the visitor touches, drags or uses the arrows
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const stars = (rating) => {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

function reviewCard(review, partner, lang) {
  const { text } = review;
  // Show the visitor's language when a translation was supplied; otherwise the original,
  // labelled - customer words are never machine-translated on the fly.
  const shown = text[lang] || text[text.original];
  const isOriginal = !text[lang] && text.original !== lang;
  const date = new Intl.DateTimeFormat({ hi: 'hi-IN', mr: 'mr-IN' }[lang] || 'en-IN', { month: 'short', year: 'numeric' })
    .format(new Date(review.date));

  return el('article', { class: 'review-box review-card' },
    el('div', { class: 'review-stars' },
      el('span', { role: 'img', 'aria-label': `${review.rating} / 5`, text: stars(review.rating) }),
      review.isSample && el('span', { class: 'verified verified--sample', text: t('sample', lang) }),
      !review.isSample && review.verified && el('span', { class: 'verified', text: t('verified', lang) })),
    el('blockquote', { class: 'review-quote', text: `“${shown}”` }),
    isOriginal && el('p', {
      class: 'review-original',
      text: t('originalIn', lang, { lang: t({ hi: 'langNameHi', mr: 'langNameMr' }[text.original] || 'langNameEn', lang) })
    }),
    partner && el('p', { class: 'review-partner', text: t('workBy', lang, { name: pick(partner.name, lang) }) }),
    el('p', { class: 'review-author', text: `${review.reviewerName} · ${review.locality} · ${date}` }));
}

/**
 * Website-wide reviews as ONE row that scrolls sideways (3-4 cards on tablet/desktop, about
 * one on a phone) and advances by a card every AUTO_MS. Auto-scroll pauses on hover, while the
 * visitor interacts, when the row is off-screen or the tab is hidden, and can be paused with the
 * button; reduced-motion users start paused. The row is also natively swipeable/keyboard-scrollable.
 */
export function initReviews(root, { reviews, partners }) {
  const sorted = [...reviews].sort((a, b) => b.date.localeCompare(a.date));
  let playing = !prefersReducedMotion();
  let resumeAt = 0;
  let offscreen = false;

  const summary = el('div', { class: 'reviews-summary' });
  const track = el('div', { class: 'rv-track', tabindex: '0' });
  const prevBtn = el('button', { class: 'rv-nav', type: 'button', html: icon('chevron-left') });
  const nextBtn = el('button', { class: 'rv-nav', type: 'button', html: icon('chevron-right') });
  const toggleBtn = el('button', { class: 'rv-nav', type: 'button' });
  root.classList.add('rv');
  root.replaceChildren(summary, track, el('div', { class: 'rv-controls' }, prevBtn, nextBtn, toggleBtn));

  function render() {
    const lang = getLang();
    const average = sorted.reduce((sum, r) => sum + r.rating, 0) / (sorted.length || 1);
    summary.replaceChildren(
      el('span', { class: 'reviews-summary__score', text: average.toFixed(1) }),
      el('span', { class: 'reviews-summary__stars', 'aria-hidden': 'true', text: stars(average) }),
      el('span', { class: 'reviews-summary__count', text: t('reviewsCount', lang, { n: sorted.length }) }),
      sorted.every((r) => r.isSample) && el('span', { class: 'verified verified--sample', text: t('sample', lang) }));

    track.setAttribute('aria-label', t('reviewsTitle', lang));
    track.replaceChildren(...sorted.map((r) => reviewCard(r, partners.find((p) => p.id === r.partnerId), lang)));
    prevBtn.setAttribute('aria-label', t('prev', lang));
    nextBtn.setAttribute('aria-label', t('next', lang));
    toggleBtn.setAttribute('aria-label', t(playing ? 'pauseAuto' : 'playAuto', lang));
    toggleBtn.innerHTML = icon(playing ? 'pause' : 'play');
  }

  const stepPx = () => {
    const card = track.firstElementChild;
    return card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : 0;
  };

  // Moves one card; wraps around at either end.
  function advance(dir) {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    const max = track.scrollWidth - track.clientWidth;
    if (dir > 0 && track.scrollLeft >= max - 2) track.scrollTo({ left: 0, behavior });
    else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: max, behavior });
    else track.scrollBy({ left: dir * stepPx(), behavior });
  }

  const holdAutoScroll = () => { resumeAt = Date.now() + RESUME_MS; };
  const hoverCanStick = window.matchMedia('(hover: hover)').matches; // on touch screens :hover lingers after a tap

  const timer = setInterval(() => {
    if (!playing || offscreen || document.hidden || Date.now() < resumeAt) return;
    if (hoverCanStick && root.matches(':hover')) return;
    advance(1);
  }, AUTO_MS);

  prevBtn.addEventListener('click', () => { holdAutoScroll(); advance(-1); });
  nextBtn.addEventListener('click', () => { holdAutoScroll(); advance(1); });
  toggleBtn.addEventListener('click', () => { playing = !playing; render(); });
  ['pointerdown', 'wheel', 'keydown', 'focusin'].forEach((type) =>
    track.addEventListener(type, holdAutoScroll, { passive: true }));

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => { offscreen = !entry.isIntersecting; }, { threshold: 0.2 })
    : null;
  observer?.observe(root);

  render();
  const offLang = onLangChange(render);
  return {
    update: render,
    destroy() {
      clearInterval(timer);
      observer?.disconnect();
      offLang();
    }
  };
}
