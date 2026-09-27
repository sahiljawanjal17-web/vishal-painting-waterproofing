// Fixed background video controller. The clip stays unloaded (preload=none + poster) until the intro is
// gone, so the two videos never compete for bandwidth. It pauses when the tab is hidden, on Save-Data /
// reduced-motion (poster only), and the visitor can always pause it (WCAG 2.2.2).
import { getLang, onLangChange } from '../core/app-state.js';
import { t } from '../core/labels.js';

// hero-fast.* is already sped up 3x at encode time; this multiplies on top (net ~5.4x the original
// footage) so the paint flow and droplets clearly move. Lower it if playback looks choppy.
const PLAYBACK_RATE = 1.8;

export function initSiteBg(root, toggle) {
  const video = root?.querySelector('.site-bg__video');
  if (!video || !toggle) return null;

  const conn = navigator.connection;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) { video.remove(); toggle.remove(); return null; }

  video.defaultPlaybackRate = PLAYBACK_RATE;
  video.playbackRate = PLAYBACK_RATE;
  video.addEventListener('loadedmetadata', () => { video.playbackRate = PLAYBACK_RATE; });

  let wanted = !reduce;   // what the visitor/system wants
  let visible = !document.hidden;

  function paint() {
    document.body.classList.toggle('site-bg--paused', !wanted);
    toggle.setAttribute('aria-label', t(wanted ? 'bgPause' : 'bgPlay', getLang()));
    toggle.setAttribute('aria-pressed', String(!wanted));
    if (wanted && visible) video.play().catch(() => {}); else video.pause();
  }

  toggle.addEventListener('click', () => { wanted = !wanted; paint(); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; paint(); });
  onLangChange(paint);
  // Some browsers (iOS low-power mode) refuse autoplay until the visitor touches the page: retry then.
  const retry = () => { if (wanted && video.paused) video.play().catch(() => {}); };
  ['pointerdown', 'scroll', 'keydown'].forEach((type) => addEventListener(type, retry, { once: true, passive: true }));

  if (document.documentElement.classList.contains('intro-on')) document.addEventListener('intro:done', paint, { once: true });
  else paint();
  return { paint };
}
