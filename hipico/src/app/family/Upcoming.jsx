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

/** "Próximas clases": date, time, class, instructor and horse, each with Cancelar. */
export function UpcomingList({ bookings, showRider = false }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  const onCancel = useCancelBooking()
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
              ? <button type="button" className="link link--danger" onClick={() => onCancel(b)}>{t('common.cancel')}</button>
              : <span className="small muted upcoming__locked" title={t('family.home.cancelClosed', { hours: CANCEL_WINDOW_HOURS })}><Icon name="clock" size={14} /></span>}
          </li>
        )
      })}
    </ul>
  )
}
