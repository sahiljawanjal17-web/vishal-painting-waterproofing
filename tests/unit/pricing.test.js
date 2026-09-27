import test from 'node:test';
import assert from 'node:assert/strict';
import { AREA_LIMITS, estimate, resolveTier, servicesForEstimate, validTiersFor } from '../../src/js/services/pricing.js';
import { pricing } from './fixtures.js';

const est = (input) => estimate(pricing, { surface: 'interior', tierId: 'distemper', areaSqft: 1000, ...input });

test('base rate: 1000 sq.ft interior distemper', () => {
  const r = est({});
  assert.equal(r.ok, true);
  assert.deepEqual([r.min, r.max], [8000, 12000]);
  assert.deepEqual(r.perSqft, { min: 8, max: 12 });
});

test('exterior multiplier and 500 rounding', () => {
  const r = est({ surface: 'exterior', tierId: 'premium-emulsion', areaSqft: 2000 });
  assert.deepEqual([r.min, r.max], [38500, 53000]); // 38400 / 52800 rounded to nearest 500
});

test('minimum job charge lifts small jobs; max keeps a 1000 spread', () => {
  const r = est({ areaSqft: 100 });
  assert.equal(r.min, 5000);
  assert.equal(r.max, 6000);
});

test('area is clamped to 100–10000 and flagged', () => {
  assert.equal(est({ areaSqft: 50 }).flags.areaClamped, true);
  assert.equal(est({ areaSqft: 50 }).input.areaSqft, AREA_LIMITS.min);
  const big = est({ areaSqft: 20000 });
  assert.equal(big.input.areaSqft, AREA_LIMITS.max);
  assert.equal(big.flags.customQuote, true);
  assert.equal(est({ areaSqft: 5000 }).flags.customQuote, false);
  assert.equal(est({ areaSqft: 5001 }).flags.customQuote, true);
});

test('add-ons: per-sq.ft and flat both count', () => {
  const r = est({ addOns: ['putty-2coat', 'crack-filling'] });
  assert.deepEqual([r.min, r.max], [17500, 29000]); // 8000+8000+1500 / 12000+12000+5000
  assert.equal(r.breakdown.length, 3);
});

test('add-ons not valid for the surface (or unknown/duplicate) are skipped, not priced', () => {
  const r = est({ surface: 'terrace', tierId: 'waterproofing', addOns: ['furniture-protection', 'nope', 'crack-filling', 'crack-filling'] });
  assert.deepEqual(r.flags.skippedAddOns.sort(), ['furniture-protection', 'nope']);
  assert.deepEqual(r.input.addOns, ['crack-filling']);
  assert.equal(r.breakdown.filter((l) => l.id === 'crack-filling').length, 1);
});

test('every tier x surface pair matches docs/07 §7.3', () => {
  const expected = {
    distemper: ['interior'],
    'premium-emulsion': ['interior', 'exterior'],
    'luxury-royal': ['interior', 'exterior'],
    waterproofing: ['interior', 'exterior', 'terrace']
  };
  for (const tier of pricing.tiers) {
    for (const surface of Object.keys(pricing.surfaceMultipliers)) {
      const r = estimate(pricing, { areaSqft: 1000, surface, tierId: tier.id });
      const shouldBeValid = expected[tier.id].includes(surface);
      assert.equal(r.ok, shouldBeValid, `${tier.id} on ${surface}`);
      if (!shouldBeValid) assert.deepEqual(r.errors, ['tierSurface']);
    }
  }
});

test('resolveTier switches to the first valid tier for the new surface', () => {
  assert.deepEqual(resolveTier(pricing, 'terrace', 'distemper'), { tierId: 'waterproofing', switched: true });
  assert.deepEqual(resolveTier(pricing, 'interior', 'luxury-royal'), { tierId: 'luxury-royal', switched: false });
  assert.deepEqual(validTiersFor(pricing, 'terrace').map((t) => t.id), ['waterproofing']);
});

test('preset wins over typed area; commercial forces a custom quote', () => {
  const r = est({ presetId: '2bhk', areaSqft: 1 });
  assert.equal(r.input.areaSqft, 2600);
  assert.equal(est({ presetId: 'commercial' }).flags.customQuote, true);
  assert.deepEqual(est({ presetId: 'castle' }).errors, ['preset']);
});

test('bad input yields ok:false with codes instead of throwing or NaN', () => {
  assert.deepEqual(est({ areaSqft: '' }).errors, ['area']);
  assert.deepEqual(est({ areaSqft: -5 }).errors, ['area']);
  assert.deepEqual(est({ surface: 'roof' }).errors, ['surface']);
  assert.deepEqual(est({ tierId: 'gold' }).errors, ['tier']);
  assert.equal(est({ areaSqft: 'abc' }).ok, false);
});

test('servicesForEstimate maps surface/tier/add-ons to service ids', () => {
  assert.deepEqual(servicesForEstimate({ surface: 'interior', tierId: 'premium-emulsion', addOns: [] }), ['interior-painting']);
  assert.deepEqual(servicesForEstimate({ surface: 'exterior', tierId: 'luxury-royal', addOns: [] }), ['exterior-painting']);
  assert.deepEqual(servicesForEstimate({ surface: 'terrace', tierId: 'waterproofing', addOns: ['crack-filling'] }), ['terrace-waterproofing', 'crack-repair']);
  assert.deepEqual(servicesForEstimate({ surface: 'interior', tierId: 'distemper', addOns: ['putty-2coat'] }), ['interior-painting', 'wall-putty']);
});
