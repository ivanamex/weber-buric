export function Mark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#2E5339" />
      <g transform="translate(0 .75)">
        <path d="M23.97 18.53 A14 14 0 1 0 40.03 18.53" fill="none" stroke="#B08648" strokeWidth="8" strokeLinecap="round" />
        <g fill="#F6F2E9">
          <circle cx="18.84" cy="25.21" r="1.4" /><circle cx="18.84" cy="34.79" r="1.4" /><circle cx="23.97" cy="41.47" r="1.4" />
          <circle cx="45.16" cy="25.21" r="1.4" /><circle cx="45.16" cy="34.79" r="1.4" /><circle cx="40.03" cy="41.47" r="1.4" />
        </g>
      </g>
    </svg>
  )
}

export function Logo({ light = false, compact = false }) {
  return (
    <span className={`logo ${light ? 'logo--light' : ''}`}>
      <Mark size={compact ? 32 : 38} />
      <span className="logo__text">
        <span className="logo__name">Hípico</span>
        <span className="logo__sub">Riviera Maya</span>
      </span>
    </span>
  )
}
