import { el } from '../../core/dom.js';
import { t } from '../../core/labels.js';
import { choiceCard, choiceGroup, textField } from './fields.js';
import { localize } from '../../services/formatters.js';

export function renderStep4({ values, errors, ctx, lang, choose, set }) {
  const cards = ctx.options.propertyScopes.map((s) => choiceCard({
    type: 'radio', name: 'scope', value: s.id, checked: values.scope.id === s.id,
    title: localize(s.label, lang), desc: s.defaultSqft ? `~${s.defaultSqft} ${t('sqftUnit', lang)}` : null,
    onChange: (id) => choose({ scope: { id } })
  }));
  const chosen = ctx.options.propertyScopes.find((s) => s.id === values.scope.id);
  const needsSqft = chosen && chosen.defaultSqft == null;
  return el('div', { class: 'step' },
    choiceGroup({ legend: t('q4', lang), error: errors.scope, lang, id: 'bk-scope' }, ...cards),
    needsSqft && textField({
      id: 'bk-sqft', label: t('fSqft', lang), value: values.scope.customSqft ?? '', error: errors.customSqft, lang,
      type: 'number', inputmode: 'numeric', min: 50, max: 100000, onInput: (v) => set({ scope: { customSqft: v } })
    }));
}
