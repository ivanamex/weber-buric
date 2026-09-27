import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, isDeletedFamily, saveHorse, uploadHorsePhoto, removeHorsePhoto, horsePhotoUrl, saveHorseCare, addHealth, deleteHealth,
  horseStatus, moduleOn, horseAge, careOf, healthOf, lastByKind, HORSE_LEVELS, HORSE_SEXES, HEALTH_KINDS,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented } from '../../components/ui.jsx'
import { DailyRation, HorsePhoto, NextDates } from '../../components/HorseCare.jsx'
import { todayKey } from '../../lib/time.js'
import { useSave } from './useSave.js'

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
      <span>{t('horses.photos')} <span className="muted">· {t('horseProfile.firstIsMain')}</span></span>
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

function BasicsForm({ horse, onDone }) {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const navigate = useNavigate()
  const base = useBase()
  const sales = moduleOn(s, 'moduleSales')
  const statuses = ['school', 'boarded', ...(sales || horseStatus(horse || {}) === 'for_sale' ? ['for_sale'] : []), 'retired']
  const families = s.families.filter((fam) => !isDeletedFamily(fam))
  const [f, setF] = useState(horse ? { ...horse, status: horseStatus(horse) } : { name: '', status: 'school', active: true })
  const set = (patch) => setF({ ...f, ...patch })
  const save = async (e) => {
    e.preventDefault()
    let created = null
    await run(async () => { const res = await saveHorse(f); created = res.id; return res }, t('schedule.saved'), () => {
      if (!horse && created) navigate(`${base}/direccion/caballos/${created}`, { replace: true })
      else onDone?.()
    })
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <input className="input" aria-label={t('schedule.name')} placeholder={t('schedule.name')} value={f.name || ''} onChange={(e) => set({ name: e.target.value })} required />
      <div className="field"><span>{t('horseProfile.category')}</span>
        <Segmented small value={f.status} onChange={(status) => set({ status })} options={statuses.map((st) => ({ value: st, label: t(`horses.status.${st}`) }))} />
      </div>
      {f.status === 'boarded' && (
        <select className="input" aria-label={t('schedule.owner')} value={f.ownerFamilyId || ''} onChange={(e) => set({ ownerFamilyId: e.target.value })} required>
          <option value="">{t('schedule.owner')}</option>
          {families.map((fam) => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
        </select>
      )}
      <div className="grid2">
        <label className="field"><span>{t('horseProfile.birthYear')}</span>
          <input className="input" type="number" inputMode="numeric" min={1980} max={Number(todayKey().slice(0, 4))} value={f.birthYear ?? ''} onChange={(e) => set({ birthYear: e.target.value })} />
        </label>
        <label className="field"><span>{t('horseProfile.sex')}</span>
          <select className="input" value={f.sex || ''} onChange={(e) => set({ sex: e.target.value })}>
            <option value="">—</option>
            {HORSE_SEXES.map((x) => <option key={x} value={x}>{t(`horseProfile.sexes.${x}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="grid2">
        <label className="field"><span>{t('horses.breed')}</span>
          <input className="input" value={f.breed || ''} onChange={(e) => set({ breed: e.target.value })} />
        </label>
        <label className="field"><span>{t('horseProfile.coat')}</span>
          <input className="input" value={f.coat || ''} onChange={(e) => set({ coat: e.target.value })} />
        </label>
      </div>
      <div className="grid2">
        <label className="field"><span>{t('horseProfile.height')}</span>
          <input className="input" type="number" inputMode="numeric" min={60} max={220} value={f.heightCm ?? ''} onChange={(e) => set({ heightCm: e.target.value })} />
        </label>
        {(f.status === 'school' || f.status === 'for_sale') && (
          <label className="field"><span>{t('horses.level')}</span>
            <select className="input" value={f.level || ''} onChange={(e) => set({ level: e.target.value })}>
              <option value="">—</option>
              {HORSE_LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
            </select>
          </label>
        )}
      </div>
      {f.status === 'for_sale' && (
        <>
          <label className="field"><span>{t('horses.salePrice')}</span>
            <input className="input" type="number" inputMode="numeric" min={0} step={1000} value={f.salePrice ?? ''} onChange={(e) => set({ salePrice: e.target.value })} />
          </label>
          <label className="field"><span>{t('horses.description')}</span>
            <textarea className="input" rows={3} maxLength={400} value={f.description || ''} onChange={(e) => set({ description: e.target.value })} />
          </label>
        </>
      )}
      {f.status !== 'retired' && f.status !== 'boarded' && (
        <label className="check"><input type="checkbox" checked={f.active !== false} onChange={(e) => set({ active: e.target.checked })} /> <span>{t('horses.inClasses')}</span></label>
      )}
      <div className="row gap-sm end">
        {onDone && <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>}
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

function CareForm({ horse, care, onDone }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const [f, setF] = useState({
    feed: care?.feed?.length ? care.feed.map((x) => ({ ...x })) : [{ type: 'Alfalfa', kg: '' }],
    rationsPerDay: care?.rationsPerDay ?? 3, supplements: care?.supplements || '', notes: care?.notes || '',
  })
  const setLine = (i, patch) => setF({ ...f, feed: f.feed.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveHorseCare({ horseId: horse.id, ...f }), t('schedule.saved'), onDone) }}>
      <div className="field"><span>{t('horseProfile.feedPerRation')}</span>
        {f.feed.map((line, i) => (
          <div key={i} className="feedline">
            <input className="input" list="feed-types" aria-label={t('horseProfile.feed')} placeholder={t('horseProfile.feed')} value={line.type} onChange={(e) => setLine(i, { type: e.target.value })} />
            <input className="input" type="number" inputMode="decimal" min={0} step={0.25} aria-label="kg" placeholder="kg" value={line.kg} onChange={(e) => setLine(i, { kg: e.target.value })} />
            <button type="button" className="iconbtn" aria-label={t('horseProfile.removeFeed')} onClick={() => setF({ ...f, feed: f.feed.filter((_, j) => j !== i) })}><Icon name="x" size={16} /></button>
          </div>
        ))}
        <datalist id="feed-types">{['Alfalfa', 'Avena', 'Concentrado', 'Heno', 'Pasto', 'Salvado'].map((x) => <option key={x} value={x} />)}</datalist>
        <button type="button" className="link" onClick={() => setF({ ...f, feed: [...f.feed, { type: '', kg: '' }] })}>+ {t('horseProfile.addFeed')}</button>
      </div>
      <label className="field"><span>{t('horseProfile.rationsLabel')}</span>
        <input className="input" type="number" inputMode="numeric" min={1} max={8} value={f.rationsPerDay} onChange={(e) => setF({ ...f, rationsPerDay: e.target.value })} />
      </label>
      <label className="field"><span>{t('horseProfile.supplements')}</span>
        <input className="input" value={f.supplements} onChange={(e) => setF({ ...f, supplements: e.target.value })} />
      </label>
      <label className="field"><span>{t('horseProfile.notes')}</span>
        <input className="input" placeholder={t('horseProfile.notesPh')} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </label>
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

function HealthForm({ horse, onDone }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const [f, setF] = useState({ kind: 'vaccine', doneOn: todayKey(), nextDue: '', note: '' })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => addHealth({ horseId: horse.id, ...f }), t('horseProfile.healthSaved'), onDone) }}>
      <Segmented small value={f.kind} onChange={(kind) => setF({ ...f, kind })} options={HEALTH_KINDS.map((k) => ({ value: k, label: t(`horseProfile.kinds.${k}`) }))} />
      <div className="grid2">
        <label className="field"><span>{t('horseProfile.doneOn')}</span>
          <input className="input" type="date" required value={f.doneOn} onChange={(e) => setF({ ...f, doneOn: e.target.value })} />
        </label>
        <label className="field"><span>{t('horseProfile.nextDue')}</span>
          <input className="input" type="date" min={f.doneOn} value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} />
        </label>
      </div>
      <input className="input" aria-label={t('profit.note')} placeholder={t('horseProfile.healthNotePh')} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

/** Management → Caballos → a horse: basics, photos, daily ration and health, all editable. */
export default function HorseProfile() {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const base = useBase()
  const { id } = useParams()
  const [run] = useSave()
  const [edit, setEdit] = useState(null) // 'basics' | 'care' | 'health'
  const [allHealth, setAllHealth] = useState(false)
  const horse = id === 'nuevo' ? null : byId(s.horses, id)
  const back = <Link to={`${base}/direccion/horario?vista=caballos`} className="backlink"><Icon name="chevronLeft" size={18} /> {t('schedule.horses')}</Link>

  if (!horse) {
    return (
      <div className="page">
        {back}
        <h1 className="page__title">{t(id === 'nuevo' ? 'schedule.addHorse' : 'horseProfile.notFound')}</h1>
        {id === 'nuevo' && <div className="card"><BasicsForm /></div>}
      </div>
    )
  }
  const status = horseStatus(horse)
  const age = horseAge(horse)
  const care = careOf(s, horse.id)
  const history = healthOf(s, horse.id)
  const owner = status === 'boarded' ? byId(s.families, horse.ownerFamilyId) : null
  const facts = [
    age != null ? t('horses.years', { n: age }) : null,
    horse.sex ? t(`horseProfile.sexes.${horse.sex}`) : null,
    horse.breed, horse.coat, horse.heightCm ? `${horse.heightCm} cm` : null,
  ].filter(Boolean)

  return (
    <div className="page">
      {back}
      <div className="horsehead">
        <HorsePhoto horse={horse} size={88} />
        <div className="grow">
          <h1 className="page__title">{horse.name}</h1>
          <p className="row gap-sm wrap">
            <Badge tone={status === 'for_sale' ? 'accent' : 'neutral'}>{t(`horses.status.${status}`)}</Badge>
            {horse.level && status !== 'boarded' && <Badge tone="neutral">{t(`levels.${horse.level}`)}</Badge>}
            {horse.active === false && status !== 'retired' && status !== 'sold' && <Badge tone="neutral">{t('schedule.off')}</Badge>}
          </p>
          {owner && <p className="small muted">{owner.name}</p>}
        </div>
      </div>

      <SectionTitle icon="horseHead" action={edit !== 'basics' && status !== 'sold' && <button type="button" className="link" onClick={() => setEdit('basics')}>{t('more.profile.edit')}</button>}>{t('horseProfile.basics')}</SectionTitle>
      <div className="card">
        {edit === 'basics' ? <BasicsForm horse={horse} onDone={() => setEdit(null)} /> : (
          <>
            <p>{facts.length ? facts.join(' · ') : <span className="muted small">{t('horseProfile.noBasics')}</span>}</p>
            {status === 'for_sale' && horse.description && <p className="small mt8">{horse.description}</p>}
            <div className="mt12"><Photos horse={horse} /></div>
          </>
        )}
      </div>

      <SectionTitle icon="sprout" action={edit !== 'care' && <button type="button" className="link" onClick={() => setEdit('care')}>{t('more.profile.edit')}</button>}>{t('horseProfile.ration')}</SectionTitle>
      <div className="card card--ration">
        {edit === 'care' ? <CareForm horse={horse} care={care} onDone={() => setEdit(null)} /> : <DailyRation care={care} />}
      </div>

      <SectionTitle icon="shield" action={edit !== 'health' && <button type="button" className="link" onClick={() => setEdit('health')}>+ {t('horseProfile.addHealth')}</button>}>{t('horseProfile.health')}</SectionTitle>
      <div className="card">
        {edit === 'health' && <HealthForm horse={horse} onDone={() => setEdit(null)} />}
        <NextDates last={lastByKind(s, horse.id)} />
        {history.length > 0 && (
          <>
            <p className="card__label mt16">{t('horseProfile.history')}</p>
            <ul className="list">
              {(allHealth ? history : history.slice(0, 5)).map((x) => (
                <li key={x.id} className="list__row">
                  <div className="grow">
                    <p className="list__title">{t(`horseProfile.kinds.${x.kind}`)} <span className="small muted">· {fmtDate(x.doneOn, { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                    {(x.note || x.nextDue) && <p className="small muted">{[x.note, x.nextDue ? t('horseProfile.nextOn', { date: fmtDate(x.nextDue, { day: 'numeric', month: 'short' }) }) : null].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <button type="button" className="iconbtn" aria-label={t('horseProfile.deleteHealth')} onClick={() => run(() => deleteHealth(x.id), t('horseProfile.healthDeleted'))}><Icon name="x" size={16} /></button>
                </li>
              ))}
            </ul>
            {history.length > 5 && <button type="button" className="link mt8" onClick={() => setAllHealth(!allHealth)}>{allHealth ? t('summary.showLess') : t('summary.showAll', { n: history.length })}</button>}
          </>
        )}
      </div>
    </div>
  )
}
