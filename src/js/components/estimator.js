import { el } from '../core/dom.js';
import { t } from '../core/labels.js';
import { getLang, onLangChange, publishEstimate, selectPartner } from '../core/app-state.js';
import { config } from '../config.js';
import { estimate, resolveTier, servicesForEstimate, validTiersFor } from '../services/pricing.js';
import { formatINRRange, localize } from '../services/formatters.js';
import { recommendPartnerId, routeLead } from '../services/routing.js';
import { buildEstimateMessage, buildUrl, generateRef, openWhatsApp } from '../services/whatsapp.js';

const SURFACES = [
  { id: 'interior', label: 'surfaceInterior' },
  { id: 'exterior', label: 'surfaceExterior' },
  { id: 'terrace', label: 'surfaceTerrace' }
];

/**
 * Cost estimator card. All maths is in services/pricing.js; this file only reads the
 * three inputs, renders the result and hands the CTA to WhatsApp. The <select> markup in
 * index.html is rebuilt here so option values are stable ids (not display text).
 */
export function initEstimator(root, { pricing, partners, services, site }) {
  const area = root.querySelector('#est-area');
  const surface = root.querySelector('#est-surface');
  const tier = root.querySelector('#est-tier');
  const price = root.querySelector('.est-price');
  const note = root.querySelector('.est-note');
  const cta = root.querySelector('.btn-whatsapp');
  let last = null; // last successful { estimate, input }

  function fillSelect(select, options, selected) {
    select.replaceChildren(...options.map(({ value, text }) => el('option', { value, text, selected: value === selected })));
  }

  function fillOptions() {
    const lang = getLang();
    fillSelect(surface, SURFACES.map((s) => ({ value: s.id, text: t(s.label, lang) })), surface.value || 'interior');
    const chosen = resolveTier(pricing, surface.value, tier.value || pricing.tiers[0].id).tierId;
    fillSelect(tier, validTiersFor(pricing, surface.value).map((x) => ({ value: x.id, text: localize(x.label, lang) })), chosen);
    cta.textContent = t('bookEstimateWa', lang);
  }

  function render(hint = '') {
    const lang = getLang();
    const result = estimate(pricing, { areaSqft: area.value, surface: surface.value, tierId: tier.value });
    if (!result.ok) {
      price.textContent = t('estimateInvalid', lang);
      note.textContent = localize(pricing.disclaimer, lang);
      cta.disabled = true;
      return;
    }
    const input = result.input;
    last = { estimate: result, input };
    cta.disabled = false;
    price.textContent = t('estimated', lang, { range: formatINRRange(result.min, result.max, lang) });
    const notes = [hint, result.flags.areaClamped && t('estimateAreaClamped', lang, { area: input.areaSqft }), result.flags.customQuote && t('estimateCustomQuote', lang), localize(pricing.disclaimer, lang)];
    note.textContent = notes.filter(Boolean).join(' ');
    publishEstimate(last);
  }

  // Changing surface can invalidate the tier (e.g. Distemper on a terrace): switch and say so.
  function onSurfaceChange() {
    const lang = getLang();
    const { tierId, switched } = resolveTier(pricing, surface.value, tier.value);
    fillOptions();
    tier.value = tierId;
    const name = localize(pricing.tiers.find((x) => x.id === tierId)?.label, lang);
    render(switched ? t('estimateTierSwitched', lang, { tier: name }) : '');
  }

  // Quick path (docs/06 §6.5): no wizard needed — send the estimate to the right person.
  function onBook() {
    if (!last) return;
    const lang = getLang();
    const partnerId = recommendPartnerId(servicesForEstimate(last.input), services);
    const route = routeLead({ partnerId }, { partners, site, holdDummyPartners: config.booking.holdLeadsForDummyPartners });
    const surfaceLabel = t(SURFACES.find((s) => s.id === last.input.surface).label, lang);
    const message = buildEstimateMessage(last, { pricing, ref: generateRef(), surfaceLabel }, lang);
    if (partnerId) selectPartner(partnerId); // contact dock follows the specialist for this job
    openWhatsApp(buildUrl(route.wa, message));
  }

  fillOptions();
  render();
  area.addEventListener('input', () => render());
  surface.addEventListener('change', onSurfaceChange);
  tier.addEventListener('change', () => render());
  cta.addEventListener('click', onBook);
  const offLang = onLangChange(() => { fillOptions(); render(); });

  return { update: () => render(), destroy() { offLang(); } };
}
