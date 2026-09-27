// Intro overlay controller. Timing lives in CSS (the progress bar's animationend), so this only
// handles: skip, video failure, keyboard, focus/inert of the page behind, and the once-per-session flag.
import { getLang } from '../core/app-state.js';
import { applyLabels } from '../core/labels.js';

const SAFETY_MS = 12000;

export function initIntro(root) {
  if (!root || !document.documentElement.classList.contains('intro-on')) return null;

  applyLabels(root, getLang());
  const video = root.querySelector('.intro__video');
  const skip = root.querySelector('.intro__skip');
  const progress = root.querySelector('.intro__progress');
  const behind = [...document.body.children].filter((n) => n !== root && !['SCRIPT', 'STYLE'].includes(n.tagName));
  let done = false;

  // The page behind must not be reachable by Tab / screen readers while the overlay covers it.
  behind.forEach((n) => n.setAttribute('inert', ''));
  skip.focus({ preventScroll: true });

  const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
  if (saveData) video.remove(); // poster only: the overlay still shows the brand moment without the download

  function finish() {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* private mode: intro just shows again next visit */ }
    behind.forEach((n) => n.removeAttribute('inert'));
    root.classList.add('intro--leave');
    const cleanup = () => {
      document.documentElement.classList.remove('intro-on');
      video?.pause();
      root.remove();
      document.dispatchEvent(new Event('intro:done'));
    };
    root.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 1300); // reduced/interrupted transitions never fire transitionend
  }

  progress.addEventListener('animationend', finish);
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(); }, { once: true });
  setTimeout(finish, SAFETY_MS);

  // Autoplay can be refused (low-power mode); the poster stays and the timeline still runs.
  video?.play?.().catch(() => {});
  return { skip: finish };
}
