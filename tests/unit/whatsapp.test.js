import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBookingUrl, buildEstimateMessage, buildMessage, buildUrl, generateRef, openWhatsApp, sanitizeUserText } from '../../src/js/services/whatsapp.js';
import { normalizePhone } from '../../src/js/services/validators.js';
import { NOW, ctx, validValues } from './fixtures.js';

const payload = (over = {}) => {
  const v = validValues(over);
  return {
    client: { ...v.client, phone: normalizePhone(v.client.phone) },
    services: v.services,
    partnerId: v.partnerId,
    scope: { id: v.scope.id, ...(v.scope.customSqft ? { customSqft: v.scope.customSqft } : {}) },
    conditions: v.conditions,
    schedule: v.schedule,
    mediaIntent: v.mediaIntent,
    ...(v.notes ? { notes: v.notes } : {}),
    ...(v.estimate ? { estimate: v.estimate } : {})
  };
};
const mctx = { ...ctx, ref: 'VP-261003-K7Q' };
const decode = (url) => decodeURIComponent(new URL(url).searchParams.get('text'));

test('reference id: VP-YYMMDD-XXX', () => {
  assert.match(generateRef(NOW), /^VP-260924-[0-9A-Z]{3}$/);
  assert.equal(generateRef(NOW, () => 0), 'VP-260924-000');
  assert.equal(generateRef(NOW, () => 0.999), 'VP-260924-ZZZ');
});

test('sanitizeUserText strips WhatsApp formatting markers and control chars', () => {
  assert.equal(sanitizeUserText('  *Rahul*  _K_ ~x~ `y`\n\tz '), 'Rahul K x y z');
  assert.equal(sanitizeUserText(null), '');
});

test('English message contains every answer', () => {
  const m = buildMessage(payload({ notes: 'Leak near the stairs' }), mctx, 'en');
  for (const part of [
    'Hello Vishal Painting & Waterproofing! 👋', "I'd like to book a FREE site inspection.",
    'Name: Rahul Kulkarni', 'Phone: +91 98220 12345', 'Location: Shegaon, near bus stand',
    'Services: Terrace & Wall Waterproofing', 'Preferred Specialist: Sanjay Pawar', 'Property: 2 BHK',
    'Wall Condition: Heavy dampness / leakage', 'Preferred Date: Sat, 3 Oct 2026', 'Time Slot: Morning (9 AM – 12 PM)',
    'Notes: Leak near the stairs', 'I will share photos/videos of the walls in this chat.', '(VP-261003-K7Q)'
  ]) assert.ok(m.includes(part), part);
});

test('Hindi message uses Hindi labels, names and slot', () => {
  const m = buildMessage(payload(), mctx, 'hi');
  for (const part of ['नमस्कार विशाल पेंटिंग एंड वॉटरप्रूफिंग!', 'मुफ़्त साइट निरीक्षण बुक करना है', 'नाम: Rahul Kulkarni', 'पसंदीदा विशेषज्ञ: संजय पवार', 'सुबह (9 – 12)', 'टैरेस व दीवार वॉटरप्रूफिंग']) {
    assert.ok(m.includes(part), part);
  }
});

test('optional lines are omitted cleanly (no blank Notes / estimate, no double blank lines)', () => {
  const m = buildMessage(payload(), mctx, 'en');
  assert.ok(!m.includes('Notes:'));
  assert.ok(!m.includes('Online Estimate'));
  assert.ok(!/\n\n\n/.test(m));
  assert.ok(!m.endsWith('\n'));
});

test('estimate line, custom sqft and "best available" specialist', () => {
  const m = buildMessage(
    payload({ partnerId: 'best', scope: { id: 'custom', customSqft: 900 }, estimate: { min: 12500, max: 18000, tier: 'premium-emulsion', areaSqft: 900 } }),
    mctx, 'en'
  );
  assert.ok(m.includes('Preferred Specialist: Best available'));
  assert.ok(m.includes('Property: Custom (sq.ft) (~900 sq.ft)'));
  assert.ok(m.includes('Online Estimate: ₹12,500 – ₹18,000 (Premium Emulsion, 900 sq.ft)'));
});

test('user text cannot inject WhatsApp formatting', () => {
  const m = buildMessage(payload({ client: { name: '*Rahul*', phone: '9822012345', location: '_here_~' } }), mctx, 'en');
  assert.ok(m.includes('Name: Rahul'));
  assert.ok(m.includes('Location: here'));
  assert.ok(!/[*_~]/.test(m));
});

test('useEmoji:false gives plain labels', () => {
  const m = buildMessage(payload(), { ...mctx, useEmoji: false }, 'en');
  assert.ok(!/\p{Extended_Pictographic}/u.test(m));
  assert.ok(m.startsWith('Hello Vishal Painting & Waterproofing!\n'));
});

