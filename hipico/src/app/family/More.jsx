import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { DateInput } from '../../components/DateInput.jsx'
import {
  useStore, byId, familyRiders, getPlan, registerCamp, bookRental, campTaken, setPassword,
  horseStatus,
} from '../../data/store.js'
import { FROM_PRICES, RENTAL_PER_HOUR, RENTAL_HOURS } from '../../data/prices.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented, waLink } from '../../components/ui.jsx'
import { LangToggle } from '../../components/LangToggle.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ResetDemoRow } from '../../components/ResetDemoRow.jsx'
import { MyHorseCard } from '../../components/HorseCare.jsx'
import { InstallButtons } from '../../components/Install.jsx'
import { Navigate } from 'react-router-dom'
import { useBase } from '../Backend.jsx'
import { todayKey, addDays, hoursUntil } from '../../lib/time.js'
import { StatusPill, LevelPill } from '../../components/Colors.jsx'

const RENTAL_TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '16:00', '17:00']
const QUOTES = [
  { key: 'birthday', icon: 'cake' },
  { key: 'coaching', icon: 'trophy' },
  { key: 'earlyStim', icon: 'sprout' },
]

/** Más → Mi caballo (only for a family with a boarded horse). `split`: profile and ración next to the health dates (desktop). */
export function MyHorseSection({ split = false }) {
  const { t } = useI18n()
  const s = useStore()
  const myHorses = s.horses.filter((h) => h.ownerFamilyId === s.session.familyId && h.status !== 'sold')
  return myHorses.map((h) => (
    <section key={h.id} className="myhorse" aria-label={t('myHorse.title')}>
      {/* On its own page the title is already "Mi caballo"; with several horses, each shows its name. */}
      {!split ? <SectionTitle icon="horseHead">{t('myHorse.title')}</SectionTitle> : myHorses.length > 1 && <SectionTitle icon="horseHead">{h.name}</SectionTitle>}
      <MyHorseCard horse={h} split={split} canAdd />
    </section>
  ))
}

