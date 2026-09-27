import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addServices, buildPayload, createBooking, discardDraft, goBack, goNext, goTo, parseDeepLink, persistDraft,
  prefillFrom, restoreDraft, submitBooking, suggestedServices, updateValues
} from '../../src/js/services/booking.js';
import { partnersForServices, recommendPartnerId, routeLead } from '../../src/js/services/routing.js';
import { allPartners, ctx, partners, services, site, validValues } from './fixtures.js';

const decode = (url) => decodeURIComponent(new URL(url).searchParams.get('text'));
const asReal = (list) => list.map((p) => ({ ...p, contact: { ...p.contact, dummy: false } }));

// ---- routing: the four partners ----

test('each service resolves to its lead partner (p1..p4 all reachable)', () => {
  const leads = Object.fromEntries(services.map((s) => [s.id, recommendPartnerId([s.id], services)]));
  assert.deepEqual(leads, {
    'interior-painting': 'p1', 'exterior-painting': 'p4', 'wall-putty': 'p3', 'terrace-waterproofing': 'p2', 'crack-repair': 'p2'
  });
  assert.deepEqual(new Set(Object.values(leads)), new Set(['p1', 'p2', 'p3', 'p4']));
  assert.equal(recommendPartnerId(['crack-repair', 'wall-putty'], services), 'p2'); // first selected wins
  assert.equal(recommendPartnerId([], services), null);
});

test('every service lead/support id exists in the active partner list', () => {
  const ids = partners.map((p) => p.id);
  for (const s of services) for (const id of [s.leadPartnerId, ...s.supportPartnerIds]) assert.ok(ids.includes(id), `${s.id} -> ${id}`);
});

test('partnersForServices ranks leads then supporters without duplicates', () => {
  assert.deepEqual(partnersForServices(['terrace-waterproofing', 'crack-repair'], services), ['p2', 'p4', 'p3']);
});

test('real partner numbers: a chosen partner receives the lead on their own WhatsApp', () => {
  for (const p of partners) {
    const route = routeLead({ partnerId: p.id }, { partners: asReal(partners), site, holdDummyPartners: true });
    assert.equal(route.target, 'partner');
    assert.equal(route.wa, p.contact.whatsapp);
    assert.equal(route.preferredPartnerId, p.id);
  }
});

test('four partners have four distinct numbers, none equal to the hotline', () => {
  const numbers = partners.map((p) => p.contact.whatsapp);
  assert.equal(new Set(numbers).size, 4);
  assert.ok(!numbers.includes(site.contact.whatsapp));
});

test('dummy partner numbers are held back: lead goes to the hotline but names the partner', () => {
  const route = routeLead({ partnerId: 'p3' }, { partners, site, holdDummyPartners: true });
  assert.equal(route.target, 'hotline');
  assert.equal(route.reason, 'dummy-partner-number');
  assert.equal(route.wa, '919011608592');
  assert.equal(route.preferredPartnerId, 'p3');
  // ...unless explicitly allowed
  assert.equal(routeLead({ partnerId: 'p3' }, { partners, site, holdDummyPartners: false }).wa, '919000000003');
});

test('"best" / missing / unknown partner and invalid partner numbers go to the hotline', () => {
  assert.equal(routeLead({ partnerId: 'best' }, { partners, site }).reason, 'best-available');
  assert.equal(routeLead({ partnerId: null }, { partners, site }).target, 'hotline');
  assert.equal(routeLead({ partnerId: 'p9' }, { partners, site }).target, 'hotline');
  const broken = asReal(partners).map((p) => (p.id === 'p1' ? { ...p, contact: { whatsapp: '123', phone: '456' } } : p));
  const route = routeLead({ partnerId: 'p1' }, { partners: broken, site, holdDummyPartners: false });
  assert.equal(route.target, 'hotline');
  assert.equal(route.reason, 'partner-number-invalid');
});

test('seed data: only p1 is lead; four active partners', () => {
  assert.equal(allPartners.length, 4);
  assert.deepEqual(partners.map((p) => p.id), ['p1', 'p2', 'p3', 'p4']);
  assert.deepEqual(partners.filter((p) => p.isLead).map((p) => p.id), ['p1']);
});

// ---- the booking state machine ----

