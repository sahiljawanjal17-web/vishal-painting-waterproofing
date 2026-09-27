// Headless booking flow (docs/06 §6.1): the state machine + submit pipeline behind the
// 7-step wizard. Pure and immutable — every function returns a new state — so the wizard
// UI only renders state and forwards user input. No DOM, no network.
//
// ctx = { options, services, partners, pricing?, site, now?: Date, holdDummyPartners? }
//   options  = booking-options.json,  services = services.json items,
//   partners = ACTIVE partners.json items,  site = site.json

import { config } from '../config.js';
import { PARTNER_BEST, STEP_COUNT, cleanText, normalizePhone, validateAll, validateStep } from './validators.js';
import { recommendPartnerId, routeLead } from './routing.js';
import { buildBookingUrl, generateRef } from './whatsapp.js';
import { clearDraft, loadDraft, saveDraft } from './storage.js';

export const emptyValues = () => ({
  client: { name: '', phone: '', location: '' },
  services: [],
  partnerId: null,
  scope: { id: null, customSqft: null },
  conditions: [],
  schedule: { date: '', slotId: null },
  mediaIntent: 'will-send',
  notes: '',
  consent: false,
  estimate: null
});

// Merges one level deep so `{ client: { name } }` doesn't wipe phone/location.
const mergeValues = (values, patch) => {
  const next = { ...values };
  for (const [key, value] of Object.entries(patch)) {
    const nested = value && typeof value === 'object' && !Array.isArray(value) && values[key] && typeof values[key] === 'object' && !Array.isArray(values[key]);
    next[key] = nested ? { ...values[key], ...value } : value;
  }
  return next;
};

export function createBooking(prefill = {}, now = new Date()) {
  return { currentStep: 1, values: mergeValues(emptyValues(), prefill), errors: {}, startedAt: now.getTime() };
}

export const updateValues = (state, patch) => ({ ...state, values: mergeValues(state.values, patch), errors: {} });

// Step 3 defaults to the lead partner of the first selected service (shown as "Recommended").
function withSuggestedPartner(state, ctx) {
  if (state.values.partnerId) return state;
  const suggested = recommendPartnerId(state.values.services, ctx.services);
  const valid = suggested && ctx.partners.some((p) => p.id === suggested);
  return { ...state, values: { ...state.values, partnerId: valid ? suggested : PARTNER_BEST } };
}

// Forward only if the current step validates; backwards is always allowed.
export function goNext(state, ctx) {
  const { valid, errors } = validateStep(state.currentStep, state.values, ctx);
  if (!valid) return { ...state, errors };
  const next = { ...state, errors: {}, currentStep: Math.min(state.currentStep + 1, STEP_COUNT) };
  return next.currentStep === 3 ? withSuggestedPartner(next, ctx) : next;
}

export const goBack = (state) => ({ ...state, errors: {}, currentStep: Math.max(1, state.currentStep - 1) });

// Indicator clicks: any earlier step, or a later one only if every step before it is valid.
export function goTo(state, step, ctx) {
  if (step < 1 || step > STEP_COUNT) return state;
  if (step <= state.currentStep) return { ...state, errors: {}, currentStep: step };
  for (let s = state.currentStep; s < step; s += 1) {
    if (!validateStep(s, state.values, ctx).valid) return state;
  }
  return { ...state, errors: {}, currentStep: step };
}

// Step 5 hint: services the chosen wall conditions recommend but the customer hasn't picked.
export function suggestedServices(values, ctx) {
  const wanted = new Set();
  for (const id of values.conditions) {
    const cond = ctx.options.wallConditions.find((c) => c.id === id);
    (cond?.suggestsServiceIds ?? []).forEach((sid) => wanted.add(sid));
  }
  return [...wanted].filter((sid) => !values.services.includes(sid) && ctx.services.some((s) => s.id === sid));
}

export const addServices = (state, ids) =>
  updateValues(state, { services: [...new Set([...state.values.services, ...ids])] });

/**
 * Prefill from any CTA. Unknown ids are ignored. Estimator prefill carries the estimate
 * object plus the services/scope it implies (see pricing.servicesForEstimate).
 * @param source 'estimator' | 'service-card' | 'partner-card' | 'gallery' | 'deep-link' | 'hero'
 */
