// Inline SVG icons (assets/icons/sprite.svg is still empty). Trusted constants only —
// safe to pass to el({ html }).

const PATHS = {
  roller: '<rect x="3" y="3" width="15" height="6" rx="1.5"/><path d="M18 6h3v6h-9v3"/><rect x="10" y="15" width="4" height="6" rx="1"/>',
  'shield-drop': '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z"/><path d="M12 8c-1.8 2.4-2.8 3.8-2.8 5a2.8 2.8 0 0 0 5.6 0c0-1.2-1-2.6-2.8-5z"/>',
  'putty-blade': '<path d="M19 21H5a2 2 0 0 1-2-2v-4l4-2h10l4 2v4a2 2 0 0 1-2 2z"/><path d="M12 13v-5"/><path d="M8 8h8"/><path d="M12 8V3"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-1.3 4.5 8.5 8.5 0 0 1-7.2 4 8.4 8.4 0 0 1-4-.9L3 21l1.9-5.5a8.5 8.5 0 1 1 16.1-4z"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  rupee: '<path d="M6 4h12M6 9h12M9 4c6 0 6 9 0 9H6l8 7"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  cheque: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h5M7 14h10M17 9.5h.01"/>',
  'map-pin': '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  arrows: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'
};

export function icon(name, className = 'icon') {
  const body = PATHS[name] || '';
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