test('goNext blocks on invalid steps and records errors; goBack always works', () => {
  let s = createBooking({}, ctx.now);
  s = goNext(s, ctx);
  assert.equal(s.currentStep, 1);
  assert.deepEqual(Object.keys(s.errors).sort(), ['location', 'name', 'phone']);
  s = updateValues(s, { client: { name: 'Asha Patil', phone: '9822012345', location: 'Shegaon' } });
  assert.deepEqual(s.errors, {});
  s = goNext(s, ctx);
  assert.equal(s.currentStep, 2);
  assert.equal(goBack(s).currentStep, 1);
  assert.equal(goBack(goBack(s)).currentStep, 1);
});

test('updateValues merges nested objects without wiping siblings', () => {
  let s = createBooking({ client: { name: 'Asha Patil' } }, ctx.now);
  s = updateValues(s, { client: { phone: '9822012345' } });
  assert.deepEqual(s.values.client, { name: 'Asha Patil', phone: '9822012345', location: '' });
});

test('step 3 pre-selects the lead partner of the first service; existing choice is kept', () => {
  const at2 = { ...createBooking(validValues({ partnerId: null, services: ['wall-putty'] }), ctx.now), currentStep: 2 };
  assert.equal(goNext(at2, ctx).values.partnerId, 'p3');
  const chosen = { ...createBooking(validValues({ partnerId: 'p4', services: ['wall-putty'] }), ctx.now), currentStep: 2 };
  assert.equal(goNext(chosen, ctx).values.partnerId, 'p4');
});

test('goTo: back is free, forward only across valid steps', () => {
  const s = { ...createBooking(validValues(), ctx.now), currentStep: 3 };
  assert.equal(goTo(s, 1, ctx).currentStep, 1);
  assert.equal(goTo(s, 6, ctx).currentStep, 6);
  const broken = { ...createBooking(validValues({ conditions: [] }), ctx.now), currentStep: 3 };
  assert.equal(goTo(broken, 6, ctx).currentStep, 3);
  assert.equal(goTo(s, 9, ctx).currentStep, 3);
});

test('dampness hint suggests waterproofing, one tap adds it', () => {
  const values = validValues({ services: ['interior-painting'], conditions: ['dampness-leakage'] });
  assert.deepEqual(suggestedServices(values, ctx), ['terrace-waterproofing']);
  const s = addServices(createBooking(values, ctx.now), ['terrace-waterproofing', 'interior-painting']);
  assert.deepEqual(s.values.services, ['interior-painting', 'terrace-waterproofing']);
  assert.deepEqual(suggestedServices(s.values, ctx), []);
  assert.deepEqual(suggestedServices(validValues({ conditions: ['ready-repaint'] }), ctx), []);
});

test('prefill: estimator, partner card and deep link; unknown ids are ignored', () => {
  let s = createBooking({}, ctx.now);
  s = prefillFrom(s, {
    services: ['terrace-waterproofing', 'bogus'], partnerId: 'p2', scope: { id: 'custom', customSqft: 900 },
    estimate: { min: 35000, max: 60000, tier: 'waterproofing', areaSqft: 900, extra: 'dropped' }
  }, ctx);
  assert.deepEqual(s.values.services, ['terrace-waterproofing']);
  assert.equal(s.values.partnerId, 'p2');
  assert.deepEqual(s.values.scope, { id: 'custom', customSqft: 900 });
  assert.deepEqual(s.values.estimate, { min: 35000, max: 60000, tier: 'waterproofing', areaSqft: 900 });
  assert.equal(prefillFrom(createBooking({}, ctx.now), { partnerId: 'p9', scope: { id: 'castle' } }, ctx).values.partnerId, null);

  assert.deepEqual(parseDeepLink('#booking?service=terrace-waterproofing&partner=p2'), { services: ['terrace-waterproofing'], partnerId: 'p2' });
  assert.deepEqual(parseDeepLink('#booking'), { services: [], partnerId: null });
});

test('buildPayload matches docs/03 §3.10 and normalises input', () => {
  const p = buildPayload(createBooking(validValues({ notes: '  hello   there ' }), ctx.now), ctx, { lang: 'hi', source: 'estimator', now: ctx.now });
  assert.deepEqual(p.client, { name: 'Rahul Kulkarni', phone: '9822012345', location: 'Shegaon, near bus stand' });
  assert.deepEqual(p.scope, { id: '2bhk' }); // preset: no custom size
  assert.equal(p.notes, 'hello there');
  assert.deepEqual(p.meta, { lang: 'hi', source: 'estimator', createdAt: ctx.now.toISOString() });
  assert.equal('estimate' in p, false);
  const custom = buildPayload(createBooking(validValues({ scope: { id: 'custom', customSqft: '850' } }), ctx.now), ctx);
  assert.deepEqual(custom.scope, { id: 'custom', customSqft: 850 });
});

