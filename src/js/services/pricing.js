// Pure cost-estimator math (docs/07). No DOM, no I/O: pass in the parsed pricing.json.
// All money is integer INR. Rates in pricing.json are PLACEHOLDERS until the owner confirms them.

export const AREA_LIMITS = Object.freeze({ min: 100, max: 10000 });
const ROUND_TO = 500;
const MIN_SPREAD = 1000;
const CUSTOM_QUOTE_ABOVE_SQFT = 5000;

const roundTo = (n, step) => Math.round(n / step) * step;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const tierById = (pricing, id) => pricing.tiers.find((t) => t.id === id) ?? null;

export const validTiersFor = (pricing, surface) => pricing.tiers.filter((t) => t.surfaces.includes(surface));

// Changing surface can strand the selected tier (e.g. Distemper on a terrace). Returns the
// tier to use and whether it had to change, so the UI can show its toast-hint.
export function resolveTier(pricing, surface, tierId) {
  const valid = validTiersFor(pricing, surface);
  if (valid.some((t) => t.id === tierId)) return { tierId, switched: false };
  return { tierId: valid[0]?.id ?? null, switched: true };
}

/**
 * @param pricing parsed pricing.json
 * @param input { areaSqft?, presetId?, surface, tierId, addOns?: string[] }
 *   A preset wins over areaSqft (it maps to paintable wall area, not carpet area).
 * @returns { ok, errors, min, max, perSqft, breakdown, flags, input } — `errors` lists
 *   machine codes ('area' | 'surface' | 'tier' | 'tierSurface' | 'preset'); when !ok the
 *   numeric fields are absent and the UI should keep its last good result.
 */
export function estimate(pricing, input) {
  const errors = [];
  const preset = input.presetId ? pricing.presets.find((p) => p.id === input.presetId) : null;
  if (input.presetId && !preset) errors.push('preset');

  const rawArea = preset ? preset.paintableAreaSqft : Number(input.areaSqft);
  if (!Number.isFinite(rawArea) || rawArea <= 0) errors.push('area');

  if (!(input.surface in pricing.surfaceMultipliers)) errors.push('surface');
  const tier = tierById(pricing, input.tierId);
  if (!tier) errors.push('tier');
  else if (!errors.includes('surface') && !tier.surfaces.includes(input.surface)) errors.push('tierSurface');

  if (errors.length) return { ok: false, errors };

  const area = clamp(rawArea, AREA_LIMITS.min, AREA_LIMITS.max);
  const mult = pricing.surfaceMultipliers[input.surface];
  const breakdown = [{
    id: tier.id,
    type: 'tier',
    min: area * tier.ratePerSqft.min * mult,
    max: area * tier.ratePerSqft.max * mult
  }];

  const skippedAddOns = [];
  const appliedAddOns = [];
  for (const id of new Set(input.addOns ?? [])) {
    const addOn = pricing.addOns.find((a) => a.id === id);
    if (!addOn || !addOn.surfaces.includes(input.surface)) {
      skippedAddOns.push(id); // unknown or not applicable to this surface: ignore rather than mis-price
      continue;
    }
    const src = addOn.ratePerSqft ?? addOn.flat;
    const scale = addOn.ratePerSqft ? area : 1;
    appliedAddOns.push(id);
    breakdown.push({ id, type: 'addOn', min: src.min * scale, max: src.max * scale });
  }

  const sum = (key) => breakdown.reduce((total, line) => total + line[key], 0);
  const min = Math.max(pricing.minimumJobCharge, roundTo(sum('min'), ROUND_TO));
  const max = Math.max(min + MIN_SPREAD, roundTo(sum('max'), ROUND_TO));

  return {
    ok: true,
    errors: [],
    min,
    max,
    perSqft: { min: Math.round(min / area), max: Math.round(max / area) },
    breakdown: breakdown.map((line) => ({ ...line, min: Math.round(line.min), max: Math.round(line.max) })),
    flags: {
      customQuote: area > CUSTOM_QUOTE_ABOVE_SQFT || preset?.id === 'commercial',
      areaClamped: area !== rawArea,
      skippedAddOns
    },
    input: {
      areaSqft: area,
      presetId: preset?.id ?? null,
      surface: input.surface,
      tierId: tier.id,
      addOns: appliedAddOns
    }
  };
}

// Which service(s) an estimate implies, so "Book estimate" can prefill the booking flow
// (docs/07 §7.4). Waterproofing anywhere maps to the waterproofing service.
export function servicesForEstimate(input) {
  const ids = new Set();
  if (input.surface === 'terrace' || input.tierId === 'waterproofing') ids.add('terrace-waterproofing');
  else if (input.surface === 'exterior') ids.add('exterior-painting');
  else ids.add('interior-painting');
  if (input.addOns?.includes('putty-2coat')) ids.add('wall-putty');
  if (input.addOns?.includes('crack-filling')) ids.add('crack-repair');
  return [...ids];
}
