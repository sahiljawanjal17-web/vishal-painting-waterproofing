import { el } from '../../core/dom.js';
import { t } from '../../core/labels.js';
import { textField } from './fields.js';

export function renderStep1({ values, errors, lang, set }) {
  const c = values.client;
  return el('div', { class: 'step' },
    textField({ id: 'bk-name', label: t('fName', lang), value: c.name, error: errors.name, lang, autocomplete: 'name', maxlength: 60, onInput: (v) => set({ client: { name: v } }) }),
    textField({ id: 'bk-phone', label: t('fPhone', lang), hint: t('fPhoneHint', lang), value: c.phone, error: errors.phone, lang, type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: 16, onInput: (v) => set({ client: { phone: v } }) }),
    textField({ id: 'bk-location', label: t('fLocation', lang), hint: t('fLocationHint', lang), value: c.location, error: errors.location, lang, autocomplete: 'street-address', maxlength: 100, onInput: (v) => set({ client: { location: v } }) }));
}
