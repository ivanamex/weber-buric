import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, familyRiders, getPlan, registerCamp, bookRental, campTaken,
} from '../../data/store.js'
import { FROM_PRICES, RENTAL_PER_HOUR, RENTAL_HOURS } from '../../data/prices.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented, waLink } from '../../components/ui.jsx'
import { LangToggle } from '../../components/LangToggle.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ResetDemoRow } from '../../components/ResetDemoRow.jsx'
import { todayKey, addDays, hoursUntil } from '../../lib/time.js'

const RENTAL_TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '16:00', '17:00']
const QUOTES = [
  { key: 'birthday', icon: 'cake' },
  { key: 'coaching', icon: 'trophy' },
  { key: 'earlyStim', icon: 'sprout' },
]

export default function FamilyMore() {
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
  const [rental, setRental] = useState({ date: firstRentalDate, time: '08:00', hours: 1, horseId: s.horses.find((h) => h.type === 'school')?.id })
  const schoolHorses = s.horses.filter((h) => h.type === 'school' && h.active !== false)
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
  const soon = () => toast(t('toasts.soon'), 'info')

  return (
    <div className="page">
      <h1 className="page__title">{t('more.title')}</h1>

      <SectionTitle>{t('more.events')}</SectionTitle>
      {camp && (
        <div className="card card--camp">
          <div className="row gap">
            <span className="tile-icon tile-icon--gold"><Icon name="tent" /></span>
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
                <Badge tone={pay?.status === 'paid' ? 'success' : 'alert'}>{t(pay?.status === 'paid' ? 'more.camp.depositPaid' : 'more.camp.depositPending')}</Badge>
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

      <SectionTitle>{t('more.rental.title')}</SectionTitle>
      <form className="card rental" onSubmit={onRental}>
        <p className="small muted">{t('more.rental.text', { price: fmtMoney(RENTAL_PER_HOUR) })}</p>
        <div className="grid2">
          <label className="field">
            <span>{t('more.rental.date')}</span>
            <input className="input" type="date" min={firstRentalDate} value={rental.date} onChange={(e) => setRental({ ...rental, date: e.target.value })} required />
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
                <Icon name="route" size={16} />
                <span className="grow">{fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(r.time)} · {byId(s.horses, r.horseId)?.name}</span>
                <span>{t('more.rental.hours', { n: r.hours })}</span>
              </li>
            ))}
          </ul>
        )}
      </form>

      <SectionTitle action={<button type="button" className="link" onClick={soon}>{t('more.profile.edit')}</button>}>{t('more.profile.title')}</SectionTitle>
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
                    {t('more.profile.age', { n: r.age })} · {t(`levels.${r.level}`)}{horse ? ` · ${horse.name}` : ''}
                  </p>
                </div>
                <Badge tone="neutral">{plan ? t('plan.shortUsed', { used: plan.used, total: plan.total }) : t('plan.none')}</Badge>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn btn--outline btn--block mt12" onClick={() => toast(t('toasts.askClub'), 'info')}><Icon name="plus" size={18} /> {t('more.profile.addRider')}</button>
      </div>

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
        <ResetDemoRow />
      </div>
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}
