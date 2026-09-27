// Thin typed wrapper over the classic-script globals (window.store / window.ebus)
// so components don't reach into window directly. store.js and event-bus.js must
// be loaded as classic scripts before the module entry point.
//
// Event catalogue (docs/01 §6):
//   lang:changed        { lang }
//   partner:selected    { partnerId }
//   estimator:computed  { estimate, input }   estimate = pricing.estimate() result
//   booking:open        { prefill?, source }  prefill = booking.prefillFrom() argument
//   booking:submitted   { payload, route, ref }

export const getLang = () => window.store.getState().lang;

export const setLang = (lang) => window.store.setState({ lang });

export const onLangChange = (fn) => window.ebus.on('lang:changed', ({ lang }) => fn(lang));

export function selectPartner(partnerId) {
  if (window.store.getState().selectedPartnerId === partnerId) return;
  window.store.setState({ selectedPartnerId: partnerId });
  window.ebus.emit('partner:selected', { partnerId });
}

export const getSelectedPartnerId = () => window.store.getState().selectedPartnerId ?? null;

export const onPartnerSelected = (fn) => window.ebus.on('partner:selected', ({ partnerId }) => fn(partnerId));

// The latest good estimate lives in the store so the booking flow can prefill from it later,
// even if the estimator card is scrolled away or re-rendered.
export function publishEstimate({ estimate, input }) {
  window.store.setState({ estimator: { ...input, result: { min: estimate.min, max: estimate.max } } });
  window.ebus.emit('estimator:computed', { estimate, input });
}

export const getEstimatorState = () => window.store.getState().estimator ?? null;

export const onEstimatorComputed = (fn) => window.ebus.on('estimator:computed', fn);

export const openBooking = (prefill = {}, source = 'cta') => window.ebus.emit('booking:open', { prefill, source });

export const onBookingOpen = (fn) => window.ebus.on('booking:open', fn);

export const emitBookingSubmitted = (detail) => window.ebus.emit('booking:submitted', detail);

export const onBookingSubmitted = (fn) => window.ebus.on('booking:submitted', fn);
