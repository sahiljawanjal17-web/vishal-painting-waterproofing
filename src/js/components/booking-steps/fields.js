// Small DOM builders shared by the wizard steps. Each returns a node; none hold state, so a step
// re-render simply rebuilds them from the booking values.
import { el } from '../../core/dom.js';
import { t } from '../../core/labels.js';

// validators.js error key → label key: 'conditionConflict' → 'errConditionConflict'.
export const errorText = (key, lang) => (key ? t(`err${key[0].toUpperCase()}${key.slice(1)}`, lang) : '');

export function fieldError(id, key, lang) {
  return el('p', { class: 'field__error', id: `${id}-err`, role: 'alert', text: errorText(key, lang), hidden: !key });
}

/** Labelled <input>. `onInput` runs on every keystroke and must NOT re-render (would drop focus). */
export function textField({ id, label, value, error, lang, hint, type = 'text', onInput, ...attrs }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ');
  return el('div', { class: `field${error ? ' field--invalid' : ''}` },
    el('label', { class: 'field__label', for: id, text: label }),
    el('input', {
      class: 'field__input', id, type, value: value ?? '', required: true,
      'aria-invalid': error ? 'true' : null, 'aria-describedby': describedBy || null,
      oninput: (e) => onInput(e.target.value), ...attrs
    }),
    hint && el('p', { class: 'field__hint', id: `${id}-hint`, text: hint }),
    fieldError(id, error, lang));
}

/** Big tappable radio/checkbox card (44px+ target). */
export function choiceCard({ type, name, value, checked, title, desc, badge, onChange }) {
  return el('label', { class: `choice${checked ? ' choice--on' : ''}` },
    el('input', { class: 'choice__input', type, name, value, checked, onchange: (e) => onChange(value, e.target.checked) }),
    el('span', { class: 'choice__body' },
      el('span', { class: 'choice__title', text: title }),
      desc && el('span', { class: 'choice__desc', text: desc })),
    badge && el('span', { class: 'choice__badge', text: badge }));
}

export const choiceGroup = ({ legend, error, lang, id }, ...cards) =>
  el('fieldset', { class: `choices${error ? ' choices--invalid' : ''}`, 'aria-describedby': error ? `${id}-err` : null },
    legend && el('legend', { class: 'choices__legend', text: legend }),
    el('div', { class: 'choices__grid' }, ...cards),
    fieldError(id, error, lang));

// Adds/removes `id` in a list without mutating it.
export const toggleIn = (list, id, on) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));
