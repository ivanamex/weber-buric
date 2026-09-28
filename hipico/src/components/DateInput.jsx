import { useI18n } from '../i18n/I18nProvider.jsx'
import { Icon } from './Icon.jsx'

/**
 * A date field that always reads in the app's language ("27 sep 2026") and has the same height as every other field.
 * The phone's own date picker still opens: the native input sits on top, invisible.
 */
export function DateInput({ value, onChange, id, min, max, required, disabled, ...rest }) {
  const { fmtDate } = useI18n()
  const open = (e) => { try { e.currentTarget.showPicker?.() } catch { /* not allowed here: the field still works */ } }
  return (
    <span className={`dateinput ${disabled ? 'is-disabled' : ''}`}>
      <input id={id} className="dateinput__native" type="date" value={value || ''} min={min} max={max} required={required} disabled={disabled}
        onChange={onChange} onClick={open} {...rest} />
      <span className="input dateinput__shown" aria-hidden="true">
        <span className={value ? '' : 'muted'}>{value ? fmtDate(value, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
        <Icon name="calendar" size={18} />
      </span>
    </span>
  )
}
