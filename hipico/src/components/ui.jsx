import { Icon } from './Icon.jsx'

export function Progress({ value, max, tone = 'green' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={`progress progress--${tone}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Empty state: a pictogram, one line and (optionally) one action. */
export function Empty({ icon = 'info', title, children }) {
  return (
    <div className="empty">
      <span className="empty__icon"><Icon name={icon} size={30} /></span>
      <p className="empty__title">{title}</p>
      {children}
    </div>
  )
}

/** Plan progress as horseshoes: `used` filled in gold out of `total`. */
export function Horseshoes({ used, total, label }) {
  return (
    <div className="shoes" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} className={`shoe ${i < used ? 'is-used' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.6 5.2A7.4 7.4 0 1 0 16.4 5.2" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function SectionTitle({ children, action, icon }) {
  return (
    <div className="section-title">
      <h2>{icon && <Icon name={icon} size={20} className="section-title__icon" />}{children}</h2>
      {action}
    </div>
  )
}

export function Segmented({ options, value, onChange, small = false }) {
  return (
    <div className={`segmented ${small ? 'segmented--sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const WHATSAPP = '529841436457'
export const waLink = (text) => `https://wa.me/${WHATSAPP}${text ? `?text=${encodeURIComponent(text)}` : ''}`
