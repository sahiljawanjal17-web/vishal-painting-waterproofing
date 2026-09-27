import { el } from '../core/dom.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';

const FILTER_LABELS = {
  all: 'filterAll',
  interior: 'filterInterior',
  exterior: 'filterExterior',
  putty: 'filterPutty',
  waterproofing: 'filterWaterproofing',
  crack: 'filterCrack'
};

/**
 * Filterable grid of before/after projects. Tiles show the "after" image; clicking
 * one emits gallery:open and the lightbox (a separate component) takes over.
 * Only tags that actually occur in the data get a filter chip.
 */
export function initGallery(root, { pairs }) {
  const filters = el('div', { class: 'gallery-filters', role: 'group' });
  const grid = el('div', { class: 'gallery-grid' });
  root.replaceChildren(filters, grid);

  const tags = ['all', ...Object.keys(FILTER_LABELS).filter((tag) => tag !== 'all' && pairs.some((p) => p.tags?.includes(tag)))];
  let active = 'all';

  const visible = () => (active === 'all' ? pairs : pairs.filter((p) => p.tags?.includes(active)));

  function render() {
    const lang = getLang();
    filters.replaceChildren(...tags.map((tag) =>
      el('button', {
        class: `gallery-chip${tag === active ? ' gallery-chip--active' : ''}`,
        type: 'button',
        'aria-pressed': String(tag === active),
        'data-filter': tag,
        text: t(FILTER_LABELS[tag], lang)
      })));

    const set = visible();
    grid.replaceChildren(...set.map((pair, index) => {
      const title = pick(pair.title, lang);
      return el('button', {
        class: 'gallery-tile',
        type: 'button',
        'data-index': String(index),
        'aria-label': t('openProject', lang, { title })
      },
        el('img', {
          src: pair.after.src,
          alt: '',
          width: String(pair.width || 800),
          height: String(pair.height || 600),
          loading: 'lazy',
          decoding: 'async'
        }),
        el('span', { class: 'gallery-tile__badge', text: `${t('before', lang)} / ${t('after', lang)}` }),
        el('span', { class: 'gallery-tile__caption' },
          el('strong', { text: title }),
          el('span', { text: pick(pair.caption, lang) })
        ));
    }));
  }

  const onClick = (e) => {
    const chip = e.target.closest('.gallery-chip');
    if (chip) {
      active = chip.dataset.filter;
      render();
      return;
    }
    const tile = e.target.closest('.gallery-tile');
    if (tile) {
      window.ebus.emit('gallery:open', { index: Number(tile.dataset.index), set: visible().map((p) => p.id) });
    }
  };
  root.addEventListener('click', onClick);

  render();
  const offLang = onLangChange(render);

  return {
    update: render,
    destroy() { offLang(); root.removeEventListener('click', onClick); }
  };
}
