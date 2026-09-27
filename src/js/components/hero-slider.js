import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t } from '../core/labels.js';
import { initBeforeAfterSlider } from './before-after-slider.js';

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Top-left badge: the tool that matches the project on screen.
const SERVICE_ICONS = {
  'interior-painting': 'roller',
  'exterior-painting': 'building',
  'wall-putty': 'putty-blade',
  'terrace-waterproofing': 'shield-drop',
  'crack-repair': 'shield-drop'
};
const iconFor = (pair) => SERVICE_ICONS[pair.serviceId] || 'roller';

const FADE_MS = 180;

/**
 * Hero slider: one before/after slider + prev/next arrows, progress dots and a
 * pause button to move between the featured pairs.
 *
 * Auto-scroll is driven by the CSS fill animation on the active dot: its
 * `animationend` advances to the next pair. That way hover / keyboard focus /
 * off-screen / hidden-tab pausing is just `animation-play-state` in CSS and the
 * timer can never drift from what the visitor sees. Users with reduced motion
 * start stopped; dragging the slider stops it too (it must not swap under a finger).
 */
export function initHeroSlider(container, { pairs, lang }) {
  const stage = el('div', { class: 'ba-stage' });
  const badge = el('span', { class: 'ba-badge', 'aria-hidden': 'true' });
  const prevBtn = el('button', { class: 'ba-nav', type: 'button', html: icon('chevron-left') });
  const nextBtn = el('button', { class: 'ba-nav', type: 'button', html: icon('chevron-right') });
  const toggleBtn = el('button', { class: 'ba-nav ba-nav--toggle', type: 'button' });
  const dots = el('div', { class: 'ba-dots', role: 'group' });
  const controls = el('div', { class: 'ba-controls' }, prevBtn, dots, nextBtn, toggleBtn);

  container.classList.add('ba-hero');
  container.replaceChildren(el('div', { class: 'ba-frame' }, stage, badge), controls);

  const slider = initBeforeAfterSlider(stage, { pair: pairs[0], lang, priority: true });
  let currentLang = lang;
  let active = 0;
  let playing = !prefersReducedMotion();
  let fadeTimer = 0;

  const buttons = pairs.map((_, i) => {
    const btn = el('button', { class: 'ba-dot', type: 'button', onclick: () => show(i) });
    dots.append(btn);
    return btn;
  });

  function paint() {
    buttons.forEach((btn, i) => {
      btn.setAttribute('aria-label', t('showPair', currentLang, { n: i + 1 }));
      btn.setAttribute('aria-pressed', String(i === active));
      btn.classList.toggle('ba-dot--active', i === active);
    });
    prevBtn.setAttribute('aria-label', t('prevProject', currentLang));
    nextBtn.setAttribute('aria-label', t('nextProject', currentLang));
    toggleBtn.setAttribute('aria-label', t(playing ? 'pauseAuto' : 'playAuto', currentLang));
    toggleBtn.innerHTML = icon(playing ? 'pause' : 'play');
    container.classList.toggle('ba-hero--stopped', !playing);
    badge.innerHTML = icon(iconFor(pairs[active]), 'ba-badge__icon');
  }

  function show(i) {
    if (i === active) return;
    active = i;
    paint();
    clearTimeout(fadeTimer);
    if (prefersReducedMotion()) return slider.setPair(pairs[i]);
    // Brief fade so the image swap isn't a hard cut.
    stage.classList.add('ba-stage--fading');
    fadeTimer = setTimeout(() => {
      slider.setPair(pairs[i]);
      stage.classList.remove('ba-stage--fading');
    }, FADE_MS);
  }

  const step = (delta) => show((active + delta + pairs.length) % pairs.length);

  function setPlaying(on) {
    playing = on;
    paint();
  }

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  toggleBtn.addEventListener('click', () => setPlaying(!playing));
  stage.addEventListener('pointerdown', () => playing && setPlaying(false));
  dots.addEventListener('animationend', (e) => {
    if (e.animationName === 'ba-fill') step(1);
  });

  // Pause (not stop) while the hero is scrolled away or the tab is in the background.
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => {
        container.classList.toggle('ba-hero--offscreen', !entry.isIntersecting);
      }, { threshold: 0.3 })
    : null;
  observer?.observe(container);
  const onVisibility = () => container.classList.toggle('ba-hero--hidden', document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  // Warm the other pairs once the page is quiet so the first switch doesn't flash empty.
  const preload = () => pairs.slice(1).forEach((p) => {
    new Image().src = p.before.src;
    new Image().src = p.after.src;
  });
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
  idle(preload);

  paint();
  if (pairs.length < 2) controls.hidden = true;

  return {
    setLang(next) { currentLang = next; slider.setLang(next); paint(); },
    destroy() {
      clearTimeout(fadeTimer);
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      slider.destroy();
    }
  };
}
