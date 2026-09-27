import { choiceCard, choiceGroup } from './fields.js';
import { pick, t } from '../../core/labels.js';
import { PARTNER_BEST } from '../../services/validators.js';
import { partnersForServices, recommendPartnerId } from '../../services/routing.js';

export function renderStep3({ values, errors, ctx, lang, choose }) {
  const ranked = partnersForServices(values.services, ctx.services);
  const recommended = recommendPartnerId(values.services, ctx.services);
  // Partners who fit the chosen services first, the rest after: everyone stays selectable.
  const order = (p) => (ranked.includes(p.id) ? ranked.indexOf(p.id) : ranked.length + p.order);
  const cards = [...ctx.partners].sort((a, b) => order(a) - order(b)).map((p) => choiceCard({
    type: 'radio', name: 'partner', value: p.id, checked: values.partnerId === p.id,
    title: pick(p.name, lang), desc: pick(p.roleTitle, lang),
    badge: p.id === recommended ? t('recommended', lang) : null,
    onChange: (id) => choose({ partnerId: id })
  }));
  cards.push(choiceCard({
    type: 'radio', name: 'partner', value: PARTNER_BEST, checked: values.partnerId === PARTNER_BEST,
    title: t('bestAvailable', lang), desc: t('bestAvailableDesc', lang), onChange: (id) => choose({ partnerId: id })
  }));
  return choiceGroup({ legend: t('q3', lang), error: errors.partnerId, lang, id: 'bk-partner' }, ...cards);
}
