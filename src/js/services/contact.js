// Pure logic (no DOM): turns a partner record into tel: / wa.me links.
// Frontend only — nothing here talks to a server.

const GREETINGS = {
  en: 'Hi {name}, I found you on the Vishal Painting website and would like a free site inspection.',
  hi: 'नमस्ते {name}, मैंने विशाल पेंटिंग की वेबसाइट पर आपको देखा। मुझे मुफ़्त साइट निरीक्षण चाहिए।',
  mr: 'नमस्कार {name}, मी विशाल पेंटिंगच्या वेबसाइटवर तुम्हाला पाहिले. मला मोफत साइट पाहणी हवी आहे.'
};

// Accepts "+91 90000 00001", "9000000001", "919000000001" → "919000000001".
// Returns null when the value can't be a valid number, so callers can fall back
// instead of shipping a dead link.
export function toWaNumber(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export function telHref(raw) {
  const number = toWaNumber(raw);
  return number ? `tel:+${number}` : null;
}

export function waHref(raw, message = '') {
  const number = toWaNumber(raw);
  if (!number) return null;
  return message ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/${number}`;
}

const GENERIC_GREETINGS = {
  en: 'Hi, I found you on the Vishal Painting website and would like a free site inspection.',
  hi: 'नमस्ते, मैंने विशाल पेंटिंग की वेबसाइट देखी। मुझे मुफ़्त साइट निरीक्षण चाहिए।',
  mr: 'नमस्कार, मी विशाल पेंटिंगची वेबसाइट पाहिली. मला मोफत साइट पाहणी हवी आहे.'
};

// `name` is optional: with no partner selected we greet the business, not a person.
export function greeting(name, lang) {
  if (!name) return GENERIC_GREETINGS[lang] || GENERIC_GREETINGS.en;
  return (GREETINGS[lang] || GREETINGS.en).replace('{name}', name);
}

const OFFER_MESSAGES = {
  en: 'Hi, I saw the offer "{title}" on the Vishal Painting website and would like to know more.',
  hi: 'नमस्ते, मैंने विशाल पेंटिंग की वेबसाइट पर "{title}" ऑफ़र देखा। मुझे इसके बारे में और जानना है।',
  mr: 'नमस्कार, मी विशाल पेंटिंगच्या वेबसाइटवर "{title}" ऑफर पाहिली. मला याबद्दल अधिक जाणून घ्यायचे आहे.'
};

export function offerMessage(title, lang) {
  return (OFFER_MESSAGES[lang] || OFFER_MESSAGES.en).replace('{title}', title);
}

// Picks the partner's own contact details, falling back per-field to the business
// hotline so a partner with a missing/invalid number never gets a broken button.
export function resolveContact(partner, site) {
  const own = partner?.contact ?? {};
  const fallback = site.contact;
  const tel = telHref(own.phone) || telHref(fallback.phone);
  const wa = toWaNumber(own.whatsapp) || toWaNumber(fallback.whatsapp);
  return {
    tel,
    wa,
    display: telHref(own.phone) ? own.display || own.phone : fallback.display,
    isFallback: !telHref(own.phone) || !toWaNumber(own.whatsapp)
  };
}
