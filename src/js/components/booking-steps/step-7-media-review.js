import { el } from '../../core/dom.js';
import { pick, t } from '../../core/labels.js';
import { choiceCard, choiceGroup, fieldError } from './fields.js';
import { formatDate, formatPhone, localize } from '../../services/formatters.js';
import { NOTES_MAX, PARTNER_BEST, cleanText, normalizePhone } from '../../services/validators.js';

const MEDIA = [['will-send', 'mediaWill'], ['later', 'mediaLater'], ['none', 'mediaNone']];

// Read-only recap with an "Edit" jump per block, so nobody has to page back step by step.
function summary({ values, ctx, lang, goToStep }) {
  const v = values;
  const names = (ids, list) => ids.map((id) => localize(list.find((x) => x.id === id)?.label ?? list.find((x) => x.id === id)?.title, lang)).join(', ');
  const partner = v.partnerId === PARTNER_BEST ? t('bestAvailable', lang) : pick(ctx.partners.find((p) => p.id === v.partnerId)?.name, lang);
  const scope = ctx.options.propertyScopes.find((s) => s.id === v.scope.id);
  const scopeText = `${localize(scope?.label, lang)}${scope?.defaultSqft == null && v.scope.customSqft ? ` (~${v.scope.customSqft} ${t('sqftUnit', lang)})` : ''}`;
  const slot = localize(ctx.options.timeSlots.find((s) => s.id === v.schedule.slotId)?.label, lang);
  const rows = [
    [1, 'wizS1', [cleanText(v.client.name), formatPhone(normalizePhone(v.client.phone)), cleanText(v.client.location)].join(' · ')],
    [2, 'wizS2', names(v.services, ctx.services)],
    [3, 'wizS3', partner],
    [4, 'wizS4', scopeText],
    [5, 'wizS5', names(v.conditions, ctx.options.wallConditions)],
    [6, 'wizS6', `${formatDate(v.schedule.date, lang)} · ${slot}`]
  ];
  return el('dl', { class: 'recap' }, ...rows.map(([step, key, text]) => el('div', { class: 'recap__row' },
    el('dt', { text: t(key, lang) }),
    el('dd', { text }),
    el('button', { type: 'button', class: 'recap__edit', text: t('sumEdit', lang), 'aria-label': `${t('sumEdit', lang)}: ${t(key, lang)}`, onclick: () => goToStep(step) }))));
}

export function renderStep7(api) {
  const { values, errors, lang, choose, set } = api;
  const media = MEDIA.map(([id, key]) => choiceCard({
    type: 'radio', name: 'media', value: id, checked: values.mediaIntent === id, title: t(key, lang), onChange: (v) => choose({ mediaIntent: v })
  }));
  const counter = el('span', { class: 'field__count', text: `${values.notes.length}/${NOTES_MAX}` });
  const notes = el('div', { class: `field${errors.notes ? ' field--invalid' : ''}` },
    el('label', { class: 'field__label', for: 'bk-notes', text: t('fNotes', lang) }),
    el('textarea', {
      class: 'field__input', id: 'bk-notes', rows: 3, maxlength: NOTES_MAX + 50, text: values.notes, 'aria-describedby': errors.notes ? 'bk-notes-err' : null,
      oninput: (e) => { set({ notes: e.target.value }); counter.textContent = `${e.target.value.length}/${NOTES_MAX}`; }
    }),
    counter,
    fieldError('bk-notes', errors.notes, lang));
  const consent = el('div', { class: `field${errors.consent ? ' field--invalid' : ''}` },
    el('label', { class: 'consent' },
      el('input', { type: 'checkbox', id: 'bk-consent', checked: values.consent, 'aria-invalid': errors.consent ? 'true' : null, onchange: (e) => set({ consent: e.target.checked }) }),
      el('span', { text: t('fConsent', lang) })),
    fieldError('bk-consent', errors.consent, lang));
  return el('div', { class: 'step' },
    summary(api),
    choiceGroup({ legend: t('fMedia', lang), error: errors.mediaIntent, lang, id: 'bk-media' }, ...media),
    notes,
    consent);
}