// ---- submit: the full 7-step flow -> wa.me URL ----

function walkWizard() {
  let s = createBooking({}, ctx.now);
  s = updateValues(s, { client: { name: 'Rahul Kulkarni', phone: '+91 98220 12345', location: 'Shegaon' } });
  s = goNext(s, ctx);
  s = updateValues(s, { services: ['terrace-waterproofing'] });
  s = goNext(s, ctx);
  assert.equal(s.values.partnerId, 'p2'); // suggested at step 3
  s = goNext(s, ctx);
  s = updateValues(s, { scope: { id: '2bhk' } });
  s = goNext(s, ctx);
  s = updateValues(s, { conditions: ['dampness-leakage'] });
  s = goNext(s, ctx);
  s = updateValues(s, { schedule: { date: '2026-10-03', slotId: 'morning' } });
  s = goNext(s, ctx);
  assert.equal(s.currentStep, 7);
  return updateValues(s, { consent: true, notes: 'Water drips near the stairs' });
}

test('full wizard walk -> wa.me URL (dummy partner numbers: routed to the hotline)', () => {
  const r = submitBooking(walkWizard(), ctx, { lang: 'en', random: () => 0.5 });
  assert.equal(r.ok, true);
  const u = new URL(r.url);
  assert.equal(u.host, 'wa.me');
  assert.equal(u.pathname, '/919011608592');
  assert.equal(r.route.target, 'hotline');
  assert.equal(r.route.preferredPartnerId, 'p2');
  assert.match(r.ref, /^VP-260924-[0-9A-Z]{3}$/);
  const text = decode(r.url);
  for (const part of ['Rahul Kulkarni', '+91 98220 12345', 'Shegaon', 'Terrace & Wall Waterproofing', 'Preferred Specialist: Sanjay Pawar', '2 BHK', 'Heavy dampness / leakage', 'Sat, 3 Oct 2026', 'Water drips near the stairs', r.ref]) {
    assert.ok(text.includes(part), part);
  }
});

test('with confirmed partner numbers the same booking goes to that partner (p2)', () => {
  const real = { ...ctx, partners: asReal(partners) };
  const r = submitBooking(walkWizard(), real, { lang: 'en' });
  assert.equal(r.route.target, 'partner');
  assert.equal(new URL(r.url).pathname, '/919000000002');
});

test('submit refuses an incomplete booking and points at the first broken step', () => {
  const s = updateValues(walkWizard(), { consent: false, schedule: { date: '2020-01-01' } });
  const r = submitBooking(s, ctx);
  assert.equal(r.ok, false);
  assert.equal(r.firstInvalidStep, 6);
  assert.deepEqual(r.failures.map((f) => f.step), [6, 7]);
  assert.equal(r.url, undefined);
});

test('hostile input is neutralised end to end', () => {
  const s = updateValues(walkWizard(), { notes: '*BOLD* <img src=x onerror=alert(1)> & https://evil.example' });
  const text = decode(submitBooking(s, ctx).url);
  assert.ok(!text.includes('*BOLD*'));
  assert.ok(text.includes('BOLD'));
});

// ---- drafts ----

test('draft persists without consent, restores, expires and can be discarded', () => {
  const s = { ...walkWizard(), currentStep: 5 };
  assert.equal(persistDraft(s), true);
  const back = restoreDraft(ctx.now);
  assert.equal(back.currentStep, 5);
  assert.equal(back.values.client.name, 'Rahul Kulkarni');
  assert.equal(back.values.consent, false); // must be re-confirmed
  discardDraft();
  assert.equal(restoreDraft(ctx.now), null);
});

test('an expired draft is dropped and removed', async () => {
  const { saveDraft, loadDraft, getItem } = await import('../../src/js/services/storage.js');
  const day = 24 * 60 * 60 * 1000;
  const savedAt = Date.now() - 8 * day;
  saveDraft('vp_test_draft', { currentStep: 3, values: {} }, 7, savedAt);
  assert.equal(loadDraft('vp_test_draft', savedAt + 6 * day)?.currentStep, 3);
  assert.equal(loadDraft('vp_test_draft', savedAt + 8 * day), null);
  assert.equal(getItem('vp_test_draft'), null);
});
