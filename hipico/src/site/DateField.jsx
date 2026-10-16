import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'

/**
 * The website's date field: reads in the page's language ("15 oct 2026" / "Oct 15, 2026") and looks like every other
 * field; the browser's own date picker still opens, since the native input sits on top, invisible.
 */
export function DateField({ id, value, onChange, min, max, name, invalid }) {
  const { fmtDate } = useI18n()
  const open = (e) => { try { e.currentTarget.showPicker?.() } catch { /* not allowed here: the field still works */ } }
  return (
    <span className="cdate">
      <input id={id} className="cdate__native" type="date" name={name} value={value || ''} min={min} max={max} onChange={onChange} onClick={open} aria-invalid={invalid || undefined} />
      <span className="cdate__shown" aria-hidden="true">
        <span>{value ? fmtDate(value, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
        <SiteIcon name="calendar" size={18} />
      </span>
    </span>
  )
}
