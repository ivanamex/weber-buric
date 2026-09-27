import { useI18n } from '../i18n/I18nProvider.jsx'
import { horsePhotoUrl } from '../data/store.js'
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

/** Next vaccine, deworming, farrier and vet dates, with overdue / soon marks. */
export function NextDates({ last, kinds = ['vaccine', 'deworming', 'farrier', 'vet'] }) {
  const { t, fmtDate } = useI18n()
  const today = todayKey()
  return (
    <ul className="nextdates">
      {kinds.map((k) => {
        const x = last[k]
        const due = x?.nextDue
        const days = due ? daysBetween(today, due) : null
        const tone = days == null ? '' : days < 0 ? 'is-late' : days <= 14 ? 'is-soon' : ''
        return (
          <li key={k} className={tone}>
            <span className="nextdates__kind">{t(`horseProfile.kinds.${k}`)}</span>
            <span className="nextdates__when">
              {due ? t(days < 0 ? 'horseProfile.overdue' : 'horseProfile.nextOn', { date: fmtDate(due, { day: 'numeric', month: 'short' }) })
                : x ? t('horseProfile.lastOn', { date: fmtDate(x.doneOn, { day: 'numeric', month: 'short' }) }) : '—'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
