import { el } from '../../core/dom.js';
import { t } from '../../core/labels.js';
import { choiceCard, choiceGroup, textField } from './fields.js';
import { dateBounds } from '../../services/validators.js';
import { localize } from '../../services/formatters.js';

export function renderStep6({ values, errors, ctx, lang, choose, set }) {
  const { min, max } = dateBounds(ctx.options, ctx.now);
  const slots = ctx.options.timeSlots.map((s) => choiceCard({
    type: 'radio', name: 'slot', value: s.id, checked: values.schedule.slotId === s.id,
    title: localize(s.label, lang), onChange: (id) => choose({ schedule: { slotId: id } })
  }));
  return el('div', { class: 'step' },
    // The native date picker follows the phone's own language, so Hindi/Marathi users get a familiar one.
    textField({ id: 'bk-date', label: t('fDate', lang), hint: t('slotHint', lang), value: values.schedule.date, error: errors.date, lang, type: 'date', min, max, onInput: (v) => set({ schedule: { date: v } }) }),
    choiceGroup({ legend: t('fSlot', lang), error: errors.slotId, lang, id: 'bk-slot' }, ...slots));
}
