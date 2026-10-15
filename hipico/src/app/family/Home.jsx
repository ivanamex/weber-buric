import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, upcomingBookings, canCancel,
  boardingStatus, CANCEL_WINDOW_HOURS, clubCancelledBookings, familyDueSoon, movedBookings,
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
import { UpcomingList, CancelClassButton } from './Upcoming.jsx'
import { GreetingMark } from '../../components/GreetingMark.jsx'
import { getPlan, planRenewal } from '../../data/store.js'
import { useDesktop } from '../../components/Desk.jsx'
import { StatusPill, LevelPill, HorseTag, RiderDot, riderColor, HorseAvatar } from '../../components/Colors.jsx'

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
  const moved = movedBookings(s, riders.map((r) => r.id))
  const next = upcoming[0]
  const boarding = boardingStatus(s, family.id)
  // Transfer receipts: waiting, rejected, or approved in the last two weeks.
  const receipts = s.payments.filter((p) => p.familyId === family.id && p.receiptStatus &&
    (p.status === 'pending' || (p.reviewedAt && Date.now() - new Date(p.reviewedAt).getTime() < 14 * 864e5)))

  const dueSoon = familyDueSoon(s, family.id)
  const desk = useDesktop()



  const planBlock = (
    <>
      <ActivePlanCard riderId={riderId} />

    </>
  )
  const dueBlock = (
    <>
      {dueSoon.length > 0 && (
        <section className="card duecard c-terracotta edge-c" aria-label={t('familyDue.title')}>
          <p className="card__label">{t('familyDue.title')}</p>
          <ul className="list">
            {dueSoon.map((p) => (
              <li key={p.id} className="list__row">
                <div className="grow">
                  <p className="list__title">{concept(t, p)}{p.meta?.riderId ? ` · ${byId(s.riders, p.meta.riderId)?.name}` : ''}{p.meta?.horseId ? ` · ${byId(s.horses, p.meta.horseId)?.name}` : ''}</p>
                  <p className="small"><StatusPill status={p.state === 'overdue' ? 'overdue' : p.state === 'today' ? 'pending' : 'neutral'}>{t(`familyDue.${p.state}`, { date: fmtDate(p.due, { day: 'numeric', month: 'short' }) })}</StatusPill></p>
                </div>
                <strong>{fmtMoney(p.amount)}</strong>
              </li>
            ))}
          </ul>
          <Link to={`${base}/familia/plan?pagar=${dueSoon[0].id}`} className="btn btn--primary btn--block">{t('familyDue.pay')}</Link>
          <p className="small muted center">{t('familyDue.atClub')}</p>
        </section>
      )}

    </>
  )
  const cancelledBlock = (
    <>
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
      {moved.map((b) => (
        <div key={`m${b.id}`} className="notice notice--info" role="status">
          <Icon name="clock" size={18} />
          <span>
            <strong>{t('schedule.movedTitle')}</strong> · {byId(s.riders, b.riderId)?.name} · {fmtDate(b.date, { weekday: 'short', day: 'numeric', month: 'short' })}
            <br /><span className="small">{t('schedule.movedText', { time: fmtTime(b.slot.time), before: fmtTime(b.movedFrom) })}</span>
          </span>
        </div>
      ))}
    </>
  )
  const nextBlock = (
    <>
      {next ? (
        <NextClassCard booking={next} s={s} rider={rider} />
      ) : (
        <><SectionTitle icon="calendar">{t('family.home.nextClass')}</SectionTitle><Empty icon="horseHead" title={t('family.home.noClassTitle', { name: rider.name })}>
          <Link to={`${base}/familia/reservar`} className="btn btn--primary"><Icon name="calendar" size={18} /> {t('family.home.bookNow')}</Link>
        </Empty></>
      )}
    </>
  )
  const upcomingBlock = (
    <>
      {upcoming.length > 1 && (
        <>
          <SectionTitle icon="calendar">{t('family.home.upcoming')}</SectionTitle>
          <UpcomingList bookings={upcoming.slice(1)} />
        </>
      )}

    </>
  )
  const receiptsBlock = (
    <>
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

    </>
  )
  // The pensión as a card: the horse's photo, "Pensión de octubre · $9,500", the status and "Pagar pensión" inside it.
  const boardingBlock = (
    <>
      <SectionTitle icon="saddle">{t('family.home.boarding')}</SectionTitle>
      {boarding.length ? boarding.map((b) => (
        <section className="card boardcard c-sage edge-c" key={b.horse.id} aria-label={t('family.home.boarding')}>
          <div className="boardcard__row">
            <HorseAvatar horse={b.horse} size={56} />
            <div className="grow">
              <p className="card__title">{b.horse.name}</p>
              <p className="small muted">{t('boarding.monthOf', { month: fmtDate(`${b.month}-01`, { month: 'long' }) })} · {fmtMoney(b.payment?.amount ?? BOARDING_MONTHLY)}</p>
            </div>
            <StatusPill status={b.status === 'paid' ? 'paid' : 'pending'}>{t(`boarding.status.${b.status}`)}</StatusPill>
          </div>
          {b.status !== 'paid' && (
            <div className="boardcard__actions">
              <Link to={`${base}/familia/plan${b.payment ? `?pagar=${b.payment.id}` : ''}`} className="btn btn--primary btn--block"><Icon name="receipt" size={18} /> {t('boarding.payInside')}</Link>
              <span className="small muted">{t('familyDue.atClub')}</span>
            </div>
          )}
        </section>
      )) : (
        <Empty icon="saddle" title={t('boarding.noneTitle')}>
          <a className="btn btn--outline" href={waLink(t('boarding.waText'))} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> {t('boarding.ask')}</a>
        </Empty>
      )}
    </>
  )

  // A slim band: only the greeting and the rider chips on one row. The plan card sits under it, light, on its own.
  const head = (
    <section className="homehead homehead--slim">
      <div className="hello">
        <p className="hello__eyebrow">{t(`family.greeting.${greetingKey()}`)}</p>
        <h1>{family.contact.split(' ')[0]} <GreetingMark time={greetingKey()} /></h1>
      </div>
      <RiderPicker />
    </section>
  )

  const tiles = <QuickTiles s={s} rider={rider} familyId={family.id} dueCount={dueSoon.length} />
  // Desktop: the band, then the plan (7/12) and the next class (5/12) side by side, then payments due and the rest in a
  // 2-column grid filled from the left (an odd last card spans the width: no lone block in a corner), the quick tiles last.
  // Phone: the band, the plan card, the quick tiles, then the rest.
  return (
    <div className="page">
      {desk ? (
        <>
          {head}
          {cancelledBlock}
          <div className="homerow">{planBlock}{nextBlock}</div>
          <div className="homegrid">
            {[dueSoon.length > 0 && dueBlock, upcoming.length > 1 && upcomingBlock, receipts.length > 0 && receiptsBlock, boardingBlock].filter(Boolean).map((block, i) => <div key={i}>{block}</div>)}
          </div>
          {tiles}
        </>
      ) : (
        <>{head}{planBlock}{tiles}{cancelledBlock}{nextBlock}{dueBlock}{upcomingBlock}{receiptsBlock}{boardingBlock}</>
      )}
    </div>
  )

}

