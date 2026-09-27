import { el } from '../../core/dom.js';
import { t } from '../../core/labels.js';
import { choiceCard, choiceGroup, toggleIn } from './fields.js';
import { localize } from '../../services/formatters.js';
import { suggestedServices } from '../../services/booking.js';

export function renderStep5({ values, errors, ctx, lang, choose, addServices }) {
  const cards = ctx.options.wallConditions.map((c) => choiceCard({
    type: 'checkbox', name: 'conditions', value: c.id, checked: values.conditions.includes(c.id),
    title: localize(c.label, lang), desc: localize(c.hint, lang),
    onChange: (id, on) => choose({ conditions: toggleIn(values.conditions, id, on) })
  }));
  const extra = suggestedServices(values, ctx);
  const nameOf = (id) => localize(ctx.services.find((s) => s.id === id)?.title, lang);
  return el('div', { class: 'step' },
    choiceGroup({ legend: t('q5', lang), error: errors.conditions, lang, id: 'bk-conditions' }, ...cards),
    extra.length > 0 && el('div', { class: 'suggest', role: 'status' },
      el('p', { class: 'suggest__text', text: t('suggestPre', lang) }),
      ...extra.map((id) => el('button', { type: 'button', class: 'btn btn-outline btn-sm', text: t('suggestAdd', lang, { name: nameOf(id) }), onclick: () => addServices([id]) }))));
}
