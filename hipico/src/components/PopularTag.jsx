import { HORSESHOE_D } from './Icon.jsx'

/**
 * "Más elegido": an olivewood pill with parchment caps and a small mustard horseshoe before the words. It looks the
 * same whether or not its card is selected, so it never blends into the card's mustard border.
 */
export function PopularTag({ children, className = '' }) {
  return (
    <span className={`poptag ${className}`}>
      <svg className="poptag__shoe" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path d={HORSESHOE_D} fill="currentColor" fillRule="evenodd" /></svg>
      {children}
    </span>
  )
}
