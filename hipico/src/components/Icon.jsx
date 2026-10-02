// Minimal original stroke icon set (24×24).

/** The horseshoe: a filled U, thicker at the toe and thinner at the heels, rounded heel caps, 3 rectangular nail slots a side following the curve (filled, even-odd). */
export const HORSESHOE_D = 'M7.30 3.60A1.90 1.90 0 1 0 3.90 3.60L3.84 4.39L3.78 5.18L3.72 5.97L3.67 6.75L3.61 7.54L3.56 8.33L3.50 9.12L3.45 9.91L3.42 10.81L3.45 11.73L3.53 12.65L3.67 13.57L3.87 14.49L4.14 15.40L4.48 16.30L4.90 17.19L5.40 18.06L6.00 18.90L6.71 19.69L7.54 20.42L8.49 21.06L9.57 21.56L10.76 21.89L12.00 22.00L13.25 21.88L14.44 21.56L15.52 21.05L16.47 20.41L17.30 19.68L18.00 18.89L18.60 18.05L19.11 17.18L19.53 16.29L19.86 15.39L20.13 14.48L20.33 13.56L20.47 12.64L20.56 11.72L20.58 10.80L20.55 9.91L20.50 9.12L20.44 8.33L20.39 7.54L20.33 6.75L20.28 5.97L20.22 5.18L20.16 4.39L20.10 3.60A1.90 1.90 0 1 0 16.70 3.60L16.64 4.39L16.58 5.18L16.52 5.97L16.47 6.75L16.41 7.54L16.36 8.33L16.30 9.12L16.25 9.91L16.19 10.58L16.09 11.24L15.95 11.88L15.78 12.50L15.58 13.11L15.34 13.69L15.08 14.24L14.78 14.76L14.46 15.23L14.11 15.65L13.75 16.01L13.38 16.31L13.01 16.53L12.66 16.69L12.32 16.77L12.00 16.80L11.68 16.77L11.34 16.69L10.99 16.54L10.63 16.31L10.26 16.02L9.89 15.66L9.55 15.24L9.22 14.76L8.92 14.25L8.66 13.70L8.42 13.12L8.22 12.51L8.05 11.88L7.92 11.24L7.82 10.59L7.75 9.91L7.70 9.12L7.64 8.33L7.59 7.54L7.53 6.75L7.48 5.97L7.42 5.18L7.36 4.39L7.30 3.60ZM5.10 11.19L5.10 8.89L6.10 8.89L6.10 11.19ZM6.31 15.74L5.51 13.58L6.45 13.24L7.25 15.39ZM9.45 19.32L7.68 17.87L8.31 17.09L10.09 18.55ZM16.33 17.86L14.55 19.32L13.92 18.55L15.69 17.09ZM18.49 13.58L17.70 15.74L16.76 15.39L17.55 13.23ZM18.90 8.88L18.90 11.18L17.90 11.18L17.90 8.88Z'
const shoe = <path d={HORSESHOE_D} fill="currentColor" stroke="none" fillRule="evenodd" />

