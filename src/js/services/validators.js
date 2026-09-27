// Pure validators for the 7-step booking wizard (docs/06 §6.2). No DOM.
// Field validators return `null` when valid, else an error key that maps to the i18n
// key `booking.errors.<key>`. Step validators return { valid, errors: { field: key } }.

import { parseISODate, toISODate } from './formatters.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const PHONE_RE = /^[6-9]\d{9}$/;

export const NOTES_MAX = 300;
export const SQFT_RANGE = Object.freeze({ min: 50, max: 100000 });
export const PARTNER_BEST = 'best';
export const MEDIA_INTENTS = Object.freeze(['will-send', 'later', 'none']);

// Collapses whitespace so "  Rahul   K " compares/prints cleanly.
export const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// "+91 90116-08592", "09011608592", "919011608592" → "9011608592". Anything that doesn't
// reduce to 10 digits is returned as-is (digits only) and will fail validatePhone.
export function normalizePhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 14 && d.startsWith('0091')) d = d.slice(4);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export function validateName(raw) {
  const name = cleanText(raw);
  return name.length >= 2 && name.length <= 60 && NAME_RE.test(name) ? null : 'name';
}

export const validatePhone = (raw) => (PHONE_RE.test(normalizePhone(raw)) ? null : 'phone');

export function validateLocation(raw) {
  const location = cleanText(raw);
  return location.length >= 2 && location.length <= 100 ? null : 'location';
}

export const validateServices = (ids, serviceIds) =>
  Array.isArray(ids) && ids.length > 0 && ids.every((id) => serviceIds.includes(id)) ? null : 'service';

// `partnerIds` = ids of active partners; "best" means "let the business assign".
export const validatePartner = (id, partnerIds) =>
  id === PARTNER_BEST || partnerIds.includes(id) ? null : 'partner';

export function validateScope(scope, options) {
  const found = options.propertyScopes.find((s) => s.id === scope?.id);
  return found ? null : 'scope';
}

// Custom/commercial scopes have no default size, so the customer must give one.
export function validateSqft(scope, options) {
  const found = options.propertyScopes.find((s) => s.id === scope?.id);
  if (!found || found.defaultSqft != null) return null;
  const n = Number(scope.customSqft);
  return Number.isFinite(n) && n >= SQFT_RANGE.min && n <= SQFT_RANGE.max ? null : 'sqft';
}

export function validateConditions(ids, options) {
  if (!Array.isArray(ids) || ids.length === 0) return 'condition';
  const known = options.wallConditions.map((c) => c.id);
  if (!ids.every((id) => known.includes(id))) return 'condition';
  const clash = (options.exclusiveConditions || []).some((pair) => pair.every((id) => ids.includes(id)));
  return clash ? 'conditionConflict' : null;
}

// Earliest/latest bookable dates as ISO strings, for both validation and <input type="date" min max>.
export function dateBounds(options, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    min: toISODate(new Date(today.getTime() + options.leadDaysMin * DAY_MS)),
    max: toISODate(new Date(today.getTime() + options.maxDaysAhead * DAY_MS))
  };
}

export function validateDate(iso, options, now = new Date()) {
  const date = parseISODate(iso);
  if (!date) return 'date';
  const { min, max } = dateBounds(options, now);
  if (iso < min || iso > max) return 'date'; // ISO strings sort chronologically
  return (options.blockedWeekdays || []).includes(date.getDay()) ? 'date' : null;
}

export const validateSlot = (slotId, options) => (options.timeSlots.some((s) => s.id === slotId) ? null : 'slot');

export const validateNotes = (raw) => (cleanText(raw).length <= NOTES_MAX ? null : 'notes');

export const validateConsent = (value) => (value === true ? null : 'consent');

const drop = (errors) => Object.fromEntries(Object.entries(errors).filter(([, v]) => v));

// ctx = { options, services, partners, now }. `services`/`partners` are the loaded JSON `items`.
const STEP_RULES = {
  1: (v) => ({ name: validateName(v.client?.name), phone: validatePhone(v.client?.phone), location: validateLocation(v.client?.location) }),
  2: (v, c) => ({ services: validateServices(v.services, c.services.map((s) => s.id)) }),
  3: (v, c) => ({ partnerId: validatePartner(v.partnerId, c.partners.map((p) => p.id)) }),
  4: (v, c) => ({ scope: validateScope(v.scope, c.options), customSqft: validateScope(v.scope, c.options) ? null : validateSqft(v.scope, c.options) }),
  5: (v, c) => ({ conditions: validateConditions(v.conditions, c.options) }),
  6: (v, c) => ({ date: validateDate(v.schedule?.date, c.options, c.now), slotId: validateSlot(v.schedule?.slotId, c.options) }),
  7: (v) => ({
    mediaIntent: MEDIA_INTENTS.includes(v.mediaIntent) ? null : 'mediaIntent',
    notes: validateNotes(v.notes),
    consent: validateConsent(v.consent)
  })
};

export const STEP_COUNT = Object.keys(STEP_RULES).length;

export function validateStep(step, values, ctx) {
  const rule = STEP_RULES[step];
  if (!rule) throw new RangeError(`Unknown booking step: ${step}`);
  const errors = drop(rule(values, ctx));
  return { valid: Object.keys(errors).length === 0, errors };
}

// Every step, so the review screen / submit can refuse and jump to the first broken step.
export function validateAll(values, ctx) {
  const failures = [];
  for (let step = 1; step <= STEP_COUNT; step += 1) {
    const { valid, errors } = validateStep(step, values, ctx);
    if (!valid) failures.push({ step, errors });
  }
  return { valid: failures.length === 0, firstInvalidStep: failures[0]?.step ?? null, failures };
}
