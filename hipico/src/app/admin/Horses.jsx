import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, sellHorse, horseStatus, moduleOn, horseAge, healthDueSoon } from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge } from '../../components/ui.jsx'
import { HorsePhoto } from '../../components/HorseCare.jsx'
import { useSave } from './useSave.js'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable, exportCsv, useDesktop, useDeskAction, useDeskSearch } from '../../components/Desk.jsx'
import { Sheet } from '../../components/EditKit.jsx'
import HorseProfile from './HorseProfile.jsx'
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
/** Caballos on a computer: one table (status filter, search), the profile in a side panel. */
function HorsesDesk() {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const base = useBase()
  const navigate = useNavigate()
  const q = useDeskSearch(t('horses.search'))
  const { pathname, search } = useLocation()
  // The status filter lives in the address, so coming back from a profile keeps it.
  const [params, setParams] = useSearchParams()
  const status = params.get('estado') || 'all'
  const setStatus = (st) => { const next = new URLSearchParams(params); if (st === 'all') next.delete('estado'); else next.set('estado', st); setParams(next, { replace: true }) }
  const [open, setOpen] = useState(null)
  const due = healthDueSoon(s, 14)
  const statuses = ['school', 'boarded', ...(moduleOn(s, 'moduleSales') ? ['for_sale'] : []), 'retired', 'sold']
  const rows = s.horses
    .filter((h) => status === 'all' ? horseStatus(h) !== 'sold' : horseStatus(h) === status)
    .filter((h) => !q || [h.name, h.breed, byId(s.families, h.ownerFamilyId)?.name].some((v) => v?.toLowerCase().includes(q)))
  const columns = [
    { key: 'name', label: t('schedule.name'), render: (h) => <span className="row gap-sm"><HorsePhoto horse={h} size={32} /><span className="dtable__strong">{h.name}</span></span> },
    { key: 'status', label: t('horseProfile.category'), value: (h) => t(`horses.status.${horseStatus(h)}`) },
    { key: 'level', label: t('horses.level'), value: (h) => (h.level ? t(`levels.${h.level}`) : '') },
    { key: 'age', label: t('horses.age'), value: (h) => horseAge(h), render: (h) => (horseAge(h) != null ? t('horses.years', { n: horseAge(h) }) : '—') },
    { key: 'breed', label: t('horses.breed'), value: (h) => h.breed || '' },
    { key: 'owner', label: t('horses.ownerOrPrice'), value: (h) => (horseStatus(h) === 'boarded' ? byId(s.families, h.ownerFamilyId)?.name || '' : h.salePrice != null && horseStatus(h) === 'for_sale' ? fmtMoney(h.salePrice) : '') },
    { key: 'due', label: t('horses.pending'), value: (h) => due.filter((x) => x.horse.id === h.id).map((x) => t(`horseProfile.kinds.${x.kind}`)).join(', '),
      render: (h) => { const d = due.filter((x) => x.horse.id === h.id); return d.length ? <span className="owed__late small">{d.map((x) => t(`horseProfile.kinds.${x.kind}`)).join(', ')}</span> : '' } },
  ]
  useDeskAction({ label: t('schedule.addHorse'), icon: 'plus', onClick: () => navigate(`${base}/direccion/caballos/nuevo`) }, [])
  return (
    <>
      <div className="dtoolbar">
        <div className="chips-scroll grow" role="group">
          {['all', ...statuses].map((st) => (
            <button key={st} type="button" className={`chip ${status === st ? 'is-active' : ''}`} aria-pressed={status === st} onClick={() => setStatus(st)}>
              {st === 'all' ? t('desk.all') : t(`horses.group.${st}`)}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--sm" onClick={() => exportCsv('caballos.csv', columns, rows)}><Icon name="download" size={16} /> {t('desk.export')}</button>
      </div>
      <DataTable columns={columns} rows={rows} onRow={(h) => setOpen(h.id)} selected={open} defaultSort={{ key: 'name', dir: 1 }} />
      {open && (
        <Sheet title={byId(s.horses, open)?.name || ''} onClose={() => setOpen(null)}>
          <HorseProfile id={open} embedded />
          <Link to={`${base}/direccion/caballos/${open}`} state={{ from: { to: `${pathname}${search}`, label: t('schedule.horses') } }} className="link">{t('horses.openFull')}</Link>
        </Sheet>
      )}
    </>
  )
}

export default function HorsesView() {
  const desk = useDesktop()
  if (desk) return <HorsesDesk />
  return <HorsesList />
}

function HorsesList() {
  const { pathname, search } = useLocation()
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
                      <Link to={`${base}/direccion/caballos/${h.id}`} state={{ from: { to: `${pathname}${search}`, label: t('schedule.horses') } }} className="horse__link grow">
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
