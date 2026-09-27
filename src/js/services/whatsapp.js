// WhatsApp booking engine (docs/06 §6.3–6.4): payload → message text → wa.me URL.
// Pure except openWhatsApp, which takes its browser globals as arguments so it is testable.

import { config as defaultConfig } from '../config.js';
import { cleanText, normalizePhone, PARTNER_BEST } from './validators.js';
import { formatDate, formatINRRange, formatPhone, localize } from './formatters.js';

const COPY = {
  en: {
    opening: "Hello Vishal Painting & Waterproofing! {wave}\nI'd like to book a FREE site inspection.",
    name: 'Name', phone: 'Phone', location: 'Location', services: 'Services', specialist: 'Preferred Specialist',
    property: 'Property', condition: 'Wall Condition', date: 'Preferred Date', slot: 'Time Slot',
    estimate: 'Online Estimate', notes: 'Notes', bestAvailable: 'Best available',
    media: 'I will share photos/videos of the walls in this chat.',
    mediaLater: 'I will share photos/videos later.',
    footer: 'Sent from vishalpainting website',
    estimateOpening: 'Hello! I used the cost estimator on your website. {wave}',
    estimateAsk: 'Please arrange a FREE site inspection and a final quote.',
    sqft: 'sq.ft'
  },
  hi: {
    opening: 'नमस्कार विशाल पेंटिंग एंड वॉटरप्रूफिंग! {wave}\nमुझे मुफ़्त साइट निरीक्षण बुक करना है।',
    name: 'नाम', phone: 'फ़ोन', location: 'स्थान', services: 'सेवाएँ', specialist: 'पसंदीदा विशेषज्ञ',
    property: 'प्रॉपर्टी', condition: 'दीवार की स्थिति', date: 'पसंदीदा तारीख', slot: 'समय',
    estimate: 'अनुमान', notes: 'नोट्स', bestAvailable: 'जो उपलब्ध हो',
    media: 'मैं इस चैट में दीवारों की फ़ोटो/वीडियो भेजूँगा/भेजूँगी।',
    mediaLater: 'मैं फ़ोटो/वीडियो बाद में भेजूँगा/भेजूँगी।',
    footer: 'विशाल पेंटिंग वेबसाइट से भेजा गया',
    estimateOpening: 'नमस्कार! मैंने आपकी वेबसाइट पर कॉस्ट एस्टिमेटर इस्तेमाल किया। {wave}',
    estimateAsk: 'कृपया मुफ़्त साइट निरीक्षण और अंतिम कोटेशन की व्यवस्था करें।',
    sqft: 'वर्ग फ़ुट'
  },
  mr: {
    opening: 'नमस्कार विशाल पेंटिंग अँड वॉटरप्रूफिंग! {wave}\nमला मोफत साइट पाहणी बुक करायची आहे.',
    name: 'नाव', phone: 'फोन', location: 'ठिकाण', services: 'सेवा', specialist: 'पसंतीचा तज्ज्ञ',
    property: 'मालमत्ता', condition: 'भिंतीची स्थिती', date: 'पसंतीची तारीख', slot: 'वेळ',
    estimate: 'अंदाज', notes: 'नोंदी', bestAvailable: 'जो उपलब्ध असेल',
    media: 'मी या चॅटमध्ये भिंतींचे फोटो/व्हिडिओ पाठवेन.',
    mediaLater: 'मी फोटो/व्हिडिओ नंतर पाठवेन.',
    footer: 'विशाल पेंटिंग वेबसाइटवरून पाठवले',
    estimateOpening: 'नमस्कार! मी तुमच्या वेबसाइटवरील कॉस्ट एस्टिमेटर वापरला. {wave}',
    estimateAsk: 'कृपया मोफत साइट पाहणी आणि अंतिम कोटेशनची व्यवस्था करा.',
    sqft: 'चौ. फूट'
  }
};

const ICONS = { name: '👤', phone: '📞', location: '📍', services: '🛠', specialist: '👷', property: '🏠', condition: '🧱', date: '📅', slot: '⏰', estimate: '💰', notes: '📝', media: '📸' };

