import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, isDeletedFamily, LEVELS, saveHorse, sellHorse, uploadHorsePhoto, removeHorsePhoto, horsePhotoUrl,
  horseStatus, moduleOn,
} from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Segmented } from '../../components/ui.jsx'
import { useSave } from './useSave.js'

const ICON = { school: 'shoe', boarded: 'barn', for_sale: 'receipt', retired: 'clock', sold: 'check' }

/** Photos of a horse for sale (the future website shows them). */
function Photos({ horse }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const input = useRef(null)
  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) run(() => uploadHorsePhoto(horse.id, file), t('horses.photoAdded'))
  }
  return (
    <div className="field">
      <span>{t('horses.photos')}</span>
      <div className="photos">
        {(horse.photos || []).map((p) => (
          <div key={p} className="photos__item">
            <img src={horsePhotoUrl(p)} alt={horse.name} loading="lazy" />
            <button type="button" className="photos__remove" aria-label={t('horses.removePhoto')} onClick={() => run(() => removeHorsePhoto(horse.id, p), t('horses.photoRemoved'))}><Icon name="x" size={14} /></button>
          </div>
        ))}
        {(horse.photos || []).length < 6 && (
          <button type="button" className="photos__add" disabled={busy} onClick={() => input.current?.click()}><Icon name="plus" size={20} /><span>{t('horses.addPhoto')}</span></button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onFile} />
    </div>
  )
}

function SellForm({ horse, onDone }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const [f, setF] = useState({ price: horse.salePrice ?? '', buyer: '' })
  return (
    <form className="inline-form sellform" onSubmit={(e) => { e.preventDefault(); run(() => sellHorse({ horseId: horse.id, ...f }), t('horses.soldToast', { name: horse.name }), onDone) }}>
      <p className="small">{t('horses.sellText')}</p>
      <label className="field"><span>{t('horses.salePriceFinal')}</span>
        <input className="input" type="number" inputMode="numeric" min={0} step={1000} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </label>
      <label className="field"><span>{t('horses.buyer')}</span>
        <input className="input" value={f.buyer} onChange={(e) => setF({ ...f, buyer: e.target.value })} />
      </label>
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('horses.markSold')}</button>
      </div>
    </form>
  )
}

/** Caballos: each horse has a status (Escuela · Pensión · En venta · Retirado); horses for sale carry price, details and photos. */
export default function HorsesView() {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const [editing, setEditing] = useState(null)
  const [selling, setSelling] = useState(null)
  const [f, setF] = useState({})
  const sales = moduleOn(s, 'moduleSales')
  const families = s.families.filter((fam) => !isDeletedFamily(fam))
  const statuses = ['school', 'boarded', ...(sales ? ['for_sale'] : []), 'retired']
  const open = (h) => {
    setSelling(null)
    setEditing(h?.id || 'new')
    setF(h ? { ...h, status: horseStatus(h) } : { name: '', status: 'school', ownerFamilyId: '', active: true })
  }
  const current = editing && editing !== 'new' ? byId(s.horses, editing) : null

  const form = (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveHorse(f), t('schedule.saved'), () => setEditing(null)) }}>
      <input className="input" aria-label={t('schedule.name')} placeholder={t('schedule.name')} value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <Segmented small value={f.status} onChange={(status) => setF({ ...f, status })}
        options={statuses.map((st) => ({ value: st, label: t(`horses.status.${st}`) }))} />
      {f.status === 'boarded' && (
        <select className="input" aria-label={t('schedule.owner')} value={f.ownerFamilyId || ''} onChange={(e) => setF({ ...f, ownerFamilyId: e.target.value })} required>
          <option value="">{t('schedule.owner')}</option>
          {families.map((fam) => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
        </select>
      )}
      {f.status === 'for_sale' && (
        <div className="saleform">
          <div className="grid2">
            <label className="field"><span>{t('horses.salePrice')}</span>
              <input className="input" type="number" inputMode="numeric" min={0} step={1000} value={f.salePrice ?? ''} onChange={(e) => setF({ ...f, salePrice: e.target.value })} />
            </label>
            <label className="field"><span>{t('horses.age')}</span>
              <input className="input" type="number" inputMode="numeric" min={0} max={45} value={f.age ?? ''} onChange={(e) => setF({ ...f, age: e.target.value })} />
            </label>
          </div>
          <div className="grid2">
            <label className="field"><span>{t('horses.breed')}</span>
              <input className="input" value={f.breed || ''} onChange={(e) => setF({ ...f, breed: e.target.value })} />
            </label>
            <label className="field"><span>{t('horses.level')}</span>
              <select className="input" value={f.level || ''} onChange={(e) => setF({ ...f, level: e.target.value })}>
                <option value="">—</option>
                {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>{t('horses.description')}</span>
            <textarea className="input" rows={3} maxLength={400} value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </label>
          {current ? <Photos horse={current} /> : <p className="small muted">{t('horses.photosAfterSave')}</p>}
        </div>
      )}
      {f.status !== 'retired' && f.status !== 'boarded' && (
        <label className="check"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} /> <span>{t('horses.inClasses')}</span></label>
      )}
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )

  const groups = [...statuses, 'sold'].map((st) => ({ st, list: s.horses.filter((h) => horseStatus(h) === st) }))
    .filter((g) => g.list.length || ['school', 'boarded'].includes(g.st))
  return (
    <>
      {groups.map(({ st, list }) => (
        <div key={st} className="card">
          <p className="card__label">{t(`horses.group.${st}`)}</p>
          <ul className="list">
            {list.map((h) => (
              <li key={h.id} className="list__row list__row--stack">
                {editing === h.id ? form : selling === h.id ? <SellForm horse={h} onDone={() => setSelling(null)} /> : (
                  <div className="row gap">
                    {h.photos?.[0] ? <img className="horse__thumb" src={horsePhotoUrl(h.photos[0])} alt="" /> : <span className="tile-icon"><Icon name={ICON[st]} size={20} /></span>}
                    <div className="grow">
                      <p className="list__title">{h.name} {h.active === false && st !== 'retired' && st !== 'sold' && <Badge tone="neutral">{t('schedule.off')}</Badge>}</p>
                      {st === 'boarded' && <p className="small muted">{byId(s.families, h.ownerFamilyId)?.name || t('schedule.noOwner')}</p>}
                      {st === 'for_sale' && (
                        <p className="small muted">
                          {[h.salePrice != null ? fmtMoney(h.salePrice) : null, h.age ? t('horses.years', { n: h.age }) : null, h.breed, h.level ? t(`levels.${h.level}`) : null].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {st === 'sold' && (() => { const sale = (s.horseSales || []).find((x) => x.horseId === h.id); return sale ? <p className="small muted">{fmtMoney(sale.price)}{sale.buyer ? ` · ${sale.buyer}` : ''}</p> : null })()}
                    </div>
                    {st !== 'sold' && <button type="button" className="link" onClick={() => open(h)}>{t('more.profile.edit')}</button>}
                    {st === 'for_sale' && <button type="button" className="link" onClick={() => { setEditing(null); setSelling(h.id) }}>{t('horses.sell')}</button>}
                  </div>
                )}
              </li>
            ))}
            {list.length === 0 && <li className="list__row small muted">{t('schedule.noHorses')}</li>}
          </ul>
        </div>
      ))}
      {editing === 'new' ? <div className="card">{form}</div> : (
        <button type="button" className="btn btn--outline btn--sm btn--block" onClick={() => open(null)}><Icon name="plus" size={16} /> {t('schedule.addHorse')}</button>
      )}
    </>
  )
}
