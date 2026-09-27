import { useI18n } from '../i18n/I18nProvider.jsx'
import { useStore, horsePhotoUrl, careOf, lastByKind, horseAge } from '../data/store.js'
import { Icon } from './Icon.jsx'
import { daysBetween, todayKey } from '../lib/time.js'

const fmtKg = (n, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: 2 }).format(n)

/** Main photo, or a pictogram when there's none. */
export function HorsePhoto({ horse, size = 56 }) {
  const src = horse.photos?.[0]
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

/** Next vaccine, deworming, farrier and vet dates. Coral when due within 14 days or overdue. With `onPick`, each tile opens its form. */
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

/** What an owner family sees in Más → Mi caballo. */
export function MyHorseCard({ horse }) {
  const { t } = useI18n()
  const s = useStore()
  const age = horseAge(horse)
  return (
    <div className="card">
      <div className="row gap">
        <HorsePhoto horse={horse} size={72} />
        <div className="grow">
          <p className="card__title">{horse.name}</p>
          <p className="small muted">{[age != null ? t('horses.years', { n: age }) : null, horse.breed, horse.coat].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="card__label mt16">{t('horseProfile.ration')}</p>
      <DailyRation care={careOf(s, horse.id)} />
      <p className="card__label mt16">{t('myHorse.next')}</p>
      <NextDates last={lastByKind(s, horse.id)} />
      <p className="small muted mt8">{t('myHorse.readOnly')}</p>
    </div>
  )
}
