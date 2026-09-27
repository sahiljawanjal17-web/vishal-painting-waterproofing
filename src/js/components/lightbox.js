import { el } from '../core/dom.js';
import { pick, t } from '../core/labels.js';
import { getLang, onLangChange } from '../core/app-state.js';
import { greeting, resolveContact, waHref } from '../services/contact.js';
import { initBeforeAfterSlider } from './before-after-slider.js';

/**
 * Modal viewer for a gallery set, built on native <dialog> (focus trap, Esc and
 * inert background come for free). Reuses the before/after slider, and its CTA
 * opens WhatsApp with the partner who did that project.
 */
export function initLightbox({ pairs, partners, site }) {
  let set = [];
  let index = 0;
  let slider = null;

  const stage = el('div', { class: 'lightbox__stage' });
  const caption = el('div', { class: 'lightbox__caption' });
  const cta = el('a', { class: 'btn btn-whatsapp', target: '_blank', rel: 'noopener', 'data-contact-wa': 'lightbox' });
  const closeBtn = el('button', { class: 'lightbox__close', type: 'button', text: '×' });
  const prevBtn = el('button', { class: 'lightbox__nav lightbox__nav--prev', type: 'button', text: '‹' });
  const nextBtn = el('button', { class: 'lightbox__nav lightbox__nav--next', type: 'button', text: '›' });

  const dialog = el('dialog', { class: 'lightbox' },
    closeBtn,
    el('div', { class: 'lightbox__panel' },
      stage,
      el('div', { class: 'lightbox__bar' }, prevBtn, caption, nextBtn),
      cta));
  document.body.append(dialog);

  function render() {
    const lang = getLang();
    const pair = pairs.find((p) => p.id === set[index]);
    if (!pair) return;
    const partner = partners.find((p) => p.id === pair.partnerId);
    const name = partner ? pick(partner.name, lang) : '';
    const contact = resolveContact(partner, site);

    slider?.destroy();
    slider = initBeforeAfterSlider(stage, { pair, lang, priority: true });

    caption.replaceChildren(
      el('strong', { text: pick(pair.title, lang) }),
      el('span', { text: pick(pair.caption, lang) }),
      el('span', { class: 'lightbox__count', text: `${index + 1} / ${set.length}` })
    );

    cta.href = waHref(contact.wa, greeting(name, lang));
    cta.textContent = name ? `${t('wantThis', lang)} ${t('chatWith', lang, { name })}` : t('wantThis', lang);

    closeBtn.setAttribute('aria-label', t('close', lang));
    prevBtn.setAttribute('aria-label', t('prev', lang));
    nextBtn.setAttribute('aria-label', t('next', lang));
    prevBtn.disabled = nextBtn.disabled = set.length < 2;
  }

  const step = (delta) => {
    index = (index + delta + set.length) % set.length;
    render();
  };

  closeBtn.addEventListener('click', () => dialog.close());
  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  // Backdrop click: the dialog element itself is the target only outside the panel.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    // The slider handle owns the arrow keys while it has focus.
    if (e.target.closest('.ba__handle') || set.length < 2) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  dialog.addEventListener('close', () => { slider?.destroy(); slider = null; });

  const offOpen = window.ebus.on('gallery:open', (payload) => {
    set = payload.set;
    index = payload.index;
    render();
    dialog.showModal();
  });
  const offLang = onLangChange(() => dialog.open && render());

  return {
    destroy() { offOpen(); offLang(); dialog.remove(); }
  };
}
