// Pure logic (no DOM, no server): Google Maps URLs and the "here is my location"
// WhatsApp message. Coordinates only ever travel inside the wa.me link the
// customer chooses to send.

// The no-key embed works for a place name and drops a pin on it; `hl` sets the map's label language.
// Swap for the Maps Embed API if a key is ever configured.
export const mapEmbedUrl = (query, lang = 'en') =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&hl=${lang}&output=embed`;

export const mapOpenUrl = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const pinUrl = ({ lat, lng }) => `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

const MESSAGES = {
  en: 'Hi, I would like a free site inspection. My location: {link}',
  hi: 'नमस्ते, मुझे मुफ़्त साइट निरीक्षण चाहिए। मेरी लोकेशन: {link}'
};

export function locationMessage(lang, coords) {
  return (MESSAGES[lang] || MESSAGES.en).replace('{link}', pinUrl(coords));
}

// Resolves { lat, lng }; rejects when unsupported, denied, or timed out.
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
