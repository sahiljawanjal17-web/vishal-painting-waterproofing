import { el } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';

/**
 * Video reel with a click-to-play facade: nothing but metadata is fetched until
 * the visitor presses play. Videos that haven't been marked faceless_verified are
 * skipped (non-negotiable in the project spec). If none qualify, the whole
 * section hides rather than showing an empty box.
 */
export function initVideoReel(root, { videos }) {
  const playable = videos.filter((v) => v.faceless_verified === true && v.provider === 'local');
  const section = root.closest('section');
  if (!playable.length) {
    if (section) section.hidden = true;
    return { update() {}, destroy() {} };
  }

  function pauseOthers(except) {
    root.querySelectorAll('video').forEach((v) => { if (v !== except) v.pause(); });
  }

  function buildCard(item, lang) {
    const title = pick(item.title, lang);
    const [w, h] = item.aspect.split(':');
    // With a thumbnail we fetch nothing until play (the facade). Without one, fall back to
    // metadata + #t so the browser can paint a first frame — less reliable across browsers.
    const video = el('video', {
      src: item.thumbnail ? item.src : `${item.src}#t=0.1`,
      poster: item.thumbnail,
      preload: item.thumbnail ? 'none' : 'metadata',
      playsinline: true,
      muted: true,
      loop: true,
      'aria-label': title
    });
    video.muted = true; // the attribute alone isn't reliable for autoplay policy

    const playBtn = el('button', {
      class: 'video-card__play',
      type: 'button',
      'aria-label': t('playVideo', lang, { title }),
      html: icon('play', 'video-card__play-icon')
    });
    playBtn.addEventListener('click', () => {
      pauseOthers(video);
      video.controls = true;
      video.muted = false;
      video.play();
      playBtn.hidden = true;
    });
    video.addEventListener('pause', () => { if (!video.ended) playBtn.hidden = false; });

    return el('figure', { class: 'video-card', style: `--video-ratio:${w}/${h}` },
      el('div', { class: 'video-card__frame' }, video, playBtn),
      el('figcaption', { text: title }));
  }

  function render() {
    const lang = getLang();
    root.replaceChildren(...playable.map((v) => buildCard(v, lang)));
  }

  render();
  const offLang = onLangChange(render);
  return { update: render, destroy: offLang };
}
