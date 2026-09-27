// 7-step booking wizard UI (docs/06). All rules live in services/booking.js; this file renders the
// current state, forwards input to it and hands the finished request to WhatsApp. Nothing is sent
// anywhere but the customer's own WhatsApp, and the draft stays in their browser only.
import { el } from '../core/dom.js';
import { getLang, onLangChange, onBookingOpen, emitBookingSubmitted } from '../core/app-state.js';
import { t } from '../core/labels.js';
import { STEP_COUNT } from '../services/validators.js';
import {
  addServices, createBooking, discardDraft, goBack, goNext, goTo, parseDeepLink, persistDraft, prefillFrom, restoreDraft, submitBooking, updateValues
} from '../services/booking.js';
import { openWhatsApp } from '../services/whatsapp.js';
import { renderStep1 } from './booking-steps/step-1-client.js';
import { renderStep2 } from './booking-steps/step-2-service.js';
import { renderStep3 } from './booking-steps/step-3-specialist.js';
import { renderStep4 } from './booking-steps/step-4-scope.js';
import { renderStep5 } from './booking-steps/step-5-condition.js';
import { renderStep6 } from './booking-steps/step-6-schedule.js';
import { renderStep7 } from './booking-steps/step-7-media-review.js';

const STEPS = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6, renderStep7];

const hasProgress = (v) => Boolean(v.client.name || v.client.phone || v.client.location || v.services.length);

