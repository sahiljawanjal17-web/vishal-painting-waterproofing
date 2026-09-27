// UI labels for the components in this folder, EN + HI + MR. The full i18n engine
// (docs/05) will replace this; keep keys stable so migration is a lookup swap.

import { PAGE_LABELS } from './labels-page.js';
import { BOOKING_LABELS } from './labels-booking.js';
import { MR_UI } from './labels-mr.js';

const LABELS = {
  viewWork: { en: 'View Work', hi: 'काम देखें' },
  call: { en: 'Call', hi: 'कॉल करें' },
  whatsapp: { en: 'WhatsApp', hi: 'व्हॉट्सऐप' },
  leadBadge: { en: 'Lead Contractor', hi: 'मुख्य ठेकेदार' },
  yearsExp: { en: '{n} yrs experience', hi: '{n} साल का अनुभव' },
  dockWith: { en: 'Contacting {name}', hi: '{name} से संपर्क' },
  dockDefault: { en: 'Vishal Painting hotline', hi: 'विशाल पेंटिंग हॉटलाइन' },
  bookWa: { en: 'Book on WhatsApp', hi: 'व्हॉट्सऐप पर बुक करें' },
  callNumber: { en: 'Call {phone}', hi: 'कॉल करें {phone}' },
  allSpecialists: { en: '← All Specialists', hi: '← सभी विशेषज्ञ' },
  partnerN: { en: 'PARTNER {n}', hi: 'पार्टनर {n}' },
  beforeAfter: { en: 'Before & after', hi: 'पहले और बाद' },
  credentials: { en: 'Credentials', hi: 'योग्यताएँ' },
  sample: { en: '✓ SAMPLE', hi: '✓ नमूना' },
  verified: { en: '✓ VERIFIED', hi: '✓ सत्यापित' },
  before: { en: 'BEFORE', hi: 'पहले' },
  after: { en: 'AFTER', hi: 'बाद' },
  sliderLabel: { en: 'Before and after comparison', hi: 'पहले और बाद की तुलना' },
  showPair: { en: 'Show project {n}', hi: 'प्रोजेक्ट {n} दिखाएँ' },
  prevProject: { en: 'Previous project', hi: 'पिछला प्रोजेक्ट' },
  nextProject: { en: 'Next project', hi: 'अगला प्रोजेक्ट' },
  pauseAuto: { en: 'Pause auto-scroll', hi: 'ऑटो-स्क्रॉल रोकें' },
  playAuto: { en: 'Start auto-scroll', hi: 'ऑटो-स्क्रॉल चालू करें' },
  galleryTitle: { en: 'Our Work', hi: 'हमारा काम' },
  filterAll: { en: 'All', hi: 'सभी' },
  filterInterior: { en: 'Interior', hi: 'इंटीरियर' },
  filterExterior: { en: 'Exterior', hi: 'एक्सटीरियर' },
  filterPutty: { en: 'Putty', hi: 'पुट्टी' },
  filterWaterproofing: { en: 'Waterproofing', hi: 'वॉटरप्रूफिंग' },
  filterCrack: { en: 'Crack Repair', hi: 'क्रैक रिपेयर' },
  openProject: { en: 'Open before and after: {title}', hi: 'पहले और बाद खोलें: {title}' },
  close: { en: 'Close', hi: 'बंद करें' },
  prev: { en: 'Previous', hi: 'पिछला' },
  next: { en: 'Next', hi: 'अगला' },
  wantThis: { en: 'Want this for your home?', hi: 'अपने घर के लिए यह चाहिए?' },
  chatWith: { en: 'Chat with {name}', hi: '{name} से चैट करें' },
  videosTitle: { en: 'Work in Motion', hi: 'काम की झलक' },
  playVideo: { en: 'Play video: {title}', hi: 'वीडियो चलाएँ: {title}' },
  loadError: { en: 'Could not load content. Please refresh.', hi: 'सामग्री लोड नहीं हो सकी। कृपया रीफ़्रेश करें।' },
  bottomCtaPre: { en: 'Great results start with a', hi: 'बेहतरीन नतीजे शुरू होते हैं' },
  bottomCtaEm: { en: 'free inspection.', hi: 'मुफ़्त निरीक्षण से।' },
  waNow: { en: 'WhatsApp Now →', hi: 'अभी व्हॉट्सऐप करें →' },
  teamNav: { en: 'Specialists', hi: 'विशेषज्ञ' },
  otherSpecialists: { en: 'Other specialists', hi: 'अन्य विशेषज्ञ' },
  paymentsTitle: { en: 'Payment options', hi: 'भुगतान के विकल्प' },
  paymentsSub: { en: 'Ways you can pay us', hi: 'आप हमें इन तरीकों से भुगतान कर सकते हैं' },
  offersTitle: { en: 'Offers', hi: 'ऑफ़र' },
  offersSub: { en: 'What you get when you book with us', hi: 'हमारे साथ बुक करने पर आपको क्या मिलता है' },
  askOffer: { en: 'Ask on WhatsApp', hi: 'व्हॉट्सऐप पर पूछें' },
  reviewsTitle: { en: 'Customer reviews', hi: 'ग्राहकों के रिव्यू' },
  reviewsCount: { en: '{n} reviews', hi: '{n} रिव्यू' },
  workBy: { en: 'Work by {name}', hi: '{name} का काम' },
  originalIn: { en: 'Original in {lang}', hi: 'मूल भाषा: {lang}' },
  langNameEn: { en: 'English', hi: 'अंग्रेज़ी' },
  langNameHi: { en: 'Hindi', hi: 'हिन्दी' },
  langNameMr: { en: 'Marathi', hi: 'मराठी' },
  locationTitle: { en: 'Location', hi: 'लोकेशन' },
  ourLocation: { en: 'Our location', hi: 'हमारी लोकेशन' },
  basedIn: { en: 'Based in {city}', hi: '{city} में' },
  mapTitle: { en: 'Map of {city}', hi: '{city} का नक्शा' },
  openInMaps: { en: 'Open in Google Maps', hi: 'गूगल मैप में खोलें' },
  yourLocationTitle: { en: 'Share your location', hi: 'अपनी लोकेशन भेजें' },
  yourLocationDesc: {
    en: 'Tap the button and your current location goes to {name} on WhatsApp, so the free inspection can be planned faster.',
    hi: 'बटन दबाएँ और आपकी मौजूदा लोकेशन व्हॉट्सऐप पर {name} को चली जाएगी, ताकि मुफ़्त निरीक्षण जल्दी तय हो सके।'
  },
  shareLocation: { en: 'Share my location on WhatsApp', hi: 'व्हॉट्सऐप पर मेरी लोकेशन भेजें' },
  locating: { en: 'Getting your location…', hi: 'आपकी लोकेशन ली जा रही है…' },
  locationSent: { en: 'WhatsApp opened with your location.', hi: 'आपकी लोकेशन के साथ व्हॉट्सऐप खुल गया।' },
  locationReady: { en: 'Location ready. Tap below to send it.', hi: 'लोकेशन तैयार है। भेजने के लिए नीचे दबाएँ।' },
  locationDenied: {
    en: 'Could not get your location. Open WhatsApp and share it from the attach menu.',
    hi: 'आपकी लोकेशन नहीं मिली। व्हॉट्सऐप खोलकर अटैच मेन्यू से लोकेशन भेज दें।'
  },
  locationPrivacy: {
    en: 'Your location is used only when you tap the button and is never stored on this site.',
    hi: 'आपकी लोकेशन सिर्फ़ बटन दबाने पर इस्तेमाल होती है और इस साइट पर कहीं सेव नहीं होती।'
  },
  openWa: { en: 'Open WhatsApp', hi: 'व्हॉट्सऐप खोलें' },
  surfaceInterior: { en: 'Interior Walls', hi: 'अंदरूनी दीवारें' },
  surfaceExterior: { en: 'Exterior Walls', hi: 'बाहरी दीवारें' },
  surfaceTerrace: { en: 'Terrace/Roof', hi: 'टैरेस/छत' },
  estimated: { en: 'Estimated: {range}', hi: 'अनुमानित: {range}' },
  estimateCustomQuote: { en: 'Large or commercial job: your quote will be custom.', hi: 'बड़ा या कमर्शियल काम: आपका कोटेशन अलग से बनेगा।' },
  estimateAreaClamped: { en: 'Area adjusted to {area} sq.ft (allowed range 100–10,000).', hi: 'क्षेत्रफल {area} वर्ग फ़ुट किया गया (अनुमत सीमा 100–10,000)।' },
  estimateTierSwitched: { en: 'Switched to {tier}: the previous option does not apply to this surface.', hi: '{tier} चुना गया: पिछला विकल्प इस सतह पर लागू नहीं होता।' },
  estimateInvalid: { en: 'Enter an area to see an estimate.', hi: 'अनुमान देखने के लिए क्षेत्रफल भरें।' },
  bookEstimateWa: { en: 'Book Estimate via WhatsApp', hi: 'व्हॉट्सऐप से अनुमान बुक करें' },
  introLabel: { en: 'Welcome to Vishal Painting', hi: 'विशाल पेंटिंग में आपका स्वागत है' },
  introEyebrow: { en: 'Painting & Waterproofing', hi: 'पेंटिंग व वॉटरप्रूफिंग' },
  introTagline: { en: 'Flawless Walls. Leak-Proof Homes.', hi: 'बेदाग़ दीवारें। लीक-प्रूफ घर।' },
  introSkip: { en: 'Skip intro', hi: 'इंट्रो छोड़ें' }
};

Object.assign(LABELS, PAGE_LABELS, BOOKING_LABELS);
for (const [key, text] of Object.entries(MR_UI)) LABELS[key].mr = text;

// Picks the active-language string from a {en, hi, mr} object. Marathi falls back to Hindi (closer
// than English for a Marathi reader), then English.
export function pick(obj, lang) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || (lang === 'mr' && obj.hi) || obj.en || '';
}

export function t(key, lang, vars = {}) {
  const entry = LABELS[key];
  if (!entry) {
    console.warn(`[labels] missing key: ${key}`);
    return key;
  }
  return pick(entry, lang).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

// Fills every <el data-label="key"> (and data-label-attr="aria-label" variants) for the given language.
export function applyLabels(root, lang) {
  root.querySelectorAll('[data-label]').forEach((node) => {
    const text = t(node.dataset.label, lang);
    if (node.dataset.labelTitle) node.setAttribute('title', text);
    if (node.dataset.labelAttr) node.setAttribute(node.dataset.labelAttr, text);
    else node.textContent = text;
  });
}
