import { choiceCard, choiceGroup, toggleIn } from './fields.js';
import { t } from '../../core/labels.js';
import { localize } from '../../services/formatters.js';

export function renderStep2({ values, errors, ctx, lang, choose }) {
  const cards = [...ctx.services].sort((a, b) => a.order - b.order).map((s) => choiceCard({
    type: 'checkbox', name: 'services', value: s.id, checked: values.services.includes(s.id),
    title: localize(s.title, lang), desc: localize(s.shortDesc, lang),
    onChange: (id, on) => choose({ services: toggleIn(values.services, id, on) })
  }));
  return choiceGroup({ legend: t('q2', lang), error: errors.services, lang, id: 'bk-services' }, ...cards);
}
