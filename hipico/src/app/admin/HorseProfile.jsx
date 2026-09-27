import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, isDeletedFamily, saveHorse, uploadHorsePhoto, removeHorsePhoto, horsePhotoUrl, saveHorseCare, addHealth, updateHealth, deleteHealth,
  horseStatus, moduleOn, horseAge, careOf, healthOf, lastByKind, HORSE_LEVELS, HORSE_SEXES,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented } from '../../components/ui.jsx'
import { DailyRation, HorsePhoto, MyHorseCard, NextDates } from '../../components/HorseCare.jsx'
import { SaveBar, Sheet, useDiscardGuard, useFormState } from '../../components/EditKit.jsx'
import { useToast } from '../../components/Toast.jsx'
import { addDays, addMonthsFrom, todayKey } from '../../lib/time.js'
import { useSave } from './useSave.js'

/** Suggested next date after a vaccine (+6 months), deworming (+3 months) or farrier visit (+6 weeks). */
const suggestNext = (kind, doneOn) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doneOn || '')) return ''
  if (kind === 'vaccine') return addMonthsFrom(doneOn, 6)
  if (kind === 'deworming') return addMonthsFrom(doneOn, 3)
  if (kind === 'farrier') return addDays(doneOn, 42)
  return ''
}

/** Tells the page whether this form has unsaved changes. */
function useReportDirty(dirty, onDirty) {
  useEffect(() => { onDirty?.(dirty) }, [dirty, onDirty])
  useEffect(() => () => onDirty?.(false), [onDirty])
}

function PhotosView({ horse }) {
  const { t } = useI18n()
  const photos = horse.photos || []
  if (!photos.length) return <p className="small muted">{t('horseProfile.noPhotos')}</p>
  return (
    <div className="photos">
      {photos.map((p) => <div key={p} className="photos__item"><img src={horsePhotoUrl(p)} alt={horse.name} loading="lazy" /></div>)}
    </div>
  )
}

/** Photos save as soon as they're added or removed, with a visible "Subiendo foto…" state. */
function PhotosEdit({ horse, onDone }) {
  const { t } = useI18n()
  const [run, busy, error] = useSave()
  const [uploading, setUploading] = useState(false)
  const input = useRef(null)
  const photos = horse.photos || []
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    await run(() => uploadHorsePhoto(horse.id, file), t('edit.photoSaved'), null, { inline: true })
    setUploading(false)
  }
  return (
    <div className="inline-form">
      <p className="small muted">{t('horseProfile.firstIsMain')}</p>
      <div className="photos">
        {photos.map((p) => (
          <div key={p} className="photos__item">
            <img src={horsePhotoUrl(p)} alt={horse.name} loading="lazy" />
            <button type="button" className="photos__remove" aria-label={t('horses.removePhoto')} disabled={busy} onClick={() => run(() => removeHorsePhoto(horse.id, p), t('horses.photoRemoved'), null, { inline: true })}><Icon name="x" size={14} /></button>
          </div>
        ))}
        {uploading && <div className="photos__item photos__uploading" role="status"><span className="photos__spinner" aria-hidden="true" /><span>{t('edit.uploading')}</span></div>}
        {!uploading && photos.length < 6 && (
          <button type="button" className="photos__add" disabled={busy} onClick={() => input.current?.click()}><Icon name="plus" size={20} /><span>{t('horses.addPhoto')}</span></button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onFile} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="savebar">
        <button type="button" className="btn btn--save" disabled={uploading} onClick={onDone}>{t('edit.done')}</button>
      </div>
    </div>
  )
}

