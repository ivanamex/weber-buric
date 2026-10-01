import { HORSESHOE_D, Icon } from './Icon.jsx'

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

/** Plan progress as horseshoes: `used` filled in the accent color out of `total`. */
export function Horseshoes({ used, total, label }) {
  return (
    <div className="shoes" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} className={`shoe ${i < used ? 'is-used' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d={HORSESHOE_D} fill="currentColor" fillRule="evenodd" />
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
