import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { useStore, horsePhotoUrl, careOf, lastByKind, horseAge, visiblePhotos, addOwnHorsePhoto } from '../data/store.js'
import { useToast } from './Toast.jsx'
import { Icon } from './Icon.jsx'
import { daysBetween, todayKey } from '../lib/time.js'

const fmtKg = (n, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: 2 }).format(n)

/** Main photo, or a pictogram when there's none. */
export function HorsePhoto({ horse, size = 56 }) {
  const src = visiblePhotos(horse)[0]
  return src
    ? <img className="horse__photo" src={horsePhotoUrl(src)} alt={horse.name} width={size} height={size} style={{ width: size, height: size }} />
    : <span className="horse__photo horse__photo--empty" style={{ width: size, height: size }}><Icon name="horseHead" size={Math.round(size * 0.55)} /></span>
}

/** "Ración diaria": what each ration has, how many a day, and the day's total — big and clear for the groom. */
export function DailyRation({ care }) {
  const { t, lang } = useI18n()
  if (!care || (!care.feed?.length && !care.supplements && !care.notes)) return <p className="small muted">{t('horseProfile.noRation')}</p>
  const per = care.rationsPerDay || 1
  return (
    <div className="ration">
      {care.feed?.length > 0 && (
        <table className="ration__table">
          <thead><tr><th>{t('horseProfile.feed')}</th><th>{t('horseProfile.perRation')}</th><th>{t('horseProfile.perDay')}</th></tr></thead>
          <tbody>
            {care.feed.map((f) => (
              <tr key={f.type}><td>{f.type}</td><td>{fmtKg(f.kg, lang)} kg</td><td><strong>{fmtKg(f.kg * per, lang)} kg</strong></td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="ration__times"><Icon name="clock" size={16} /> {t('horseProfile.rationsDay', { n: per })}</p>
      {care.supplements && <p className="small"><strong>{t('horseProfile.supplements')}:</strong> {care.supplements}</p>}
      {care.notes && <p className="ration__note"><Icon name="alert" size={16} /> {care.notes}</p>}
    </div>
  )
}

/** Next vaccine, deworming, farrier and vet dates. Highlighted when due within 14 days or overdue. With `onPick`, each tile opens its form. */
export function NextDates({ last, kinds = ['vaccine', 'deworming', 'farrier', 'vet'], onPick }) {
  const { t, fmtDate } = useI18n()
  const today = todayKey()
  return (
    <ul className={`nextdates ${onPick ? 'nextdates--tap' : ''}`}>
      {kinds.map((k) => {
        const x = last[k]
        const due = x?.nextDue
        const days = due ? daysBetween(today, due) : null
        const tone = days == null ? '' : days < 0 ? 'is-late' : days <= 14 ? 'is-soon' : ''
        const body = (
          <>
            <span className="nextdates__kind">{t(`horseProfile.kinds.${k}`)}</span>
            <span className="nextdates__when">
              {due ? t(days < 0 ? 'horseProfile.overdue' : 'horseProfile.nextOn', { date: fmtDate(due, { day: 'numeric', month: 'short' }) })
                : x ? t('horseProfile.lastOn', { date: fmtDate(x.doneOn, { day: 'numeric', month: 'short' }) }) : '—'}
            </span>
            {onPick && !x && <span className="nextdates__hint">{t('horseProfile.tapToLog')}</span>}
          </>
        )
        return (
          <li key={k} className={tone}>
            {onPick ? <button type="button" className="nextdates__tap" onClick={() => onPick(k)}>{body}</button> : body}
          </li>
        )
      })}
    </ul>
  )
}

/** The horse's photos (the first is the main one). The owner family can add their own; the club can hide or delete them. */
export function HorseGallery({ horse, canAdd = false }) {
  const { t } = useI18n()
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(null)
  const photos = visiblePhotos(horse)
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const res = await addOwnHorsePhoto(horse.id, file)
    setBusy(false)
    toast(res.ok ? t('myHorse.photoAdded') : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }
  if (!photos.length && !canAdd) return null
  return (
    <div className="hgallery">
      <div className="hgallery__grid">
        {photos.map((p, i) => (
          <button key={p} type="button" className="hgallery__item" onClick={() => setOpen(i)} aria-label={t('myHorse.openPhoto', { n: i + 1, name: horse.name })}>
            <img src={horsePhotoUrl(p)} alt="" loading="lazy" />
          </button>
        ))}
        {busy && <div className="hgallery__item photos__uploading" role="status"><span className="photos__spinner" aria-hidden="true" /><span>{t('edit.uploading')}</span></div>}
        {canAdd && !busy && (horse.photos || []).length < 12 && (
          <button type="button" className="hgallery__add" onClick={() => input.current?.click()}><Icon name="camera" size={22} /><span>{t('myHorse.addPhoto')}</span></button>
        )}
      </div>
      {canAdd && <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onFile} />}
      {canAdd && <p className="small muted">{t('myHorse.photosHint')}</p>}
      {open != null && photos[open] && (
        <div className="hgallery__view" role="dialog" aria-modal="true" aria-label={horse.name} onClick={() => setOpen(null)}>
          <img src={horsePhotoUrl(photos[open])} alt={horse.name} />
          <button type="button" className="hgallery__close" aria-label={t('common.close')} onClick={() => setOpen(null)}><Icon name="x" size={22} /></button>
        </div>
      )}
    </div>
  )
}

/** What an owner family sees in Más → Mi caballo. */
export function MyHorseCard({ horse, split = false, canAdd = false }) {
  const { t } = useI18n()
  const s = useStore()
  const age = horseAge(horse)
  if (split) {
    // Desktop page: profile and ración on the left, the health dates on the right.
    return (
      <div className="fcols">
        <div className="fcol card">
          <div className="row gap">
            <HorsePhoto horse={horse} size={88} />
            <div className="grow">
              <p className="card__title">{horse.name}</p>
              <p className="small muted">{[age != null ? t('horses.years', { n: age }) : null, horse.breed, horse.coat].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <p className="card__label mt16">{t('horses.photos')}</p>
          <HorseGallery horse={horse} canAdd={canAdd} />
          <p className="card__label mt16">{t('horseProfile.ration')}</p>
          <DailyRation care={careOf(s, horse.id)} />
        </div>
        <div className="fcol card">
          <p className="card__label">{t('myHorse.next')}</p>
          <NextDates last={lastByKind(s, horse.id)} />
          <p className="small muted mt8">{t('myHorse.readOnly')}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="row gap">
        <HorsePhoto horse={horse} size={72} />
        <div className="grow">
          <p className="card__title">{horse.name}</p>
          <p className="small muted">{[age != null ? t('horses.years', { n: age }) : null, horse.breed, horse.coat].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="card__label mt16">{t('horses.photos')}</p>
      <HorseGallery horse={horse} canAdd={canAdd} />
      <p className="card__label mt16">{t('horseProfile.ration')}</p>
      <DailyRation care={careOf(s, horse.id)} />
      <p className="card__label mt16">{t('myHorse.next')}</p>
      <NextDates last={lastByKind(s, horse.id)} />
      <p className="small muted mt8">{t('myHorse.readOnly')}</p>
    </div>
  )
}
