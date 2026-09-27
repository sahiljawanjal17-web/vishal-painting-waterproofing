// Loads the real seed data so tests exercise the same JSON the site ships.
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../../src/data/${name}.json`, import.meta.url), 'utf8'));

export const pricing = load('pricing');
export const options = load('booking-options');
export const services = load('services').items;
export const site = load('site');
export const allPartners = load('partners').items;
export const partners = allPartners.filter((p) => p.active);

// Fixed "today" (Thu 24 Sep 2026, local) so date rules are deterministic.
export const NOW = new Date(2026, 8, 24, 10, 0, 0);

export const ctx = { options, services, partners, pricing, site, now: NOW };

// A fully valid wizard state for a 2BHK terrace-leak job.
export function validValues(overrides = {}) {
  return {
    client: { name: 'Rahul Kulkarni', phone: '+91 98220 12345', location: 'Shegaon, near bus stand' },
    services: ['terrace-waterproofing'],
    partnerId: 'p2',
    scope: { id: '2bhk', customSqft: null },
    conditions: ['dampness-leakage'],
    schedule: { date: '2026-10-03', slotId: 'morning' },
    mediaIntent: 'will-send',
    notes: '',
    consent: true,
    estimate: null,
    ...overrides
  };
}
