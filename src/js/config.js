// Public runtime config (docs/08). Frozen; safe to ship — no secrets belong here.
// Values come from Vite's import.meta.env when a build exists, else defaults, so the
// site still runs from any plain static server.

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const config = Object.freeze({
  env: env.MODE === 'production' ? 'production' : 'development',
  site: Object.freeze({ defaultLang: 'en', supportedLangs: Object.freeze(['en', 'hi', 'mr']) }),
  whatsapp: Object.freeze({
    number: '919011608592',
    // Plain-label fallback if a device renders emoji badly.
    useEmoji: true,
    // wa.me links beyond ~2000 chars are unreliable across apps/browsers.
    maxUrlLength: 2000
  }),
  phone: Object.freeze({ e164: '+919011608592', display: '+91 90116 08592' }),
  booking: Object.freeze({
    draftStorageKey: 'vp_booking_draft',
    draftTTLDays: 7,
    // Partner numbers flagged `contact.dummy` never receive leads (they may belong to
    // strangers); flip to false only when every partner number is confirmed real.
    holdLeadsForDummyPartners: true
  })
});