export function initBookingWizard(root, { options, services, partners, pricing, site }) {
  const ctx = { options, services, partners, pricing, site };
  let state = createBooking();
  let done = null;         // result of a successful submit, shown instead of the form
  let restored = false;
  let focusTarget = null;  // 'title' after a step change, 'error' after a failed Next

  const draft = restoreDraft();
  if (draft && hasProgress(draft.values)) { state = draft; restored = true; }
  applyDeepLink(location.hash);

  function applyDeepLink(hash) {
    const link = parseDeepLink(hash);
    if (link.services.length || link.partnerId) state = prefillFrom(state, link, ctx);
  }

  const save = () => persistDraft(state);

  // `set` = silent (typing: no re-render, keeps focus). `choose` = update and redraw (cards, chips).
  const api = () => ({
    values: state.values, errors: state.errors, ctx, lang: getLang(),
    set: (patch) => { state = updateValues(state, patch); save(); },
    choose: (patch) => { state = updateValues(state, patch); save(); render(); },
    addServices: (ids) => { state = addServices(state, ids); save(); render(); },
    goToStep: (n) => { state = goTo(state, n, ctx); focusTarget = 'title'; render(); }
  });

  function stepper(lang) {
    return el('ol', { class: 'wizard__steps', 'aria-label': t('wizProgress', lang) },
      ...Array.from({ length: STEP_COUNT }, (_, i) => {
        const n = i + 1;
        const cls = `wizard__step${n === state.currentStep ? ' wizard__step--current' : ''}${n < state.currentStep ? ' wizard__step--done' : ''}`;
        return el('li', { class: cls, 'aria-current': n === state.currentStep ? 'step' : null },
          el('button', {
            type: 'button', class: 'wizard__dot', text: String(n), 'aria-label': `${t('wizStepOf', lang, { n, total: STEP_COUNT })}: ${t(`wizS${n}`, lang)}`,
            onclick: () => { state = goTo(state, n, ctx); focusTarget = 'title'; render(); }
          }));
      }));
  }

  function next() {
    const before = state.currentStep;
    if (before === STEP_COUNT) return send();
    state = goNext(state, ctx);
    focusTarget = state.currentStep === before ? 'error' : 'title';
    save();
    render();
  }

  function send() {
    const result = submitBooking(state, ctx, { lang: getLang(), source: 'website' });
    if (!result.ok) {
      // Something earlier became invalid (e.g. the date rolled past midnight): jump to it.
      const first = result.failures[0];
      state = { ...state, currentStep: first.step, errors: first.errors };
      focusTarget = 'error';
      return render();
    }
    done = result;
    openWhatsApp(result.url);
    emitBookingSubmitted({ ref: result.ref, payload: result.payload, route: result.route });
    discardDraft();
    focusTarget = 'title';
    render();
  }

  function reset() {
    discardDraft();
    state = createBooking();
    done = null;
    restored = false;
    focusTarget = 'title';
    render();
  }

  async function copyMessage(button, lang) {
    try {
      await navigator.clipboard.writeText(done.message);
      button.textContent = t('doneCopied', lang);
    } catch {
      window.prompt(t('doneCopy', lang), done.message);
    }
  }

  function renderDone(lang) {
    const copyBtn = el('button', { type: 'button', class: 'btn btn-outline', text: t('doneCopy', lang) });
    copyBtn.addEventListener('click', () => copyMessage(copyBtn, lang));
    return el('div', { class: 'wizard__done', role: 'status' },
      el('h3', { class: 'wizard__title', tabindex: '-1', text: t('doneTitle', lang) }),
      el('p', { text: t('doneText', lang) }),
      el('p', { class: 'wizard__ref', text: t('doneRef', lang, { ref: done.ref }) }),
      done.overLimit && el('p', { class: 'wizard__warn', text: t('doneLong', lang) }),
      !done.overLimit && done.truncated && el('p', { class: 'wizard__note', text: t('doneShort', lang) }),
      el('div', { class: 'wizard__actions' },
        el('a', { class: 'btn btn-whatsapp', href: done.url, target: '_blank', rel: 'noopener', text: t('doneOpen', lang) }),
        copyBtn,
        done.route.tel && el('a', { class: 'btn btn-outline', href: done.route.tel, text: t('doneCall', lang) }),
        el('button', { type: 'button', class: 'btn btn-outline', text: t('doneNew', lang), onclick: reset })));
  }

  function renderForm(lang) {
    const n = state.currentStep;
    const hasErrors = Object.keys(state.errors).length > 0;
    const isLast = n === STEP_COUNT;
    return el('form', { class: 'wizard__form', novalidate: true, onsubmit: (e) => { e.preventDefault(); next(); } },
      el('p', { class: 'wizard__progress', 'aria-live': 'polite', text: `${t('wizStepOf', lang, { n, total: STEP_COUNT })}: ${t(`wizS${n}`, lang)}` }),
      el('h3', { class: 'wizard__title', tabindex: '-1', text: t(`wizS${n}`, lang) }),
      STEPS[n - 1]({ ...api(), lang }),
      hasErrors && el('p', { class: 'wizard__alert', role: 'alert', text: t('wizRequired', lang) }),
      el('div', { class: 'wizard__nav' },
        n > 1 && el('button', { type: 'button', class: 'btn btn-outline', text: t('wizBack', lang), onclick: () => { state = goBack(state); focusTarget = 'title'; save(); render(); } }),
        el('button', { type: 'submit', class: `btn ${isLast ? 'btn-whatsapp' : 'btn-primary'}`, text: isLast ? t('wizSend', lang) : t('wizNext', lang) })));
  }

  function render() {
    const lang = getLang();
    const banner = restored && !done && el('p', { class: 'wizard__banner' },
      el('span', { text: t('draftBanner', lang) }), ' ',
      el('button', { type: 'button', class: 'wizard__link', text: t('draftReset', lang), onclick: reset }));
    root.replaceChildren(banner || '', done ? '' : stepper(lang), done ? renderDone(lang) : renderForm(lang));

    if (focusTarget === 'title') {
      root.querySelector('.wizard__title')?.focus({ preventScroll: true });
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else if (focusTarget === 'error') {
      root.querySelector('[aria-invalid="true"], .choices--invalid input')?.focus();
    }
    focusTarget = null;
  }

  render();
  const offLang = onLangChange(() => render());
  const offOpen = onBookingOpen(({ prefill }) => { state = prefillFrom(state, prefill ?? {}, ctx); done = null; save(); render(); });
  window.addEventListener('hashchange', () => { applyDeepLink(location.hash); render(); });

  return { update: render, destroy() { offLang(); offOpen(); } };
}