function BasicsForm({ horse, onDone, onCancel, onDirty }) {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy, error] = useSave()
  const sales = moduleOn(s, 'moduleSales')
  const statuses = ['school', 'boarded', ...(sales || horseStatus(horse || {}) === 'for_sale' ? ['for_sale'] : []), 'retired']
  const families = s.families.filter((fam) => !isDeletedFamily(fam))
  const [f, setF, dirty] = useFormState(horse ? { ...horse, status: horseStatus(horse) } : { name: '', status: 'school', active: true })
  useReportDirty(dirty, onDirty)
  const set = (patch) => setF({ ...f, ...patch })
  const save = (e) => {
    e.preventDefault()
    run(() => saveHorse(f), t('edit.horseSaved'), (res) => onDone(res.id), { inline: true })
  }
  return (
    <form className="inline-form" onSubmit={save}>
      <label className="field"><span>{t('schedule.name')}</span>
        <input className="input" value={f.name || ''} onChange={(e) => set({ name: e.target.value })} required autoFocus={!horse} />
      </label>
      <div className="field"><span>{t('horseProfile.category')}</span>
        <Segmented small value={f.status} onChange={(status) => set({ status })} options={statuses.map((st) => ({ value: st, label: t(`horses.status.${st}`) }))} />
      </div>
      {f.status === 'boarded' && (
        <label className="field"><span>{t('schedule.owner')}</span>
          <select className="input" value={f.ownerFamilyId || ''} onChange={(e) => set({ ownerFamilyId: e.target.value })} required>
            <option value="">—</option>
            {families.map((fam) => <option key={fam.id} value={fam.id}>{fam.name}</option>)}
          </select>
        </label>
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
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onCancel} label={horse ? null : t('edit.saveHorse')} />
    </form>
  )
}

function CareForm({ horse, care, onDone, onDirty }) {
  const { t } = useI18n()
  const [run, busy, error] = useSave()
  const [f, setF, dirty] = useFormState({
    feed: care?.feed?.length ? care.feed.map((x) => ({ ...x })) : [{ type: 'Alfalfa', kg: '' }],
    rationsPerDay: care?.rationsPerDay ?? 3, supplements: care?.supplements || '', notes: care?.notes || '',
  })
  useReportDirty(dirty, onDirty)
  const setLine = (i, patch) => setF({ ...f, feed: f.feed.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveHorseCare({ horseId: horse.id, ...f }), t('edit.horseSaved'), onDone, { inline: true }) }}>
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
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onDone} />
    </form>
  )
}

/** One health entry: opened from a tile (new, preset to its type) or from a history line (edit or delete). */
function HealthSheet({ horse, kind, entry, onClose }) {
  const { t } = useI18n()
  const toast = useToast()
  const [run, busy, error] = useSave()
  const today = todayKey()
  const [f, setF, dirty] = useFormState(entry
    ? { doneOn: entry.doneOn, nextDue: entry.nextDue || '', note: entry.note || '' }
    : { doneOn: today, nextDue: suggestNext(kind, today), note: '' })
  const [nextTouched, setNextTouched] = useState(!!entry)
  const [guard, dialog] = useDiscardGuard(dirty)
  const onDone = (e) => {
    const next = nextTouched ? f.nextDue : suggestNext(kind, e.target.value)
    setF({ ...f, doneOn: e.target.value, nextDue: next })
  }
  const save = (e) => {
    e.preventDefault()
    const action = entry ? () => updateHealth({ id: entry.id, ...f }) : () => addHealth({ horseId: horse.id, kind, ...f })
    run(action, t(entry ? 'edit.saved' : 'edit.registered'), onClose, { inline: true })
  }
  const remove = async () => {
    const res = await deleteHealth(entry.id)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('horseProfile.healthDeleted'))
    onClose()
  }
  return (
    <Sheet title={t(`horseProfile.kinds.${kind}`)} onClose={() => guard(onClose)}>
      <form className="inline-form" onSubmit={save}>
        <div className="grid2">
          <label className="field"><span>{t('horseProfile.doneOn')}</span>
            <input className="input" type="date" required max={today} value={f.doneOn} onChange={onDone} />
          </label>
          <label className="field"><span>{t('horseProfile.nextDue')}</span>
            <input className="input" type="date" min={f.doneOn} value={f.nextDue} onChange={(e) => { setNextTouched(true); setF({ ...f, nextDue: e.target.value }) }} />
          </label>
        </div>
        <label className="field"><span>{t('profit.note')}</span>
          <input className="input" placeholder={t('horseProfile.healthNotePh')} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--save btn--block btn--lg" disabled={busy}>{busy ? t('edit.saving') : t('edit.save')}</button>
        {entry && <button type="button" className="link link--danger center" onClick={remove}>{t('horseProfile.deleteHealth')}</button>}
      </form>
      {dialog}
    </Sheet>
  )
}

