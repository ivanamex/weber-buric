import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, occurrencesFor, bookClass, bookSingleClass, getPlan, planRemaining, planExpiry, hadTrial } from '../../data/store.js'
import { CLASS_PRICES } from '../../data/prices.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { celebrate } from '../../components/celebrate.js'
import { todayKey, addDays, monthKeyOf, weekdayOf } from '../../lib/time.js'

const DAYS = 7
const MAX_WEEKS = 2

export default function FamilyBook() {
  const { t, fmtDate, fmtTime, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const { riderId } = useFamilyContext()
  const base = useBase()
  const rider = byId(s.riders, riderId)
  const today = todayKey()
  const [week, setWeek] = useState(0)
  const [date, setDate] = useState(today)
  const [busy, setBusy] = useState(null)
  const [choice, setChoice] = useState(null) // { slotId, reason: 'noPlan' | 'planEmpty' }

  const start = addDays(today, week * DAYS)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i))
  const occ = occurrencesFor(s, date, riderId)
  const month = monthKeyOf(date)
  const plan = getPlan(s, riderId, date)
  const monthName = fmtDate(`${month}-01`, { month: 'long' })

  const changeWeek = (w) => { setWeek(w); setDate(w === 0 ? today : addDays(today, w * DAYS)) }

  // No plan (and none renewing) or a used-up plan: plans come first, a single class is the quiet option.
  const standing = rider.planClasses && (!rider.planStart || rider.planStart <= date)
  const needsChoice = !plan ? (standing ? null : 'noPlan') : plan.used >= plan.total ? 'planEmpty' : null

  const onBook = async (o, e) => {
    if (needsChoice) return setChoice({ slotId: o.slot.id, reason: needsChoice })
    const r = e?.currentTarget?.getBoundingClientRect()
    setBusy(o.slot.id)
    const res = await bookClass({ riderId, slotId: o.slot.id, date })
    setBusy(null)
    if (!res.ok && (res.code === 'noPlan' || res.code === 'planEmpty')) return setChoice({ slotId: o.slot.id, reason: res.code })
    if (res.ok) {
      if (r) celebrate(r.left + r.width / 2, r.top + r.height / 2)
      toast(t('toasts.booked', { name: rider.name, date: fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' }), time: fmtTime(o.slot.time), n: res.remaining }))
    } else {
      toast(t(`errors.${res.code}`, { month: monthName }), 'error')
    }
  }

  const onSingle = async (o, kind, e) => {
    const r = e?.currentTarget?.getBoundingClientRect()
    setBusy(o.slot.id)
    const res = await bookSingleClass({ riderId, slotId: o.slot.id, date, kind })
    setBusy(null)
    if (!res.ok) return toast(t(`errors.${res.code}`, { month: monthName }), 'error')
    setChoice(null)
    if (r) celebrate(r.left + r.width / 2, r.top + r.height / 2)
    toast(t('toasts.singleBooked', { kind: t(`classKind.${kind}`), name: rider.name, amount: fmtMoney(res.amount ?? CLASS_PRICES[kind]) }))
  }

  return (
    <div className="page">
      <h1 className="page__title">{t('family.book.title')}</h1>
      <RiderPicker />

      <div className="planline">
        {plan ? (
          <>
            <Icon name="plan" size={18} />
            <span>{t('family.book.planLine', { name: rider.name, n: planRemaining(plan), date: fmtDate(planExpiry(plan), { day: 'numeric', month: 'short' }) })}</span>
            <span className="muted small">· {t(`levels.${rider.level}`)}</span>
          </>
        ) : (
          <>
            <Icon name="alert" size={18} />
            <span>{t('family.book.noPlanLine', { month: monthName })}</span>
            <Link to={`${base}/familia/plan`} className="link">{t('plan.choose')}</Link>
          </>
        )}
      </div>

      <div className="daystrip">
        <button type="button" className="iconbtn" disabled={week === 0} onClick={() => changeWeek(week - 1)} aria-label={t('common.prev')}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="daystrip__days">
          {days.map((d) => {
            const count = s.slots.filter((sl) => sl.weekday === weekdayOf(d) && sl.active !== false).length
            return (
              <button key={d} type="button" className={`day ${d === date ? 'is-active' : ''} ${count ? '' : 'day--off'}`} onClick={() => setDate(d)}>
                <span className="day__wd">{fmtDate(d, { weekday: 'short' }).replace('.', '')}</span>
                <span className="day__num">{fmtDate(d, { day: 'numeric' })}</span>
                <span className="day__dot" aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <button type="button" className="iconbtn" disabled={week >= MAX_WEEKS - 1} onClick={() => changeWeek(week + 1)} aria-label={t('common.next')}>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      <p className="daylabel">{fmtDate(date)}{date === today ? ` · ${t('common.today')}` : ''}</p>

      {occ.length === 0 ? (
        <Empty icon="sun" title={t('family.book.noSlotsTitle')}>
          <button type="button" className="btn btn--outline" onClick={() => setDate(addDays(date, 1))}>{t('family.book.nextDay')} <Icon name="chevronRight" size={18} /></button>
        </Empty>
      ) : (
        <ul className="slots">
          {occ.map((o) => {
            const full = o.spotsLeft === 0
            let state = 'open'
            if (o.cancellation) state = 'cancelled'
            else if (o.mine) state = 'mine'
            else if (o.past) state = 'past'
            else if (full) state = 'full'
            else if (!o.levelOk) state = 'level'
            return (
              <li key={o.slot.id} className={`slot slot--${state}`}>
                <div className="slot__time">
                  <strong>{fmtTime(o.slot.time)}</strong>
                  <span>60 min</span>
                </div>
                <div className="slot__body">
                  <p className="slot__title">{t(`disciplines.${o.slot.discipline}`)} <Badge tone="neutral">{t(`levels.${o.slot.level}`)}</Badge></p>
                  <p className="slot__meta">{o.instructor.name} · {t(`arenas.${o.slot.arena}`)}</p>
                  {o.cancellation ? (
                    <p className="slot__spots is-full">{o.cancellation.reason || t('schedule.cancelledShort')}</p>
                  ) : (
                    <p className={`slot__spots ${full ? 'is-full' : o.spotsLeft === 1 ? 'is-low' : ''}`}>
                      {full ? t('family.book.full') : t('family.book.spotsLeft', { n: o.spotsLeft, cap: o.slot.capacity })}
                    </p>
                  )}
                </div>
                <div className="slot__action">
                  {state === 'open' && <button type="button" className="btn btn--primary btn--sm" onClick={(e) => onBook(o, e)} disabled={busy !== null}>{busy === o.slot.id ? '…' : t('family.book.book')}</button>}
                  {state === 'mine' && <Badge tone="success"><Icon name="check" size={14} /> {t('family.book.booked')}</Badge>}
                  {state === 'past' && <button type="button" className="btn btn--sm" disabled>{t('family.book.past')}</button>}
                  {state === 'cancelled' && <Badge tone="alert">{t('schedule.cancelledBadge')}</Badge>}
                  {state === 'full' && <button type="button" className="btn btn--sm" disabled>{t('family.book.fullBtn')}</button>}
                  {state === 'level' && <button type="button" className="btn btn--sm" disabled title={t('errors.level')}>{t('family.book.otherLevel')}</button>}
                </div>
                {state === 'open' && choice?.slotId === o.slot.id && (
                  <div className="slot__choice">
                    {choice.reason === 'noPlan' ? (
                      <>
                        <p className="small">{t('family.book.choiceNoPlan', { name: rider.name })}</p>
                        <Link to={`${base}/familia/plan?elegir=1`} className="btn btn--primary btn--block">{t('plan.choose')}</Link>
                        <p className="slot__quiet">
                          {!hadTrial(s, riderId) && (
                            <button type="button" className="link link--quiet" disabled={busy !== null} onClick={(e) => onSingle(o, 'trial', e)}>
                              {t('family.book.tryTrial', { price: fmtMoney(CLASS_PRICES.trial) })}
                            </button>
                          )}
                          <button type="button" className="link link--quiet" disabled={busy !== null} onClick={(e) => onSingle(o, 'single', e)}>
                            {t('family.book.paySingle', { price: fmtMoney(CLASS_PRICES.single) })}
                          </button>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="small">{t('family.book.choiceEmpty', { name: rider.name })}</p>
                        <Link to={`${base}/familia/plan?cambiar=1`} className="btn btn--primary btn--block">{t('family.book.biggerPlan')}</Link>
                        <p className="slot__quiet">
                          <button type="button" className="link link--quiet" disabled={busy !== null} onClick={(e) => onSingle(o, 'extra', e)}>
                            {t('family.book.bookExtra', { price: fmtMoney(CLASS_PRICES.extra) })}
                          </button>
                        </p>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {plan && <p className="muted small center mt16">{t('plan.expires', { date: fmtDate(planExpiry(plan), { day: 'numeric', month: 'long' }) })} · {t('family.book.cancelRule')}</p>}
    </div>
  )
}