function NextClassCard({ booking, s, rider }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const base = useBase()
  const slot = booking.slot
  const instructor = byId(s.instructors, slot.instructorId)
  const horse = byId(s.horses, booking.horseId)
  const cancellable = canCancel(booking, slot)
  return (
    <section className="card nextclass c-slate edge-c" aria-label={t('family.home.nextClass')}>
      <div className="row between gap-sm">
        <p className="card__label">{t('family.home.nextClass')} · <RiderDot color={riderColor(s, rider.id)} size={8} /> {rider.name}</p>
        <LevelPill level={slot.level} />
      </div>
      <p className="nextclass__when">{fmtDate(booking.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(slot.time)}</p>
      <p className="small muted">{t(`disciplines.${slot.discipline}`)} · {instructor?.name} · {t(`arenas.${slot.arena}`)}</p>
      {horse && <HorseTag horse={horse} />}
      <div className="row gap-sm wrap nextclass__actions">
        <Link to={`${base}/familia/reservar?fecha=${booking.date}`} className="btn btn--slate btn--sm">{t('family.home.seeDetail')}</Link>
        {cancellable
          ? <CancelClassButton booking={booking} className="btn btn--outline btn--sm" label={t('family.home.cancel')} />
          : <p className="small muted nextclass__note"><Icon name="info" size={14} /> {t('family.home.cancelClosed', { hours: CANCEL_WINDOW_HOURS })}</p>}
      </div>
    </section>
  )
}

/** Quick tiles: each section with its color; hover or tap fills the tile with its color glass. */
function QuickTiles({ s, rider, familyId, dueCount }) {
  const { t, fmtDate } = useI18n()
  const base = useBase()
  const plan = getPlan(s, rider.id)
  const hasHorse = s.horses.some((h) => h.ownerFamilyId === familyId && h.status !== 'sold')
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  const items = [
    { to: 'reservar', color: 'mustard', icon: 'calendar', title: t('tabs.book'), text: t('homeTiles.classes') },
    { to: 'plan', color: 'sage', icon: 'horseshoe', title: t('tabs.plan'), text: plan ? t('homeTiles.plan', { n: plan.total, date: short(planRenewal(plan)) }) : t('homeTiles.noPlan') },
    hasHorse && { to: 'caballo', color: 'terracotta', icon: 'horseHead', title: t('myHorse.title'), text: t('homeTiles.horse') },
    { to: 'pagos', color: 'slate', icon: 'receipt', title: t('homeTiles.payments'), text: dueCount ? t('homeTiles.paymentsDue', { n: dueCount }) : t('homeTiles.paymentsOk') },
    { to: 'eventos', color: 'plum', icon: 'balloons', title: t('homeTiles.events'), text: t('homeTiles.eventsText') },
    { to: 'perfil', color: 'sage', icon: 'user', title: t('homeTiles.profile'), text: t('homeTiles.profileText') },
  ].filter(Boolean)
  return (
    <nav className="ctiles hometiles" aria-label={t('homeTiles.label')}>
      {items.map((x) => (
        <Link key={x.to} to={`${base}/familia/${x.to}`} className={`ctile c-${x.color}`}>
          <span className="ctile__icon"><Icon name={x.icon} size={22} /></span>
          <span className="ctile__title">{x.title}</span>
          <span className="ctile__text">{x.text}</span>
        </Link>
      ))}
    </nav>
  )
}
