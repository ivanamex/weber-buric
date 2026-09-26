import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, getPlan, planRemaining, planExpiry, upcomingBookings, canCancel, cancelBooking,
  boardingStatus, CANCEL_WINDOW_HOURS,
} from '../../data/store.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Progress, SectionTitle } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { TZ } from '../../lib/time.js'
import { BOARDING_MONTHLY } from '../../data/prices.js'

function greetingKey() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date()))
  return h < 12 ? 'morning' : h < 19 ? 'afternoon' : 'evening'
}

export default function FamilyHome() {
  const { t, fmtDate, fmtTime, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const { riderId } = useFamilyContext()
  const rider = byId(s.riders, riderId)
  const family = byId(s.families, s.session.familyId)
  const plan = getPlan(s, riderId)
  const upcoming = upcomingBookings(s, [riderId])
  const next = upcoming[0]
  const boarding = boardingStatus(s, family.id)

  const onCancel = (b) => {
    const res = cancelBooking(b.id)
    toast(res.ok ? t('toasts.cancelled') : t(`errors.${res.code}`, { hours: CANCEL_WINDOW_HOURS }), res.ok ? 'success' : 'error')
  }

  return (
    <div className="page">
      <div className="hello">
        <p className="hello__eyebrow">{t(`family.greeting.${greetingKey()}`)}</p>
        <h1>{family.contact.split(' ')[0]} <span aria-hidden="true">👋</span></h1>
      </div>
      <RiderPicker />

      <SectionTitle>{t('family.home.nextClass')}</SectionTitle>
      {next ? (
        <NextClassCard booking={next} onCancel={onCancel} s={s} rider={rider} />
      ) : (
        <Empty icon="calendar" title={t('family.home.noClassTitle', { name: rider.name })} text={t('family.home.noClassText')}>
          <Link to="/app/familia/reservar" className="btn btn--primary">{t('family.home.bookNow')}</Link>
        </Empty>
      )}
      {upcoming.length > 1 && (
        <p className="muted small">{t('family.home.moreBooked', { count: upcoming.length - 1 })}</p>
      )}

      <SectionTitle action={<Link to="/app/familia/plan" className="link">{t('family.home.seePlan')}</Link>}>
        {t('family.home.monthlyPlan')}
      </SectionTitle>
      {plan ? (
        <div className="card">
          <div className="row between">
            <div>
              <p className="card__label">{t('plan.classesPlan', { n: plan.total })} · {rider.name}</p>
              <p className="bignum">{t('plan.usedOf', { used: plan.used, total: plan.total })}</p>
            </div>
            {plan.paid ? <Badge tone="success">{t('plan.paid')}</Badge> : <Badge tone="alert">{t('plan.pendingPay')}</Badge>}
          </div>
          <Progress value={plan.used} max={plan.total} tone="gold" />
          <div className="row between small muted mt8">
            <span>{t('plan.remaining', { n: planRemaining(plan) })}</span>
            <span>{t('plan.expires', { date: fmtDate(planExpiry(plan), { day: 'numeric', month: 'short' }) })}</span>
          </div>
        </div>
      ) : (
        <Empty icon="plan" title={t('plan.noPlanTitle')} text={t('plan.noPlanText')}>
          <Link to="/app/familia/plan" className="btn btn--primary">{t('plan.choose')}</Link>
        </Empty>
      )}

      <SectionTitle>{t('family.home.boarding')}</SectionTitle>
      {boarding.length ? boarding.map((b) => (
        <div className="card row gap" key={b.horse.id}>
          <span className="tile-icon"><Icon name="barn" /></span>
          <div className="grow">
            <p className="card__title">{b.horse.name}</p>
            <p className="small muted">{t('boarding.monthOf', { month: fmtDate(`${b.month}-01`, { month: 'long' }) })} · {fmtMoney(b.payment?.amount ?? BOARDING_MONTHLY)}</p>
          </div>
          <Badge tone={b.status === 'paid' ? 'success' : 'alert'}>{t(`boarding.status.${b.status}`)}</Badge>
        </div>
      )) : (
        <Empty icon="barn" title={t('boarding.noneTitle')} text={t('boarding.noneText')} />
      )}
      {boarding.some((b) => b.status !== 'paid') && (
        <Link to="/app/familia/plan" className="btn btn--outline btn--block">{t('boarding.goPay')}</Link>
      )}
    </div>
  )

}

function NextClassCard({ booking, onCancel, s, rider }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const slot = booking.slot
  const instructor = byId(s.instructors, slot.instructorId)
  const horse = byId(s.horses, booking.horseId)
  const cancellable = canCancel(booking, slot)
  return (
    <div className="card card--green nextclass">
      <div className="row between">
        <Badge tone="gold">{t(`levels.${slot.level}`)}</Badge>
        <span className="small">{rider.name}</span>
      </div>
      <p className="nextclass__date">{fmtDate(booking.date)}</p>
      <p className="nextclass__time">{fmtTime(slot.time)} · {t(`disciplines.${slot.discipline}`)}</p>
      <ul className="nextclass__meta">
        <li><Icon name="user" size={16} /> {instructor.name}</li>
        <li><Icon name="shoe" size={16} /> {horse?.name}</li>
        <li><Icon name="home" size={16} /> {t(`arenas.${slot.arena}`)}</li>
      </ul>
      {cancellable ? (
        <button type="button" className="btn btn--ghost-light btn--sm" onClick={() => onCancel(booking)}>
          {t('family.home.cancel')}
        </button>
      ) : (
        <p className="small nextclass__note"><Icon name="info" size={14} /> {t('family.home.cancelClosed', { hours: CANCEL_WINDOW_HOURS })}</p>
      )}
    </div>
  )
}
