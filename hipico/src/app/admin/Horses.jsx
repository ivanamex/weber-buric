import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, sellHorse, horseStatus, moduleOn, horseAge, healthDueSoon } from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge } from '../../components/ui.jsx'
import { HorsePhoto } from '../../components/HorseCare.jsx'
import { useSave } from './useSave.js'
import { SaveBar, useFormState } from '../../components/EditKit.jsx'

function SellForm({ horse, onDone }) {
  const { t } = useI18n()
  const [run, busy, error] = useSave()
  const [f, setF, dirty] = useFormState({ price: horse.salePrice ?? '', buyer: '' })
  return (
    <form className="inline-form sellform" onSubmit={(e) => { e.preventDefault(); run(() => sellHorse({ horseId: horse.id, ...f }), t('horses.soldToast', { name: horse.name }), onDone, { inline: true }) }}>
      <p className="small">{t('horses.sellText')}</p>
      <label className="field"><span>{t('horses.salePriceFinal')}</span>
        <input className="input" type="number" inputMode="numeric" min={0} step={1000} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </label>
      <label className="field"><span>{t('horses.buyer')}</span>
        <input className="input" value={f.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} />
      </label>
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onDone} label={t('horses.markSold')} />
    </form>
  )
}

/** Caballos: the list by status; tap a horse for its profile (basics, photos, daily ration, health). */
export default function HorsesView() {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const base = useBase()
  const [selling, setSelling] = useState(null)
  const sales = moduleOn(s, 'moduleSales')
  const statuses = ['school', 'boarded', ...(sales ? ['for_sale'] : []), 'retired']
  const groups = [...statuses, 'sold'].map((st) => ({ st, list: s.horses.filter((h) => horseStatus(h) === st) }))
    .filter((g) => g.list.length || ['school', 'boarded'].includes(g.st))
  const due = healthDueSoon(s, 14)
  return (
    <>
      {groups.map(({ st, list }) => (
        <div key={st} className="card">
          <p className="card__label">{t(`horses.group.${st}`)}</p>
          <ul className="list">
            {list.map((h) => {
              const age = horseAge(h)
              const soon = due.filter((x) => x.horse.id === h.id)
              return (
                <li key={h.id} className="list__row list__row--stack">
                  {selling === h.id ? <SellForm horse={h} onDone={() => setSelling(null)} /> : (
                    <div className="row gap">
                      <Link to={`${base}/direccion/caballos/${h.id}`} className="horse__link grow">
                        <HorsePhoto horse={h} size={44} />
                        <span className="grow">
                          <span className="list__title">{h.name} {h.active === false && st !== 'retired' && st !== 'sold' && <Badge tone="neutral">{t('schedule.off')}</Badge>}</span>
                          <span className="small muted horse__facts">
                            {st === 'boarded' ? byId(s.families, h.ownerFamilyId)?.name || t('schedule.noOwner')
                              : st === 'for_sale' ? [h.salePrice != null ? fmtMoney(h.salePrice) : null, age != null ? t('horses.years', { n: age }) : null, h.breed].filter(Boolean).join(' · ')
                              : st === 'sold' ? (() => { const sale = (s.horseSales || []).find((x) => x.horseId === h.id); return sale ? `${fmtMoney(sale.price)}${sale.buyer ? ` · ${sale.buyer}` : ''}` : '' })()
                              : [h.level ? t(`levels.${h.level}`) : null, age != null ? t('horses.years', { n: age }) : null, h.breed].filter(Boolean).join(' · ')}
                          </span>
                          {soon.length > 0 && <span className="small owed__late horse__facts">{soon.map((x) => t(`horseProfile.kinds.${x.kind}`)).join(', ')}</span>}
                        </span>
                        <Icon name="chevronRight" size={18} />
                      </Link>
                      {st === 'for_sale' && <button type="button" className="link" onClick={() => setSelling(h.id)}>{t('horses.sell')}</button>}
                    </div>
                  )}
                </li>
              )
            })}
            {list.length === 0 && <li className="list__row small muted">{t('schedule.noHorses')}</li>}
          </ul>
        </div>
      ))}
      <Link to={`${base}/direccion/caballos/nuevo`} className="btn btn--outline btn--sm btn--block"><Icon name="plus" size={16} /> {t('schedule.addHorse')}</Link>
    </>
  )
}
