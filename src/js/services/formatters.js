// Pure display formatting: ₹ amounts, dates, phone numbers. No DOM.

const LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
const localeFor = (lang) => LOCALES[lang] || LOCALES.en;

// LocalizedText ({ en, hi, mr }) → string for `lang`; Marathi falls back to Hindi, then English, then any value.
export function localize(text, lang = 'en') {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[lang] || (lang === 'mr' && text.hi) || text.en || Object.values(text)[0] || '';
}

// Indian digit grouping: 1250000 → "₹12,50,000".
export function formatINR(amount, lang = 'en') {
  return `₹${Math.round(amount).toLocaleString(localeFor(lang))}`;
}

export function formatINRRange(min, max, lang = 'en') {
  return `${formatINR(min, lang)} – ${formatINR(max, lang)}`;
}

// "YYYY-MM-DD" → "Sat, 3 Oct 2026". Parsed as a local date (not UTC) so the weekday
// never shifts by one for users west of Greenwich or during DST edges.
export function formatDate(iso, lang = 'en') {
  const date = parseISODate(iso);
  if (!date) return '';
  // Composed from parts so the punctuation is "Sat, 3 Oct 2026" in every ICU version
  // (en-IN otherwise inserts a comma after the month).
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      .formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
}

export function parseISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = new Date(y, mo, d);
  // Reject rollovers such as 2026-02-31 → 3 Mar.
  return date.getFullYear() === y && date.getMonth() === mo && date.getDate() === d ? date : null;
}

export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "9011608592" → "+91 90116 08592"
export function formatPhone(tenDigits) {
  const d = String(tenDigits || '').replace(/\D/g, '');
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : String(tenDigits || '');
}