const P = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  plan: <><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 8.5h8M8 12.5h8M8 16.5h5" /></>,
  more: <><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.9-3.3 3.3-5 6.5-5s5.6 1.7 6.5 5" /><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 15.2c2 .6 3.3 2.2 4 4.8" /></>,
  shoe,
  barn: <><path d="M3 20V10l9-6 9 6v10z" /><path d="M8.5 20v-7h7v7M8.5 13l7 7M15.5 13l-7 7" /></>,
  tent: <><path d="M12 4 3 20h18z" /><path d="M12 4v16M9 20l3-6 3 6" /></>,
  cake: <><path d="M4 20.5h16V13a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" /><path d="M4 15.5c2.7 1.6 5.3 1.6 8 0s5.3-1.6 8 0M12 11V7.5M12 4.5v.01" /></>,
  chart: <><path d="M4 20.5h16" /><rect x="5.5" y="11" width="3" height="7" rx="1" /><rect x="10.5" y="6" width="3" height="12" rx="1" /><rect x="15.5" y="13.5" width="3" height="4.5" rx="1" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></>,
  cash: <><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  logout: <><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5" /><path d="M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.3L20 15.5" /><path d="M20 20v-4.5h-4.5" /></>,
  share: <><path d="M12 3.5v11M8 7.5l4-4 4 4" /><path d="M6 11H5v9.5h14V11h-1" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  panel: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M9 4.5v15" /></>,
  printer: <><path d="M7 9V4h10v5" /><rect x="3.5" y="9" width="17" height="8" rx="2" /><path d="M7 14h10v6H7z" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5" /><path d="M4.5 19.5h15" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trophy: <><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12c0-4-2.5-6.5-7-6.5 0 4.2 2.8 6.5 7 6.5zM12 14c0-3.5 2.2-6 6.5-6 0 3.8-2.4 6-6.5 6z" /></>,
  route: <><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="6" r="2.2" /><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2.2h5.6L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" /><circle cx="12" cy="12.8" r="3.4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  // Club pictograms (original drawings)
  horseHead: <><path d="M6 21c0-6 1-11 4-15l.5-3 2 2.5c2.5 1.5 5.5 4.5 7 8 .7 1.6-.5 3.1-2 2.5-1.4-.6-2.8-.9-4-.4-1 .9-1.2 3.4-.5 5.4" /><path d="M9 8.5c-1.2 1-1.6 2.3-1.6 3.6M8.2 12.6c-.9 1-1.1 2.3-1 3.6" /><circle cx="14" cy="9.4" r=".7" fill="currentColor" stroke="none" /><circle cx="18.3" cy="13.9" r=".5" fill="currentColor" stroke="none" /></>,
  horseshoe: shoe,
  helmet: <><path d="M4 16c0-5.6 3.6-9.6 8.3-9.6 4.4 0 7.6 3.4 7.7 7.6l2.2 1.6c.3.3.1.6-.3.6H4z" /><path d="M5 12.6h14.4" /><path d="M6.5 16.4c0 2.4 1.7 4.1 4.1 4.1" /><circle cx="12.3" cy="6.4" r=".75" fill="currentColor" stroke="none" /></>,
  saddle: <><path d="M3 5.5c.9 3.4 3.6 5 7.8 4.8 3.3-.2 5.4-1.4 6.9-3.5.6-.9 1.7-1.2 2.6-.7" /><path d="M8.3 10.2 7.6 16c-.1 1.1.7 2 1.8 2h3.3c1 0 1.8-.8 1.9-1.8l.4-6.6" /><path d="M11.2 18v1.3M9.4 21.2h3.6M9.8 21.2l1.4-1.9 1.4 1.9" /></>,
  receipt: <><path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></>,
  family: <><circle cx="7.5" cy="6.5" r="2.4" /><circle cx="16.5" cy="6.5" r="2.4" /><circle cx="12" cy="13" r="1.8" /><path d="M3 19c.6-3.6 2.3-5.6 4.5-5.6 1 0 1.9.4 2.6 1.1M21 19c-.6-3.6-2.3-5.6-4.5-5.6-1 0-1.9.4-2.6 1.1M9.4 21c.4-2 1.3-3.2 2.6-3.2s2.2 1.2 2.6 3.2" /></>,
  balloons: <><path d="M9 3.6c2 0 3.5 1.9 3.5 4.4S11 12.4 9 12.4 5.5 10.5 5.5 8 7 3.6 9 3.6z" /><path d="M15.6 7.2c1.6 0 2.9 1.6 2.9 3.6s-1.3 3.6-2.9 3.6-2.9-1.6-2.9-3.6 1.3-3.6 2.9-3.6z" /><path d="M8.5 12.4l.5.9.5-.9M9 13.3c-.8 2 .6 3.9-.4 7.7M15.6 14.4c.5 2.2-1.2 3.8-2.8 6.6" /><path d="M19.6 1.6v1.3M21.9 3.9h-1.3M18 2.3l.8.8M21.2 5.6l-.8-.6" /></>,
  sparkle: <path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2z" />,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  whatsapp: <><path d="M4 20.5 5.3 16.6A8.5 8.5 0 1 1 8.2 19.4z" /><path d="M9.2 8.6c.2-.5.6-.6 1-.6.2 0 .5.4.8 1.2.2.5-.4 1-.5 1.2.4 1.2 1.6 2.4 2.9 2.9.3-.2.7-.8 1.2-.6.8.3 1.2.6 1.2.8 0 .5-.2 1-.7 1.2-1.7.8-6.6-2.6-5.9-6.1z" fill="currentColor" stroke="none" /></>,
  qr: <><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19v1.5M20.5 14v2" /></>,
  kebab: <><circle cx="12" cy="5.5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="18.5" r="1.6" /></>,
  addSquare: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" /></>,
  install: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M12 7v7M9 11.5l3 3 3-3M10.5 18.5h3" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></>,
  book: <><path d="M12 6.5c-2-1.6-4.6-2-8-1.8v13.6c3.4-.2 6 .2 8 1.8 2-1.6 4.6-2 8-1.8V4.7c-3.4-.2-6 .2-8 1.8z" /><path d="M12 6.5v13.6" /></>,
  tabs: <><rect x="3.5" y="7.5" width="13" height="13" rx="2.5" /><path d="M7.5 4.5h10.5a2.5 2.5 0 0 1 2.5 2.5v10.5" /></>,
}

export function Icon({ name, size = 22, className = '', ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`icon ${className}`} {...rest}
    >
      {P[name] || P.info}
    </svg>
  )
}
