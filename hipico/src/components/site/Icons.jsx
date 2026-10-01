import { HORSESHOE_D } from '../Icon.jsx'

// The website's pictograms: line drawings on a 24×24 grid, same stroke as the app's icons.
const P = {
  helmet: <><path d="M4 16c0-5.6 3.6-9.6 8.3-9.6 4.4 0 7.6 3.4 7.7 7.6l2.2 1.6c.3.3.1.6-.3.6H4z" /><path d="M5 12.6h14.4" /><path d="M6.5 16.4c0 2.4 1.7 4.1 4.1 4.1" /><circle cx="12.3" cy="6.4" r=".75" fill="currentColor" stroke="none" /></>,
  horseshoe: <path d={HORSESHOE_D} fill="currentColor" stroke="none" fillRule="evenodd" />,
  saddle: <><path d="M3 5.5c.9 3.4 3.6 5 7.8 4.8 3.3-.2 5.4-1.4 6.9-3.5.6-.9 1.7-1.2 2.6-.7" /><path d="M8.3 10.2 7.6 16c-.1 1.1.7 2 1.8 2h3.3c1 0 1.8-.8 1.9-1.8l.4-6.6" /><path d="M11.2 18v1.3M9.4 21.2h3.6M9.8 21.2l1.4-1.9 1.4 1.9" /></>,
  rosette: <><circle cx="12" cy="9" r="5.8" /><circle cx="12" cy="9" r="2.6" /><path d="M9 13.9 7.6 21.2l2.6-1.3 1.8 1.6M15 13.9l1.4 7.3-2.6-1.3-1.8 1.6" /></>,
  jump: <><path d="M4.5 20.5V5M19.5 20.5V5M2.5 20.5h4M17.5 20.5h4" /><path d="M4.5 9.5h15M4.5 14h15" /><path d="M9.5 8.5v2M14.5 8.5v2M9.5 13v2M14.5 13v2" /></>,
  hay: <><rect x="3" y="7" width="18" height="11.5" rx="2.2" /><path d="M8 7v11.5M16 7v11.5" /><path d="M10.4 10.4l2.4 1.1M10.6 14.6l2.8.9M3 11.5h2.4M18.6 13.8H21" /></>,
  heartHand: <><path d="M12 10.8S8 8.4 8 5.7a2.2 2.2 0 0 1 4-1.3 2.2 2.2 0 0 1 4 1.3c0 2.7-4 5.1-4 5.1z" /><path d="M2.5 14.8H6l3.2-1.2h4.3a1.6 1.6 0 0 1 0 3.2h-2.8" /><path d="M13.4 16.8l5.2-2.4a1.6 1.6 0 0 1 1.9 2.5l-4.9 3.8H6.4L2.5 20.7" /></>,
  sprout: <><path d="M12 20.5v-9" /><path d="M12 11.5C12 8 9.6 5.8 5.5 5.8c0 3.6 2.4 5.7 6.5 5.7z" /><path d="M12 14c0-3 2-4.9 5.8-4.9 0 3.1-2 4.9-5.8 4.9z" /><path d="M7.5 20.5h9" /></>,
  cake: <><path d="M4 20.5h16V13a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" /><path d="M4 15.5c2.7 1.6 5.3 1.6 8 0s5.3-1.6 8 0M12 11V7.5" /><path d="M12 3.5c.9 1 .9 2 0 2.6-.9-.6-.9-1.6 0-2.6z" /></>,
  tent: <><path d="M12 4 2.8 20h18.4z" /><path d="M12 4v16M9 20l3-6 3 6" /><path d="M10.6 4 9.5 2.5M13.4 4l1.1-1.5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z" /><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M7.5 3.8h9v5.4a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 5.8H4.8a3.2 3.2 0 0 0 3.4 4.4M16.5 5.8h2.7a3.2 3.2 0 0 1-3.4 4.4" /><path d="M12 13.7v3.1M9.5 16.8h5v3.7h-5zM7.5 20.5h9" /></>,
  pin: <><path d="M12 21s-7-6.1-7-11.4a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.6" r="2.6" /></>,
  map: <><path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13.5L15 20l-6-2.5-5.5 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></>,
  whatsapp: <><path d="M4 20.5 5.3 16.6A8.5 8.5 0 1 1 8.2 19.4z" /><path d="M9.2 8.6c.2-.5.6-.6 1-.6.2 0 .5.4.8 1.2.2.5-.4 1-.5 1.2.4 1.2 1.6 2.4 2.9 2.9.3-.2.7-.8 1.2-.6.8.3 1.2.6 1.2.8 0 .5-.2 1-.7 1.2-1.7.8-6.6-2.6-5.9-6.1z" fill="currentColor" stroke="none" /></>,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".8" fill="currentColor" stroke="none" /></>,
  facebook: <path d="M14 21v-7.4h2.6l.4-3.1h-3V8.7c0-.9.3-1.6 1.6-1.6H17V4.4c-.3 0-1.2-.1-2.3-.1-2.4 0-3.9 1.4-3.9 4v2.3H8.2v3.1h2.6V21" />,
  call: <path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6c0 1.1-.9 2.1-2.1 2.1A15.8 15.8 0 0 1 4.5 5.6c0-1.2 1-2.1 2.1-2.1z" />,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m3.6 7.2 8.4 6 8.4-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c.9-3.3 3.3-5 6.5-5s5.6 1.7 6.5 5" /><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M17.5 15.2c2 .6 3.3 2.2 4 4.8" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
}

export function SiteIcon({ name, size = 24, className = '', ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`sicon ${className}`} {...rest}>
      {P[name] || P.horseshoe}
    </svg>
  )
}
