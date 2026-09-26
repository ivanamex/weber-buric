// Club logo (PNG, 171×226). White on green backgrounds, green on cream, gold for accents.
// Kept at 64 px tall or less until the vector file arrives.
const RATIO = 171 / 226

export function BrandLogo({ variant = 'green', height = 56, className = '' }) {
  const h = Math.min(height, 64)
  return (
    <img src={`/logo-${variant}.png`} alt="Hípico Riviera Maya" width={Math.round(h * RATIO)} height={h}
      className={`brand-logo ${className}`} decoding="async" />
  )
}

/** Logo only (splash, login, previews). Green by default, for cream screens. */
export function Mark({ size = 56, variant = 'green' }) {
  return <BrandLogo variant={variant} height={size} />
}

/** Logo + wordmark for headers: `light` on green backgrounds. */
export function Logo({ light = false, compact = false }) {
  return (
    <span className={`logo ${light ? 'logo--light' : ''}`}>
      <BrandLogo variant={light ? 'white' : 'green'} height={compact ? 40 : 48} />
      <span className="logo__text">
        <span className="logo__name">Hípico</span>
        <span className="logo__sub">Riviera Maya</span>
      </span>
    </span>
  )
}
