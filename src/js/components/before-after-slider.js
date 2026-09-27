import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';

const clamp = (n) => Math.max(0, Math.min(100, n));
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Before/after comparison. The "after" image sits on top, clipped from the left
 * edge (clip-path: inset(0 0 0 X%)), so dragging right reveals more "before".
 * Returns { setPair, setLang, destroy } so the hero can swap pairs and the
 * lightbox can reuse the same component.
 */
export function initBeforeAfterSlider(root, { pair, lang, priority = false }) {
  let percent = 50;
  let dragging = false;
  let currentLang = lang;
  let currentPair = pair;

  const beforeImg = el('img', { class: 'ba__img ba__before', decoding: 'async' });
  const afterImg = el('img', { class: 'ba__img ba__after', decoding: 'async' });
  const beforeTag = el('span', { class: 'ba__tag ba__tag--before' });
  const afterTag = el('span', { class: 'ba__tag ba__tag--after' });
  const handle = el('div', {
    class: 'ba__handle',
    role: 'slider',
    tabindex: '0',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    html: icon('arrows', 'ba__handle-icon')
  });

  root.classList.add('ba');
  root.replaceChildren(beforeImg, afterImg, beforeTag, afterTag, handle);

  function render() {
    afterImg.style.clipPath = `inset(0 0 0 ${percent}%)`;
    handle.style.left = `${percent}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(percent)));
  }

  function paintText() {
    const title = pick(currentPair.title, currentLang);
    beforeImg.alt = `${t('before', currentLang)}: ${title}`;
    afterImg.alt = `${t('after', currentLang)}: ${title}`;
    beforeTag.textContent = t('before', currentLang);
    afterTag.textContent = t('after', currentLang);
    handle.setAttribute('aria-label', t('sliderLabel', currentLang));
  }

  function setPair(next) {
    currentPair = next;
    const width = next.width || 800;
    const height = next.height || 600;
    for (const [img, side] of [[beforeImg, next.before], [afterImg, next.after]]) {
      img.src = side.src;
      img.width = width;
      img.height = height;
    }
    paintText();
  }

  const moveTo = (clientX) => {
    const rect = root.getBoundingClientRect();
    percent = clamp(((clientX - rect.left) / rect.width) * 100);
    render();
  };

  const onPointerDown = (e) => {
    dragging = true;
    root.classList.remove('ba--nudge');
    root.setPointerCapture(e.pointerId);
    moveTo(e.clientX); // click-to-jump
  };
  const onPointerMove = (e) => dragging && moveTo(e.clientX);
  const onPointerEnd = () => { dragging = false; };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 5;
    const keys = {
      ArrowLeft: () => percent - step,
      ArrowRight: () => percent + step,
      Home: () => 0,
      End: () => 100
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    root.classList.remove('ba--nudge');
    percent = clamp(keys[e.key]());
    render();
  };

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerup', onPointerEnd);
  root.addEventListener('pointercancel', onPointerEnd);
  handle.addEventListener('keydown', onKeyDown);

  // LCP candidate on the home page; everything else can wait. Must be set before src.
  afterImg.loading = priority ? 'eager' : 'lazy';
  beforeImg.loading = priority ? 'eager' : 'lazy';
  if (priority) afterImg.setAttribute('fetchpriority', 'high');
  setPair(pair);
  render();

  // One-time hint: nudge 50 → 60 → 50 when first scrolled into view.
  let observer = null;
  if (!prefersReducedMotion() && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      root.classList.add('ba--nudge');
      percent = 60; render();
      setTimeout(() => { percent = 50; render(); }, 450);
      setTimeout(() => root.classList.remove('ba--nudge'), 950);
    }, { threshold: 0.6 });
    observer.observe(root);
  }

  return {
    setPair,
    setLang(next) { currentLang = next; paintText(); },
    destroy() {
      observer?.disconnect();
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerEnd);
      root.removeEventListener('pointercancel', onPointerEnd);
    }
  };
}
