import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_LABELS } from '../../src/js/core/labels-page.js';
import { BOOKING_LABELS } from '../../src/js/core/labels-booking.js';
import { pick, t } from '../../src/js/core/labels.js';
import { buildMessage } from '../../src/js/services/whatsapp.js';

test('every page and booking label has English, Hindi and Marathi text', () => {
  for (const [key, entry] of Object.entries({ ...PAGE_LABELS, ...BOOKING_LABELS })) {
    for (const lang of ['en', 'hi', 'mr']) assert.ok(entry[lang]?.trim(), `${key}.${lang} missing`);
  }
});

test('Marathi falls back to Hindi, then English', () => {
  assert.equal(pick({ en: 'a', hi: 'b' }, 'mr'), 'b');
  assert.equal(pick({ en: 'a' }, 'mr'), 'a');
  assert.equal(t('introSkip', 'mr'), 'इंट्रो वगळा');
});

test('booking message can be built in Marathi', () => {
  const payload = {
    client: { name: 'Rahul', phone: '9876543210', location: 'Shegaon' }, services: [], partnerId: 'best',
    scope: { id: '2bhk' }, conditions: [], schedule: { date: '', slotId: null }, mediaIntent: 'later'
  };
  const ctx = { options: { propertyScopes: [{ id: '2bhk', label: { en: '2 BHK' }, defaultSqft: 750 }], wallConditions: [], timeSlots: [] }, services: [], partners: [], ref: 'VP-1' };
  const text = buildMessage(payload, ctx, 'mr');
  assert.match(text, /नाव: Rahul/);
  assert.match(text, /VP-1/);
});
