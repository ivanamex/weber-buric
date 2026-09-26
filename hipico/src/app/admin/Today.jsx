import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, occurrencesFor, getPlan, planRemaining, markAttendance, markClassAttended } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { todayKey, addDays, monthKeyOf } from '../../lib/time.js'

export default function AdminToday() {
  const { t, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  const toast = useToast()
  const today = todayKey()
  const [date, setDate] = useState(today)

  const occ = occurrencesFor(s, date).filter((o) => o.bookings.length > 0)
  const hours = [...new Set(occ.map((o) => o.slot.time))]
  const all = occ.flatMap((o) => o.bookings)
  const count = (st) => all.filter((b) => b.status === st).length

  const onMark = async (b, status) => {
    const res = await markAttendance(b.id, status)
    const name = byId(s.riders, b.riderId).name
    if (!res.ok) return toast(t('errors.notFound'), 'error')
    toast(res.status === 'booked' ? t('toasts.attendanceCleared', { name }) : t(`toasts.${res.status}`, { name }), res.status === 'noshow' ? 'info' : 'success')
  }

  const onAll = async (o) => {
    const res = await markClassAttended(o.slot.id, date)
    toast(res.ok ? t('toasts.allCame', { n: o.bookings.length }) : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }

  return (
    <div className="page">
      <div className="row between">
        <h1 className="page__title">{date === today ? t('admin.today.title') : fmtDate(date, { weekday: 'long' })}</h1>
        <div className="row gap-sm">
          <button type="button" className="iconbtn iconbtn--card" onClick={() => setDate(addDays(date, -1))} aria-label={t('common.prev')}><Icon name="chevronLeft" size={20} /></button>
          {date !== today && <button type="button" className="btn btn--sm btn--outline" onClick={() => setDate(today)}>{t('common.today')}</button>}
          <button type="button" className="iconbtn iconbtn--card" onClick={() => setDate(addDays(date, 1))} aria-label={t('common.next')}><Icon name="chevronRight" size={20} /></button>
        </div>
      </div>
      <p className="daylabel">{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>

      <div className="stats">
        <div className="stat"><strong>{occ.length}</strong><span>{t('admin.today.classes')}</span></div>
        <div className="stat"><strong>{all.length}</strong><span>{t('admin.today.riders')}</span></div>
        <div className="stat stat--sage"><strong>{count('attended')}</strong><span>{t('admin.today.came')}</span></div>
        <div className="stat stat--terra"><strong>{count('noshow')}</strong><span>{t('admin.today.noshow')}</span></div>
      </div>

      {hours.length === 0 ? (
        <Empty icon="calendar" title={t('admin.today.emptyTitle')} text={t('admin.today.emptyText')} />
      ) : hours.map((h) => (
        <section key={h} className="hourgroup">
          <h2 className="hourgroup__time">{fmtTime(h)}</h2>
          {occ.filter((o) => o.slot.time === h).map((o) => (
            <div key={o.slot.id} className="card classcard">
              <div className="classcard__head">
                <div>
                  <p className="card__title">{t(`disciplines.${o.slot.discipline}`)} · {t(`levels.${o.slot.level}`)}</p>
                  <p className="small muted">{o.instructor.name} · {t(`arenas.${o.slot.arena}`)}</p>
                </div>
                <div className="classcard__side">
                  <Badge tone={o.spotsLeft === 0 ? 'gold' : 'neutral'}>{o.bookings.length}/{o.slot.capacity}</Badge>
                  {o.bookings.some((b) => b.status !== 'attended') && (
                    <button type="button" className="pill pill--sage" onClick={() => onAll(o)}><Icon name="check" size={15} /> {t('admin.today.allCame')}</button>
                  )}
                </div>
              </div>
              <ul className="attendees">
                {o.bookings.map((b) => {
                  const rider = byId(s.riders, b.riderId)
                  const family = byId(s.families, rider.familyId)
                  const horse = byId(s.horses, b.horseId)
                  const plan = getPlan(s, rider.id, monthKeyOf(date))
                  return (
                    <li key={b.id} className={`attendee attendee--${b.status}`}>
                      <div className="attendee__info">
                        <p className="list__title">{rider.name} <span className="muted small">· {family.name.replace(/^Familia |^Family /, '')}</span></p>
                        <p className="small muted"><Icon name="shoe" size={13} /> {horse?.name}{horse?.type === 'boarded' ? ` (${t('admin.today.own')})` : ''}</p>
                        <p className="small">
                          {plan
                            ? <Badge tone={plan.paid ? 'success' : 'alert'}>{plan.paid ? t('admin.today.planOk', { n: planRemaining(plan) }) : t('plan.pendingPay')}</Badge>
                            : <Badge tone="alert">{t('plan.none')}</Badge>}
                        </p>
                      </div>
                      <div className="attendee__actions">
                        <button type="button" className={`pill pill--sage ${b.status === 'attended' ? 'is-on' : ''}`} onClick={() => onMark(b, 'attended')} aria-pressed={b.status === 'attended'}>
                          <Icon name="check" size={15} /> {t('admin.today.came')}
                        </button>
                        <button type="button" className={`pill pill--terra ${b.status === 'noshow' ? 'is-on' : ''}`} onClick={() => onMark(b, 'noshow')} aria-pressed={b.status === 'noshow'}>
                          <Icon name="x" size={15} /> {t('admin.today.noshow')}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <p className="muted small center mt16">{t('admin.today.rule')}</p>
    </div>
  )
}