/** Management → Caballos → a horse: the finished profile, with one section at a time open for editing. */
export default function HorseProfile() {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
  const base = useBase()
  const navigate = useNavigate()
  const { id } = useParams()
  const [edit, setEdit] = useState(null) // 'basics' | 'photos' | 'care'
  const [dirty, setDirty] = useState(false)
  const [sheet, setSheet] = useState(null) // { kind, entry? } | 'owner'
  const [allHealth, setAllHealth] = useState(false)
  const [guard, dialog] = useDiscardGuard(dirty)
  const horse = id === 'nuevo' ? null : byId(s.horses, id)
  const listUrl = `${base}/direccion/horario?vista=caballos`
  const back = (
    <a href={listUrl} className="backlink" onClick={(e) => { e.preventDefault(); guard(() => navigate(listUrl)) }}>
      <Icon name="chevronLeft" size={18} /> {t('schedule.horses')}
    </a>
  )
  const open = (section) => guard(() => { setDirty(false); setEdit(section) })
  const close = () => { setDirty(false); setEdit(null) }

  if (!horse) {
    return (
      <div className="page">
        {back}
        <h1 className="page__title">{t(id === 'nuevo' ? 'schedule.addHorse' : 'horseProfile.notFound')}</h1>
        {id === 'nuevo' && (
          <div className="card">
            <BasicsForm onDirty={setDirty} onCancel={() => navigate(listUrl)}
              onDone={(newId) => { setDirty(false); navigate(newId ? `${base}/direccion/caballos/${newId}` : listUrl, { replace: true }) }} />
          </div>
        )}
        {dialog}
      </div>
    )
  }
  const status = horseStatus(horse)
  const age = horseAge(horse)
  const care = careOf(s, horse.id)
  const history = healthOf(s, horse.id)
  const owner = status === 'boarded' ? byId(s.families, horse.ownerFamilyId) : null
  const editable = status !== 'sold'
  const facts = [
    age != null ? t('horses.years', { n: age }) : null,
    horse.sex ? t(`horseProfile.sexes.${horse.sex}`) : null,
    horse.breed, horse.coat, horse.heightCm ? `${horse.heightCm} cm` : null,
  ].filter(Boolean)
  const editLink = (section) => editable && edit !== section && (
    <button type="button" className="link" onClick={() => open(section)}>{t('more.profile.edit')}</button>
  )
  const datos = [
    [t('horseProfile.category'), t(`horses.status.${status}`)],
    owner && [t('schedule.owner'), owner.name],
    horse.level && status !== 'boarded' && [t('horses.level'), t(`levels.${horse.level}`)],
    horse.birthYear && [t('horseProfile.birthYear'), horse.birthYear],
    horse.sex && [t('horseProfile.sex'), t(`horseProfile.sexes.${horse.sex}`)],
    horse.breed && [t('horses.breed'), horse.breed],
    horse.coat && [t('horseProfile.coat'), horse.coat],
    horse.heightCm && [t('horseProfile.height'), `${horse.heightCm}`],
    status === 'for_sale' && horse.salePrice && [t('horses.salePrice'), fmtMoney(horse.salePrice)],
    (status === 'school' || status === 'for_sale') && [t('horses.inClasses'), t(horse.active === false ? 'horseProfile.no' : 'horseProfile.yes')],
  ].filter(Boolean)

  return (
    <div className="page">
      {back}
      <div className="horsehero">
        <HorsePhoto horse={horse} size={112} />
        <div className="grow">
          <div className="row between gap-sm">
            <h1 className="page__title">{horse.name}</h1>
            {editable && edit !== 'basics' && <button type="button" className="btn btn--sm" onClick={() => { open('basics'); setTimeout(() => document.getElementById('datos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }}>{t('more.profile.edit')}</button>}
          </div>
          {facts.length > 0 && <p className="small muted">{facts.join(' · ')}</p>}
          <p className="row gap-sm wrap mt8">
            <Badge tone={status === 'for_sale' ? 'accent' : 'neutral'}>{t(`horses.status.${status}`)}</Badge>
            {horse.level && status !== 'boarded' && <Badge tone="neutral">{t(`levels.${horse.level}`)}</Badge>}
            {horse.active === false && status !== 'retired' && status !== 'sold' && <Badge tone="neutral">{t('schedule.off')}</Badge>}
          </p>
          {owner && (
            <p className="small muted mt8">
              {owner.name} · <button type="button" className="link" onClick={() => setSheet('owner')}>{t('horseProfile.ownerView')}</button>
            </p>
          )}
        </div>
      </div>

      <SectionTitle icon="horseHead" action={editLink('basics')}>{t('horseProfile.basics')}</SectionTitle>
      <div className={`card ${edit === 'basics' ? 'is-editing' : ''}`} id="datos">
        {edit === 'basics' ? <BasicsForm horse={horse} onDirty={setDirty} onDone={close} onCancel={close} /> : (
          <>
            <dl className="facts">{datos.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            {status === 'for_sale' && horse.description && <p className="small mt8">{horse.description}</p>}
          </>
        )}
      </div>

      <SectionTitle icon="camera" action={editLink('photos')}>{t('horses.photos')}</SectionTitle>
      <div className={`card ${edit === 'photos' ? 'is-editing' : ''}`}>
        {edit === 'photos' ? <PhotosEdit horse={horse} onDone={close} /> : <PhotosView horse={horse} />}
      </div>

      <SectionTitle icon="sprout" action={editLink('care')}>{t('horseProfile.ration')}</SectionTitle>
      <div className={`card card--ration ${edit === 'care' ? 'is-editing' : ''}`}>
        {edit === 'care' ? <CareForm horse={horse} care={care} onDirty={setDirty} onDone={close} /> : <DailyRation care={care} />}
      </div>

      <SectionTitle icon="shield">{t('horseProfile.health')}</SectionTitle>
      <div className="card">
        <NextDates last={lastByKind(s, horse.id)} onPick={editable ? (kind) => guard(() => { close(); setSheet({ kind }) }) : undefined} />
        {history.length > 0 && (
          <>
            <p className="card__label mt16">{t('horseProfile.history')}</p>
            <ul className="list">
              {(allHealth ? history : history.slice(0, 5)).map((x) => (
                <li key={x.id} className="list__row healthrow">
                  <button type="button" className="healthrow__tap" disabled={!editable} onClick={() => guard(() => { close(); setSheet({ kind: x.kind, entry: x }) })}>
                    <span className="list__title">{t(`horseProfile.kinds.${x.kind}`)} <span className="small muted">· {fmtDate(x.doneOn, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                    {(x.note || x.nextDue) && <span className="small muted">{[x.note, x.nextDue ? t('horseProfile.nextOn', { date: fmtDate(x.nextDue, { day: 'numeric', month: 'short' }) }) : null].filter(Boolean).join(' · ')}</span>}
                  </button>
                  {editable && <Icon name="chevronRight" size={16} />}
                </li>
              ))}
            </ul>
            {history.length > 5 && <button type="button" className="link mt8" onClick={() => setAllHealth(!allHealth)}>{allHealth ? t('summary.showLess') : t('summary.showAll', { n: history.length })}</button>}
          </>
        )}
      </div>

      {sheet?.kind && <HealthSheet key={sheet.entry?.id || sheet.kind} horse={horse} kind={sheet.kind} entry={sheet.entry} onClose={() => setSheet(null)} />}
      {sheet === 'owner' && (
        <Sheet title={t('horseProfile.ownerViewTitle', { name: owner?.name || '' })} onClose={() => setSheet(null)}>
          <div className="myhorse"><p className="card__label">{t('myHorse.title')}</p><MyHorseCard horse={horse} /></div>
        </Sheet>
      )}
      {dialog}
    </div>
  )
}