test('URL round-trips &, #, ?, Devanagari and emoji', () => {
  const notes = 'Flat #4 & 5? ठीक है 👍\nsecond line';
  const { url, message } = buildBookingUrl('919011608592', payload({ notes }), mctx, 'en');
  const u = new URL(url);
  assert.equal(u.host, 'wa.me');
  assert.equal(u.pathname, '/919011608592');
  assert.equal(decode(url), message);
  assert.ok(message.includes('Flat #4 & 5? ठीक है 👍 second line')); // newline collapsed by sanitising
});

test('length guard stage 2: long notes are shortened first, client details survive', () => {
  const long = 'दीवार में सीलन है '.repeat(30).trim().slice(0, 300); // Devanagari is ~9 chars/letter once encoded
  const r = buildBookingUrl('919011608592', payload({ notes: long }), mctx, 'en', 2000);
  assert.equal(r.variant, 'notes-shortened');
  assert.ok(r.url.length <= 2000, `len ${r.url.length}`);
  assert.ok(r.message.includes('Notes: दीवार'));
  assert.ok(r.message.includes('Rahul Kulkarni') && r.message.includes('98220 12345') && r.message.includes('Shegaon'));
});

test('length guard stage 3: compact template drops notes and boilerplate', () => {
  const r = buildBookingUrl('919011608592', payload({ notes: 'x'.repeat(200) }), mctx, 'en', 700);
  assert.equal(r.variant, 'compact');
  assert.ok(r.url.length <= 700, `len ${r.url.length}`);
  assert.ok(r.message.includes('Rahul Kulkarni') && r.message.includes('VP-261003-K7Q'));
  assert.ok(!r.message.includes('xxx') && !r.message.includes('photos/videos'));
});

test('length guard: a Hindi booking fits 2000 chars only in the compact template (Hindi labels kept)', () => {
  const r = buildBookingUrl('919011608592', payload(), mctx, 'hi', 2000);
  assert.equal(r.variant, 'compact');
  assert.ok(r.url.length <= 2000, `len ${r.url.length}`);
  assert.ok(r.message.includes('नाम: Rahul Kulkarni'));
});

test('length guard stage 4: when Hindi compact still overflows, the English compact template is used', () => {
  const r = buildBookingUrl('919011608592', payload(), mctx, 'hi', 1500);
  assert.equal(r.variant, 'compact-en');
  assert.equal(r.overLimit, false);
  assert.ok(r.url.length <= 1500, `len ${r.url.length}`);
  assert.ok(r.message.includes('Name: Rahul Kulkarni'));
});

test('length guard: oversized Devanagari client details are never dropped, but flagged overLimit', () => {
  const name = 'राजेश'.repeat(12); // 60 chars
  const location = 'शेगांव बस स्थानक के पास '.repeat(5).trim().slice(0, 100);
  const r = buildBookingUrl('919011608592', payload({ client: { name, phone: '9822012345', location } }), mctx, 'hi', 1200);
  assert.equal(r.overLimit, true);
  assert.ok(r.message.includes(name) && r.message.includes(location));
});

test('short URLs are untouched', () => {
  const r = buildBookingUrl('919011608592', payload(), mctx, 'en');
  assert.equal(r.truncated, false);
  assert.ok(r.url.length < 2000);
  assert.equal(buildUrl('919000000002', 'a b&c'), 'https://wa.me/919000000002?text=a%20b%26c');
});

test('estimator quick-path message', () => {
  const m = buildEstimateMessage(
    { estimate: { min: 8000, max: 12000 }, input: { areaSqft: 1000, surface: 'interior', tierId: 'distemper' }, client: { name: 'Asha', phone: '9822012345' } },
    { ...mctx, surfaceLabel: 'Interior Walls' }, 'en'
  );
  assert.ok(m.includes('Online Estimate: ₹8,000 – ₹12,000 (Interior Walls, Distemper, 1000 sq.ft)'));
  assert.ok(m.includes('Name: Asha') && m.includes('+91 98220 12345'));
});

test('openWhatsApp: mobile redirects, desktop opens a tab, blocked popup falls back', () => {
  const calls = [];
  const win = (open) => ({
    location: { set href(v) { calls.push(['href', v]); } },
    open: (...a) => { calls.push(['open', ...a]); return open; }
  });
  assert.equal(openWhatsApp('u', { win: win({}), userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }), 'redirect');
  assert.equal(openWhatsApp('u', { win: win({}), userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }), 'popup');
  assert.equal(openWhatsApp('u', { win: win(null), userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }), 'redirect-fallback');
  assert.deepEqual(calls, [['href', 'u'], ['open', 'u', '_blank', 'noopener'], ['open', 'u', '_blank', 'noopener'], ['href', 'u']]);
});