// Reference ID that lets the team find a lead in WhatsApp: VP-YYMMDD-XXX (e.g. VP-261003-K7Q).
export function generateRef(now = new Date(), random = Math.random) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const suffix = Array.from({ length: 3 }, () => Math.floor(random() * 36).toString(36)).join('').toUpperCase();
  return `VP-${stamp}-${suffix}`;
}

// User text is untrusted in a chat app: strip WhatsApp's formatting markers (*bold*, _italic_,
// ~strike~, `mono`) and control characters so a name can't restyle or break the message.
export function sanitizeUserText(raw) {
  return cleanText(String(raw ?? '').replace(/[*_~`]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' '));
}

// " {wave}" is dropped together with its leading space when emoji are off.
const withWave = (text, useEmoji) => text.replace(' {wave}', useEmoji ? ' 👋' : '');

const label = (copy, key, useEmoji) => (useEmoji ? `${ICONS[key]} ${copy[key]}` : copy[key]);

function serviceTitles(ids, services, lang) {
  return ids.map((id) => localize(services.find((s) => s.id === id)?.title, lang) || id).join(', ');
}

function partnerName({ partnerId }, { partners }, copy, lang) {
  if (!partnerId || partnerId === PARTNER_BEST) return copy.bestAvailable;
  return localize(partners.find((p) => p.id === partnerId)?.name, lang) || copy.bestAvailable;
}

function propertyLine(scope, options, copy, lang) {
  const found = options.propertyScopes.find((s) => s.id === scope.id);
  const name = localize(found?.label, lang) || scope.id;
  return scope.customSqft && found?.defaultSqft == null ? `${name} (~${Number(scope.customSqft)} ${copy.sqft})` : name;
}

function estimateLine(estimate, pricing, copy, lang) {
  if (!estimate || !Number.isFinite(estimate.min) || !Number.isFinite(estimate.max)) return null;
  const tier = localize(pricing?.tiers?.find((t) => t.id === estimate.tier)?.label, lang) || estimate.tier;
  return `${formatINRRange(estimate.min, estimate.max, lang)} (${tier}, ${estimate.areaSqft} ${copy.sqft})`;
}

/**
 * @param payload  booking payload (docs/03 §3.10)
 * @param ctx      { options, services, partners, pricing?, ref, useEmoji? }
 * @param notesLimit  characters of notes to keep (used by the URL-length guard)
 */
export function buildMessage(payload, ctx, lang = 'en', { notesLimit = Infinity, compact = false } = {}) {
  const copy = COPY[lang] || COPY.en;
  const useEmoji = !compact && (ctx.useEmoji ?? defaultConfig.whatsapp.useEmoji);
  const row = (key, value) => (value ? `${label(copy, key, useEmoji)}: ${value}` : null);

  const notes = sanitizeUserText(payload.notes).slice(0, Math.max(0, notesLimit));
  const lines = [
    compact ? copy.opening.split('\n').at(-1) : withWave(copy.opening, useEmoji),
    '',
    row('name', sanitizeUserText(payload.client.name)),
    row('phone', formatPhone(normalizePhone(payload.client.phone))),
    row('location', sanitizeUserText(payload.client.location)),
    '',
    row('services', serviceTitles(payload.services, ctx.services, lang)),
    row('specialist', partnerName(payload, ctx, copy, lang)),
    row('property', propertyLine(payload.scope, ctx.options, copy, lang)),
    row('condition', payload.conditions.map((id) => localize(ctx.options.wallConditions.find((c) => c.id === id)?.label, lang) || id).join(', ')),
    row('date', formatDate(payload.schedule.date, lang)),
    row('slot', localize(ctx.options.timeSlots.find((s) => s.id === payload.schedule.slotId)?.label, lang)),
    row('estimate', estimateLine(payload.estimate, ctx.pricing, copy, lang)),
    row('notes', notes)
  ];
  if (!compact) {
    lines.push('', `${useEmoji ? `${ICONS.media} ` : ''}${payload.mediaIntent === 'later' ? copy.mediaLater : copy.media}`);
  }
  lines.push('', compact ? `— ${ctx.ref}` : `— ${copy.footer} (${ctx.ref})`);

  return tidy(lines);
}

// Removes omitted (null) rows, then collapses the blank separators they leave behind.
function tidy(lines) {
  const kept = lines.filter((line) => line !== null);
  const out = kept.filter((line, i) => !(line === '' && (i === 0 || kept[i - 1] === '')));
  while (out.at(-1) === '') out.pop();
  return out.join('\n');
}

export function buildUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds the wa.me URL for a booking, keeping it under `maxUrlLength` (docs/06 §6.4 step 3).
 * Client details are never dropped. Stages, in order:
 *   full → notes shortened → compact template → compact template in English.
 * The last stage exists because percent-encoding makes Devanagari ~9 chars per letter, so a
 * Hindi message overflows 2000 even without notes. If even that is too long (the customer
 * typed a very long Devanagari name/address) the URL is returned anyway with `overLimit: true`
 * so the UI can offer "Copy message" instead of trusting the link.
 * @returns { url, message, variant, truncated, overLimit }
 */
export function buildBookingUrl(number, payload, ctx, lang = 'en', maxLength = defaultConfig.whatsapp.maxUrlLength) {
  const attempt = (opts, forLang = lang) => {
    const message = buildMessage(payload, ctx, forLang, opts);
    return { message, url: buildUrl(number, message) };
  };
  const done = (variant, { message, url }) => ({ url, message, variant, truncated: variant !== 'full', overLimit: url.length > maxLength });

  const full = attempt({});
  if (full.url.length <= maxLength) return done('full', full);

  // Notes are the only free-form field: binary-search the longest prefix that still fits.
  let lo = 0;
  let hi = sanitizeUserText(payload.notes).length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (attempt({ notesLimit: mid }).url.length <= maxLength) lo = mid;
    else hi = mid - 1;
  }
  const trimmed = attempt({ notesLimit: lo });
  if (trimmed.url.length <= maxLength) return done('notes-shortened', trimmed);

  const compact = attempt({ notesLimit: 0, compact: true });
  if (compact.url.length <= maxLength) return done('compact', compact);

  return done('compact-en', attempt({ notesLimit: 0, compact: true }, 'en'));
}

// Short message for the estimator's "Book estimate via WhatsApp" quick path (docs/06 §6.5).
// `client` (name/phone) is optional: the estimator has no contact fields.
export function buildEstimateMessage({ estimate, input, client }, ctx, lang = 'en') {
  const copy = COPY[lang] || COPY.en;
  const useEmoji = ctx.useEmoji ?? defaultConfig.whatsapp.useEmoji;
  const surfaceTier = `${ctx.surfaceLabel ?? input.surface}, ${localize(ctx.pricing?.tiers?.find((t) => t.id === input.tierId)?.label, lang) || input.tierId}`;
  const lines = [
    withWave(copy.estimateOpening, useEmoji),
    `${useEmoji ? `${ICONS.estimate} ` : ''}${copy.estimate}: ${formatINRRange(estimate.min, estimate.max, lang)} (${surfaceTier}, ${input.areaSqft} ${copy.sqft})`,
    client?.name ? `${useEmoji ? `${ICONS.name} ` : ''}${copy.name}: ${sanitizeUserText(client.name)}` : null,
    client?.phone ? `${useEmoji ? `${ICONS.phone} ` : ''}${copy.phone}: ${formatPhone(normalizePhone(client.phone))}` : null,
    '',
    copy.estimateAsk,
    '',
    `— ${copy.footer} (${ctx.ref})`
  ];
  return tidy(lines);
}

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

/**
 * Mobile → same-tab navigation (opens the WhatsApp app); desktop → new tab, falling back to
 * same-tab when the popup is blocked. Returns which path was taken.
 */
export function openWhatsApp(url, { win = globalThis.window, userAgent = globalThis.navigator?.userAgent ?? '' } = {}) {
  if (MOBILE_UA.test(userAgent)) {
    win.location.href = url;
    return 'redirect';
  }
  const opened = win.open(url, '_blank', 'noopener');
  if (opened) return 'popup';
  win.location.href = url;
  return 'redirect-fallback';
}
