import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateBounds, normalizePhone, validateAll, validateConditions, validateDate, validateLocation, validateName,
  validateNotes, validatePhone, validateSqft, validateStep
} from '../../src/js/services/validators.js';
import { NOW, ctx, options, validValues } from './fixtures.js';

test('phone: accepted formats all normalise to 10 digits', () => {
  for (const raw of ['+91 90116 08592', '09011608592', '9011608592', '919011608592', '+91-9011608592', '0091 9011608592']) {
    assert.equal(normalizePhone(raw), '9011608592', raw);
    assert.equal(validatePhone(raw), null, raw);
  }
});

test('phone: invalid numbers are rejected', () => {
  for (const raw of ['5011608592', '901160859', '90116085922', '', null, 'abcdefghij', '+1 202 555 0143']) {
    assert.equal(validatePhone(raw), 'phone', String(raw));
  }
});

test('name: letters, Devanagari, spaces and .\'- only; 2-60 chars', () => {
  for (const ok of ['Rahul K.', 'राजेश कदम', "Anne-Marie O'Brien", 'नितीन  जाधव']) assert.equal(validateName(ok), null, ok);
  for (const bad of ['', 'A', 'R2D2', '<script>', '  ', '9011608592', 'x'.repeat(61)]) assert.equal(validateName(bad), 'name', bad);
});

test('location: 2-100 chars after trimming', () => {
  assert.equal(validateLocation('Shegaon'), null);
  assert.equal(validateLocation(' a '), 'location');
  assert.equal(validateLocation('x'.repeat(101)), 'location');
});

test('scope: custom/commercial need 50-100000 sq.ft, presets do not', () => {
  assert.equal(validateSqft({ id: '2bhk' }, options), null);
  assert.equal(validateSqft({ id: 'custom', customSqft: 49 }, options), 'sqft');
  assert.equal(validateSqft({ id: 'custom', customSqft: 50 }, options), null);
  assert.equal(validateSqft({ id: 'commercial', customSqft: 100001 }, options), 'sqft');
  assert.equal(validateSqft({ id: 'commercial', customSqft: '' }, options), 'sqft');
});

test('conditions: at least one, known ids, raw-plaster vs ready-repaint is exclusive', () => {
  assert.equal(validateConditions([], options), 'condition');
  assert.equal(validateConditions(['mystery'], options), 'condition');
  assert.equal(validateConditions(['raw-plaster', 'ready-repaint'], options), 'conditionConflict');
  assert.equal(validateConditions(['raw-plaster', 'dampness-leakage'], options), null);
});

test('date: window is tomorrow .. +90 days from a fixed "today"', () => {
  assert.deepEqual(dateBounds(options, NOW), { min: '2026-09-25', max: '2026-12-23' });
  assert.equal(validateDate('2026-09-24', options, NOW), 'date'); // today: below leadDaysMin
  assert.equal(validateDate('2026-09-25', options, NOW), null);
  assert.equal(validateDate('2026-12-23', options, NOW), null);
  assert.equal(validateDate('2026-12-24', options, NOW), 'date');
  assert.equal(validateDate('2026-02-31', options, NOW), 'date'); // impossible date
  assert.equal(validateDate('', options, NOW), 'date');
  assert.equal(validateDate('03/10/2026', options, NOW), 'date');
});

test('date: blocked weekdays are refused', () => {
  const noSundays = { ...options, blockedWeekdays: [0] };
  assert.equal(validateDate('2026-10-04', noSundays, NOW), 'date'); // a Sunday
  assert.equal(validateDate('2026-10-03', noSundays, NOW), null);
});

test('notes are capped at 300 chars', () => {
  assert.equal(validateNotes('x'.repeat(300)), null);
  assert.equal(validateNotes('x'.repeat(301)), 'notes');
});

test('step validators map to the fields the wizard renders', () => {
  const v = validValues();
  for (let s = 1; s <= 7; s += 1) assert.equal(validateStep(s, v, ctx).valid, true, `step ${s}`);

  assert.deepEqual(validateStep(1, validValues({ client: { name: '', phone: '123', location: '' } }), ctx).errors, { name: 'name', phone: 'phone', location: 'location' });
  assert.deepEqual(validateStep(2, validValues({ services: [] }), ctx).errors, { services: 'service' });
  assert.deepEqual(validateStep(3, validValues({ partnerId: 'p9' }), ctx).errors, { partnerId: 'partner' });
  assert.equal(validateStep(3, validValues({ partnerId: 'best' }), ctx).valid, true);
  assert.deepEqual(validateStep(4, validValues({ scope: { id: 'custom', customSqft: 10 } }), ctx).errors, { customSqft: 'sqft' });
  assert.deepEqual(validateStep(7, validValues({ consent: false }), ctx).errors, { consent: 'consent' });
  assert.throws(() => validateStep(8, v, ctx), RangeError);
});

test('validateAll reports the first broken step', () => {
  const r = validateAll(validValues({ conditions: [], consent: false }), ctx);
  assert.equal(r.valid, false);
  assert.equal(r.firstInvalidStep, 5);
  assert.deepEqual(r.failures.map((f) => f.step), [5, 7]);
});