export function prefillFrom(state, { services, partnerId, scope, estimate, notes }, ctx) {
  const patch = {};
  const knownServices = (services ?? []).filter((id) => ctx.services.some((s) => s.id === id));
  if (knownServices.length) patch.services = knownServices;
  if (partnerId && (partnerId === PARTNER_BEST || ctx.partners.some((p) => p.id === partnerId))) patch.partnerId = partnerId;
  if (scope?.id && ctx.options.propertyScopes.some((s) => s.id === scope.id)) patch.scope = { id: scope.id, customSqft: scope.customSqft ?? null };
  if (estimate) patch.estimate = { min: estimate.min, max: estimate.max, tier: estimate.tier, areaSqft: estimate.areaSqft };
  if (notes) patch.notes = notes;
  return updateValues(state, patch);
}

// "#booking?service=terrace-waterproofing&partner=p2" → prefill object (architecture §4.7).
export function parseDeepLink(hash) {
  const query = String(hash ?? '').split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const services = (params.get('service') ?? '').split(',').filter(Boolean);
  return { services, partnerId: params.get('partner') || null };
}

/** Booking payload (docs/03 §3.10) from state. Assumes the state already validated. */
export function buildPayload(state, ctx, { lang = 'en', source = 'website', now = new Date() } = {}) {
  const v = state.values;
  // Presets ("2 BHK") have a default size; only custom/commercial carry the customer's own number.
  const needsSqft = ctx.options.propertyScopes.find((s) => s.id === v.scope.id)?.defaultSqft == null;
  return {
    client: { name: cleanText(v.client.name), phone: normalizePhone(v.client.phone), location: cleanText(v.client.location) },
    services: [...v.services],
    partnerId: v.partnerId || PARTNER_BEST,
    scope: needsSqft ? { id: v.scope.id, customSqft: Number(v.scope.customSqft) } : { id: v.scope.id },
    conditions: [...v.conditions],
    schedule: { date: v.schedule.date, slotId: v.schedule.slotId },
    mediaIntent: v.mediaIntent,
    ...(cleanText(v.notes) ? { notes: cleanText(v.notes) } : {}),
    ...(v.estimate ? { estimate: v.estimate } : {}),
    meta: { lang, source, createdAt: now.toISOString() }
  };
}

/**
 * Final step: validate everything, build the payload, pick the recipient, and produce the
 * wa.me URL. Nothing is sent — the caller opens `url` (whatsapp.openWhatsApp), emits
 * `booking:submitted`, then clears the draft.
 */
export function submitBooking(state, ctx, { lang = 'en', source = 'website', random = Math.random } = {}) {
  const now = ctx.now ?? new Date();
  const check = validateAll(state.values, { ...ctx, now });
  if (!check.valid) return { ok: false, firstInvalidStep: check.firstInvalidStep, failures: check.failures };

  const payload = buildPayload(state, ctx, { lang, source, now });

  const route = routeLead(payload, { partners: ctx.partners, site: ctx.site, holdDummyPartners: ctx.holdDummyPartners ?? config.booking.holdLeadsForDummyPartners });
  const ref = generateRef(now, random);
  const { url, message, truncated } = buildBookingUrl(route.wa, payload, { ...ctx, ref }, lang);
  return { ok: true, payload, route, ref, url, message, truncated };
}

// ---- Draft persistence: only in the visitor's own browser, expiring, never includes consent. ----

export function persistDraft(state) {
  const { consent, ...values } = state.values;
  return saveDraft(config.booking.draftStorageKey, { currentStep: state.currentStep, values }, config.booking.draftTTLDays);
}

export function restoreDraft(now = new Date()) {
  const draft = loadDraft(config.booking.draftStorageKey);
  if (!draft?.values) return null;
  return { currentStep: Math.min(Math.max(Number(draft.currentStep) || 1, 1), STEP_COUNT), values: mergeValues(emptyValues(), draft.values), errors: {}, startedAt: now.getTime() };
}

export const discardDraft = () => clearDraft(config.booking.draftStorageKey);
