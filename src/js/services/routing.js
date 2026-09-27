// Pure partner routing: which of the four specialists (p1–p4) — or the business
// hotline — a booking / estimate should go to. No DOM, no I/O.

import { resolveContact } from './contact.js';
import { PARTNER_BEST } from './validators.js';

// Docs/06 §6.2 step 3: default = lead partner of the first selected service.
export function recommendPartnerId(serviceIds, services) {
  for (const id of serviceIds ?? []) {
    const service = services.find((s) => s.id === id);
    if (service?.leadPartnerId) return service.leadPartnerId;
  }
  return null;
}

// Partners who can take this job: leads first, then supporters, de-duplicated. Lets the
// wizard order its radio-cards and label the "Recommended" chip.
export function partnersForServices(serviceIds, services) {
  const ranked = [];
  for (const id of serviceIds ?? []) {
    const service = services.find((s) => s.id === id);
    if (!service) continue;
    for (const pid of [service.leadPartnerId, ...(service.supportPartnerIds ?? [])]) {
      if (pid && !ranked.includes(pid)) ranked.push(pid);
    }
  }
  return ranked;
}

/**
 * Decides where a lead's WhatsApp message is delivered.
 *  - "best" / no partner  → business hotline (the owner assigns the specialist).
 *  - a chosen partner     → that partner's own number…
 *  - …unless the number is a flagged dummy (`contact.dummy`) and the config holds dummy
 *    numbers back: those wa.me links would open chats with strangers, so the message
 *    (which carries name/phone/address) goes to the hotline naming the preferred partner.
 * The customer's chosen partner is preserved in `preferredPartnerId` either way so the
 * message text can still name them.
 */
export function routeLead({ partnerId }, { partners, site, holdDummyPartners = true }) {
  const partner = partnerId && partnerId !== PARTNER_BEST ? partners.find((p) => p.id === partnerId) : null;
  const hotline = resolveContact(null, site);

  if (!partner) {
    return { target: 'hotline', reason: partnerId === PARTNER_BEST ? 'best-available' : 'no-partner', preferredPartnerId: null, ...hotline };
  }
  if (partner.contact?.dummy && holdDummyPartners) {
    return { target: 'hotline', reason: 'dummy-partner-number', preferredPartnerId: partner.id, ...hotline };
  }
  const contact = resolveContact(partner, site);
  return {
    target: contact.isFallback ? 'hotline' : 'partner',
    reason: contact.isFallback ? 'partner-number-invalid' : 'partner-selected',
    preferredPartnerId: partner.id,
    ...contact
  };
}
