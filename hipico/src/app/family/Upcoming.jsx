import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, canCancel, cancelBooking, CANCEL_WINDOW_HOURS } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { useToast } from '../../components/Toast.jsx'

/** Cancel a confirmed class with a clear message either way. */
export function useCancelBooking() {
  const { t } = useI18n()
  const toast = useToast()
  return async (b) => {
    const res = await cancelBooking(b.id)
    if (res.ok) toast(t('toasts.cancelled'))
    else toast(t(`errors.${res.code}`, { hours: CANCEL_WINDOW_HOURS }), 'error', { sticky: true })
  }
}

/** Cancelar asks once before cancelling ("¿Cancelar esta clase?  Sí, cancelar · No"). */
export function CancelClassButton({ booking, className = 'link link--danger', label }) {
  const { t } = useI18n()
  const onCancel = useCancelBooking()
  const [asking, setAsking] = useState(false)
  if (!asking) return <button type="button" className={className} onClick={() => setAsking(true)}>{label || t('common.cancel')}</button>
  return (
    <span className="cancelask" role="group" aria-label={t('family.home.cancelAsk')}>
      <span className="cancelask__q">{t('family.home.cancelAsk')}</span>
      <button type="button" className="btn btn--sm btn--dangerSolid" onClick={() => { setAsking(false); onCancel(booking) }}>{t('family.home.cancelYes')}</button>
      <button type="button" className="btn btn--sm" onClick={() => setAsking(false)}>{t('family.home.cancelNo')}</button>
    </span>
  )
}

/** "Próximas clases": date, time, class, instructor and horse, each with Cancelar. */
export function UpcomingList({ bookings, showRider = false }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  return (
    <ul className="list card upcoming">
      {bookings.map((b) => {
        const slot = b.slot
        const instructor = byId(s.instructors, slot.instructorId)
        const horse = byId(s.horses, b.horseId)
        return (
          <li key={b.id} className="list__row upcoming__row">
            <div className="upcoming__when">
              <span>{fmtDate(b.date, { weekday: 'short' }).replace('.', '')}</span>
              <strong>{fmtDate(b.date, { day: 'numeric' })}</strong>
              <span>{fmtDate(b.date, { month: 'short' }).replace('.', '')}</span>
            </div>
            <div className="grow">
              <p className="list__title">{fmtTime(slot.time)} · {t(`disciplines.${slot.discipline}`)}{showRider ? ` · ${byId(s.riders, b.riderId)?.name}` : ''}</p>
              <p className="small muted upcoming__meta">
                <span><Icon name="user" size={14} /> {instructor?.name}</span>
                {horse && <span><Icon name="shoe" size={14} /> {horse.name}</span>}
              </p>
            </div>
            {canCancel(b, slot)
              ? <CancelClassButton booking={b} />
              : <span className="small muted upcoming__locked" title={t('family.home.cancelClosed', { hours: CANCEL_WINDOW_HOURS })}><Icon name="clock" size={14} /></span>}
          </li>
        )
      })}
    </ul>
  )
}
