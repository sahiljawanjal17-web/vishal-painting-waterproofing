// Phone hamburger drawer. Opens from the header button; closes on a link, the X, the backdrop, Esc,
// or when the window grows to desktop width. While open: page scroll is locked, focus is kept inside
// the panel, and focus returns to the button on close.
import { qsa } from '../core/dom.js';

const DESKTOP = matchMedia('(min-width: 768px)');

export function initNavDrawer(drawer, toggle) {
  if (!drawer || !toggle) return null;
  const panel = drawer.querySelector('.nav-drawer__panel');
  const focusables = () => qsa('a[href], button:not([disabled])', panel);

  function setOpen(open) {
    drawer.classList.toggle('is-open', open);
    drawer.toggleAttribute('inert', !open);
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) focusables()[0]?.focus();
    else toggle.focus({ preventScroll: true });
  }

  const isOpen = () => drawer.classList.contains('is-open');

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-nav-close]')) setOpen(false); });

  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') return setOpen(false);
    if (e.key !== 'Tab') return;
    // Keep Tab / Shift+Tab cycling inside the panel.
    const items = focusables();
    const first = items[0];
    const last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  DESKTOP.addEventListener('change', (e) => { if (e.matches && isOpen()) setOpen(false); });
  return { open: () => setOpen(true), close: () => setOpen(false) };
}
