import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, upcomingBookings, canCancel, cancelBooking,
  boardingStatus, CANCEL_WINDOW_HOURS, clubCancelledBookings,
} from '../../data/store.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, SectionTitle, waLink } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { TZ } from '../../lib/time.js'
import { BOARDING_MONTHLY } from '../../data/prices.js'
import { ReceiptBadge } from '../../components/Transfer.jsx'
import { concept } from '../../components/PaymentHistory.jsx'
import { ActivePlanCard } from './ActivePlan.jsx'
import { GreetingMark } from '../../components/GreetingMark.jsx'

function greetingKey() {
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date()))
  return h < 12 ? 'morning' : h < 19 ? 'afternoon' : 'evening'
}

export default function FamilyHome() {
  const { t, fmtDate, fmtTime, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const { riderId, riders } = useFamilyContext()
  const base = useBase()
  const rider = byId(s.riders, riderId)
  const family = byId(s.families, s.session.familyId)
  const upcoming = upcomingBookings(s, [riderId])
  const cancelled = clubCancelledBookings(s, riders.map((r) => r.id))
  const next = upcoming[0]
  const boarding = boardingStatus(s, family.id)
  // Transfer receipts: waiting, rejected, or approved in the last two weeks.
  const receipts = s.payments.filter((p) => p.familyId === family.id && p.receiptStatus &&
    (p.status === 'pending' || (p.reviewedAt && Date.now() - new Date(p.reviewedAt).getTime() < 14 * 864e5)))

  const onCancel = async (b) => {
    const res = await cancelBooking(b.id)
    toast(res.ok ? t('toasts.cancelled') : t(`errors.${res.code}`, { hours: CANCEL_WINDOW_HOURS }), res.ok ? 'success' : 'error')
  }

  return (
    <div className="page">
      <div className="hello">
        <p className="hello__eyebrow">{t(`family.greeting.${greetingKey()}`)}</p>
        <h1>{family.contact.split(' ')[0]} <GreetingMark time={greetingKey()} /></h1>
      </div>
      <RiderPicker />
      <ActivePlanCard riderId={riderId} />

      {cancelled.map((b) => {
        const reason = (s.cancellations || []).find((c) => c.slotId === b.slotId && c.date === b.date)?.reason
        return (
          <div key={b.id} className="notice notice--alert" role="status">
            <Icon name="alert" size={18} />
            <span>
              <strong>{t('schedule.cancelledTitle')}</strong> · {byId(s.riders, b.riderId)?.name} · {fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'short' })} {fmtTime(b.slot.time)}
              <br /><span className="small">{reason ? `${reason} · ` : ''}{t('schedule.backToPlan')}</span>
            </span>
          </div>
        )
      })}

      <SectionTitle icon="calendar">{t('family.home.nextClass')}</SectionTitle>
      {next ? (
        <NextClassCard booking={next} onCancel={onCancel} s={s} rider={rider} />
      ) : (
        <Empty icon="horseHead" title={t('family.home.noClassTitle', { name: rider.name })}>
          <Link to={`${base}/familia/reservar`} className="btn btn--primary"><Icon name="calendar" size={18} /> {t('family.home.bookNow')}</Link>
        </Empty>
      )}
      {upcoming.length > 1 && (
        <p className="muted small">{t('family.home.moreBooked', { count: upcoming.length - 1 })}</p>
      )}

      {receipts.length > 0 && (
        <>
          <SectionTitle icon="receipt">{t('receipt.homeTitle')}</SectionTitle>
          <ul className="list card">
            {receipts.map((p) => (
              <li key={p.id} className="list__row list__row--stack">
                <div className="row gap">
                  <span className="grow">
                    <span className="list__title">{concept(t, p)}{p.meta?.riderId ? ` · ${byId(s.riders, p.meta.riderId)?.name}` : ''}</span>
                    <span className="small muted"> · {fmtMoney(p.amount)}</span>
                  </span>
                  <ReceiptBadge status={p.receiptStatus} />
                </div>
                {p.receiptStatus === 'rejected' && (
                  <p className="small transfer__note"><Icon name="alert" size={14} /> {p.receiptNote} · <Link to={`${base}/familia/plan`} className="link">{t('receipt.uploadAgain')}</Link></p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle icon="saddle">{t('family.home.boarding')}</SectionTitle>
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
        <Empty icon="saddle" title={t('boarding.noneTitle')}>
          <a className="btn btn--outline" href={waLink(t('boarding.waText'))} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> {t('boarding.ask')}</a>
        </Empty>
      )}
      {boarding.some((b) => b.status !== 'paid') && (
        <Link to={`${base}/familia/plan`} className="btn btn--outline btn--block">{t('boarding.goPay')}</Link>
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
      <Icon name="horseHead" size={84} className="nextclass__art" />
      <div className="row between">
        <Badge tone="accent">{t(`levels.${slot.level}`)}</Badge>
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