/** Eventos: camp, quotes (birthdays, coaching, early stimulation) and horse rental. */
export function EventsSection() {
  const { t, fmtDate, fmtMoney, fmtTime } = useI18n()
  const s = useStore()
  const toast = useToast()
  const familyId = s.session.familyId
  const family = byId(s.families, familyId)
  const riders = familyRiders(s, familyId)
  const camp = s.events.find((e) => e.type === 'camp')
  const campRegs = s.campRegistrations.filter((r) => r.eventId === camp?.id)
  const [campRider, setCampRider] = useState(riders[0]?.id)
  const firstRentalDate = addDays(todayKey(), 1)
  // Only school horses that ride (never one for sale or retired), as book_rental() checks.
  const schoolHorses = s.horses.filter((h) => horseStatus(h) === 'school' && h.active !== false)
  const [rental, setRental] = useState({ date: firstRentalDate, time: '08:00', hours: 1, horseId: schoolHorses[0]?.id })
  const myRentals = s.rentals
    .filter((r) => r.familyId === familyId && hoursUntil(r.date, r.time) > 0)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const onCamp = async () => {
    const res = await registerCamp({ eventId: camp.id, riderId: campRider })
    const name = byId(s.riders, campRider)?.name
    toast(res.ok ? t('toasts.campRegistered', { name, amount: fmtMoney(camp.deposit) }) : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }
  const onRental = async (e) => {
    e.preventDefault()
    const res = await bookRental({ familyId, ...rental })
    toast(res.ok
      ? t('toasts.rentalBooked', { horse: byId(s.horses, rental.horseId).name, date: fmtDate(rental.date, { day: 'numeric', month: 'short' }), time: fmtTime(rental.time) })
      : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }
  return (
    <>
      <SectionTitle icon="balloons">{t('more.events')}</SectionTitle>
      {camp && (
        <div className="card card--camp">
          <div className="row gap">
            <span className="tile-icon tile-icon--accent"><Icon name="balloons" /></span>
            <div className="grow">
              <p className="card__title">{t('more.camp.title')}</p>
              <p className="small muted">
                {fmtDate(camp.startDate, { day: 'numeric', month: 'short' })} – {fmtDate(camp.endDate, { day: 'numeric', month: 'short', year: 'numeric' })} · {t('more.camp.ages', { ages: camp.ages })}
              </p>
            </div>
          </div>
          <p className="small mt8">{t('more.camp.text')}</p>
          <div className="row between mt12">
            <span className="small">{t('more.camp.price')} <strong>{fmtMoney(camp.price)}</strong></span>
            <span className="small">{t('more.camp.deposit')} <strong>{fmtMoney(camp.deposit)}</strong></span>
          </div>
          <p className="small muted mt8">{t('more.camp.spots', { n: Math.max(camp.capacity - campTaken(s, camp.id), 0) })}</p>
          <div className="camp__form">
            <select className="input" value={campRider} onChange={(e) => setCampRider(e.target.value)} aria-label={t('family.rider')}>
              {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button type="button" className="btn btn--primary" onClick={onCamp}>{t('more.camp.register')}</button>
          </div>
          {riders.filter((r) => campRegs.some((c) => c.riderId === r.id)).map((r) => {
            const reg = campRegs.find((c) => c.riderId === r.id)
            const pay = byId(s.payments, reg.paymentId)
            return (
              <div key={r.id} className="row between small mt8">
                <span><Icon name="check" size={14} /> {t('more.camp.registered', { name: r.name })}</span>
                <StatusPill status={pay?.status === 'paid' ? 'paid' : 'pending'}>{t(pay?.status === 'paid' ? 'more.camp.depositPaid' : 'more.camp.depositPending')}</StatusPill>
              </div>
            )
          })}
        </div>
      )}

      <div className="quotes">
        {QUOTES.map((q) => (
          <div key={q.key} className="card quote">
            <span className="tile-icon"><Icon name={q.icon} /></span>
            <div className="grow">
              <p className="card__title">{t(`more.quotes.${q.key}.title`)}</p>
              <p className="small muted">{t(`more.quotes.${q.key}.text`)} · {t('common.from')} {fmtMoney(FROM_PRICES[q.key])}</p>
            </div>
            <a className="btn btn--whatsapp btn--sm" target="_blank" rel="noopener noreferrer"
              href={waLink(t('more.quotes.waText', { service: t(`more.quotes.${q.key}.title`), family: family.name }))}>
              <Icon name="whatsapp" size={18} /> {t('more.quotes.quote')}
            </a>
          </div>
        ))}
      </div>

      <SectionTitle icon="horseHead">{t('more.rental.title')}</SectionTitle>
      <form className="card rental" onSubmit={onRental}>
        <p className="small muted">{t('more.rental.text', { price: fmtMoney(RENTAL_PER_HOUR) })}</p>
        <div className="grid2">
          <label className="field">
            <span>{t('more.rental.date')}</span>
            <DateInput min={firstRentalDate} value={rental.date} onChange={(e) => setRental({ ...rental, date: e.target.value })} required />
          </label>
          <label className="field">
            <span>{t('more.rental.time')}</span>
            <select className="input" value={rental.time} onChange={(e) => setRental({ ...rental, time: e.target.value })}>
              {RENTAL_TIMES.map((tm) => <option key={tm} value={tm}>{fmtTime(tm)}</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <span>{t('more.rental.duration')}</span>
          <Segmented small value={rental.hours} onChange={(h) => setRental({ ...rental, hours: h })}
            options={RENTAL_HOURS.map((h) => ({ value: h, label: t('more.rental.hours', { n: h }) }))} />
        </div>
        <div className="field">
          <span>{t('more.rental.horse')}</span>
          <div className="chips">
            {schoolHorses.map((h) => (
              <button key={h.id} type="button" className={`chip ${rental.horseId === h.id ? 'is-active' : ''}`} onClick={() => setRental({ ...rental, horseId: h.id })}>
                <Icon name="shoe" size={14} /> {h.name}
              </button>
            ))}
          </div>
        </div>
        <div className="row between mt12">
          <span>{t('more.rental.total')} <strong>{fmtMoney(RENTAL_PER_HOUR * rental.hours)}</strong></span>
          <button type="submit" className="btn btn--primary">{t('more.rental.submit')}</button>
        </div>
        {myRentals.length > 0 && (
          <ul className="list mt12">
            {myRentals.map((r) => (
              <li key={r.id} className="list__row small">
                <Icon name="horseHead" size={16} />
                <span className="grow">{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(r.time)} · {byId(s.horses, r.horseId)?.name}</span>
                <span>{t('more.rental.hours', { n: r.hours })}</span>
              </li>
            ))}
          </ul>
        )}
      </form>

    </>
  )
}

/** Perfil y jinetes. */
export function ProfileSection() {
  const { t } = useI18n()
  const s = useStore()
  const toast = useToast()
  const familyId = s.session.familyId
  const family = byId(s.families, familyId)
  const riders = familyRiders(s, familyId)
  const soon = () => toast(t('toasts.soon'), 'info')
  return (
    <>
      <SectionTitle action={<button type="button" className="link" onClick={soon} >{t('more.profile.edit')}</button>} icon="family">{t('more.profile.title')}</SectionTitle>
      <div className="card">
        <div className="row gap">
          <span className="avatar">{family.contact[0]}</span>
          <div className="grow">
            <p className="card__title">{family.contact}</p>
            <p className="small muted">{family.name} · {family.phone}</p>
          </div>
        </div>
        <p className="card__label mt16">{t('more.profile.riders')}</p>
        <ul className="list">
          {riders.map((r) => {
            const plan = getPlan(s, r.id)
            const horse = r.horseId ? byId(s.horses, r.horseId) : null
            return (
              <li key={r.id} className="list__row">
                <span className="chip__avatar chip__avatar--lg">{r.name[0]}</span>
                <div className="grow">
                  <p className="list__title">{r.name}</p>
                  <p className="small muted">
                    {t('more.profile.age', { n: r.age })} · <LevelPill level={r.level} />{horse ? ` · ${horse.name}` : ''}
                  </p>
                </div>
                <Badge tone="neutral">{plan ? t('plan.shortUsed', { used: plan.used, total: plan.total }) : t('plan.none')}</Badge>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn btn--outline btn--block mt12" onClick={() => toast(t('toasts.askClub'), 'info')}><Icon name="plus" size={18} /> {t('more.profile.addRider')}</button>
      </div>

    </>
  )
}

/** Ajustes: language, notifications, password, demo reset. */
export function SettingsSection() {
  const { t } = useI18n()
  const s = useStore()
  const toast = useToast()
  const family = byId(s.families, s.session.familyId)
  const soon = () => toast(t('toasts.soon'), 'info')
  return (
    <>
      <SectionTitle>{t('more.settings')}</SectionTitle>
      <div className="card list">
        <div className="list__row">
          <span className="grow">{t('common.language')}</span>
          <LangToggle />
        </div>
        <div className="list__row">
          <span className="grow">{t('more.notifications')}</span>
          <button type="button" className="link" onClick={soon}>{t('common.soon')}</button>
        </div>
        <PasswordRow has={s.hasPassword} email={family.email || s.session.email} />
        <ResetDemoRow />
      </div>
    </>
  )
}

/** Más (phones): everything above on one page. */
export default function FamilyMore() {
  const { t } = useI18n()
  return (
    <div className="page">
      <h1 className="page__title">{t('more.title')}</h1>
      <MyHorseSection />
      <EventsSection />
      <ProfileSection />
      <SettingsSection />
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}

/** One section as its own page (desktop sidebar: Mi caballo, Eventos, Perfil, Ajustes, Instalar app). */
export function FamilySectionPage({ section }) {
  const { t } = useI18n()
  const s = useStore()
  const base = useBase()
  if (section === 'caballo' && !s.horses.some((h) => h.ownerFamilyId === s.session.familyId && h.status !== 'sold')) return <Navigate to={`${base}/familia`} replace />
  const title = { caballo: 'myHorse.title', eventos: 'more.events', perfil: 'more.profile.title', ajustes: 'more.settings', instalar: 'install.pageTitle' }[section]
  return (
    <div className="page">
      <h1 className="page__title">{t(title)}</h1>
      {section === 'caballo' && <MyHorseSection split />}
      {section === 'eventos' && <EventsSection />}
      {section === 'perfil' && <ProfileSection />}
      {section === 'ajustes' && <SettingsSection />}
      {section === 'instalar' && (
        <div className="card">
          <p className="small muted">{t('install.promptText')}</p>
          <InstallButtons />
        </div>
      )}
      {section === 'eventos' && <p className="sample-note">{t('common.samplePrices')}</p>}
    </div>
  )
}

/** Optional password: sign in on any phone with email + password instead of waiting for the code. */
function PasswordRow({ has, email }) {
  const { t } = useI18n()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await setPassword(value)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('more.password.saved'))
    setValue('')
    setOpen(false)
  }
  return (
    <div className="list__row list__row--stack">
      <div className="row gap">
        <span className="grow">{t('more.password.title')}{has && <span className="small muted"> · {t('more.password.set')}</span>}</span>
        <button type="button" className="link" onClick={() => setOpen(!open)}>{t(has ? 'more.password.change' : 'more.password.create')}</button>
      </div>
      {open && (
        <form className="pwform" onSubmit={onSave}>
          <p className="small muted">{t('more.password.hint')}</p>
          <input type="email" autoComplete="username" value={email || ''} readOnly hidden />
          <label className="field" htmlFor="new-password"><span>{t('more.password.new')}</span>
            <input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8}
              value={value} onChange={(e) => setValue(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? '…' : t('more.password.save')}</button>
        </form>
      )}
    </div>
  )
}
