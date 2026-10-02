import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { BrandLogo, Logo } from '../components/Logo.jsx'
import { RunningHorse } from '../components/TextHorse.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { isStandalone } from '../lib/install.js'
import { SECTIONS, homePath, sectionId, translateHash } from './routes.js'
import { CONTACT, SHARE_IMAGE } from './content.js'
import { reducedMotion, useReveal } from './motion.jsx'
import './site.css'

const LANG_KEY = 'hipico.lang'
const HORSE_COLORS = [[36, 80, 63], [110, 150, 118]] // jungle → sage letters on the light footer
// An English visitor coming back to "/" goes to "/en" (only on the first page they open, never after a click).
const initialPath = typeof window === 'undefined' ? '' : window.location.pathname
let redirected = false
const storedLang = () => { try { return localStorage.getItem(LANG_KEY) } catch { return null } }

/** Signed in on this device, or the app is installed: "App del club" opens the app, otherwise the download page. */
function hasApp() {
  if (isStandalone()) return true
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if ((k.startsWith('sb-') && k.endsWith('-auth-token')) || k === 'hipico.paused') return true
    }
  } catch { /* ignore */ }
  return false
}

export function AppButton({ className = '', children }) {
  const { t } = useI18n()
  const [to, setTo] = useState('/descargar')
  useEffect(() => { setTo(hasApp() ? '/app' : '/descargar') }, [])
  return <Link to={to} className={`sbtn sbtn--deep ${className}`}><span className="sbtn__in">{children || t('site.appButton')}</span></Link>
}

/* ───────── <head>: title, description, languages, share image, structured data ───────── */
const defaults = typeof document === 'undefined' ? {} : {
  title: document.title,
  desc: document.querySelector('meta[name="description"]')?.getAttribute('content'),
}
function headTag(tag, attrs) {
  const sel = `${tag}${Object.entries(attrs).filter(([k]) => k !== 'content' && k !== 'href').map(([k, v]) => `[${k}="${v}"]`).join('')}`
  let el = document.head.querySelector(sel)
  if (!el) { el = document.createElement(tag); el.dataset.site = ''; document.head.appendChild(el) }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
}
function useHead(lang, t) {
  useEffect(() => {
    const origin = window.location.origin
    const title = t('site.meta.title')
    const desc = t('site.meta.desc')
    document.title = title
    headTag('meta', { name: 'description', content: desc })
    headTag('meta', { property: 'og:title', content: title })
    headTag('meta', { property: 'og:description', content: desc })
    headTag('meta', { property: 'og:image', content: origin + SHARE_IMAGE })
    headTag('meta', { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'es_MX' })
    headTag('link', { rel: 'canonical', href: origin + homePath(lang) })
    headTag('link', { rel: 'alternate', hreflang: 'es', href: `${origin}/` })
    headTag('link', { rel: 'alternate', hreflang: 'en', href: `${origin}/en` })
    let ld = document.getElementById('site-ld')
    if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'site-ld'; document.head.appendChild(ld) }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name: 'Hípico Riviera Maya',
      description: desc,
      url: origin + homePath(lang),
      image: origin + SHARE_IMAGE,
      telephone: CONTACT.phone,
      email: CONTACT.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Carretera Cancún–Chetumal km 273, int. Rancho San Francisco',
        addressLocality: 'Paamul',
        addressRegion: 'Quintana Roo',
        postalCode: '77735',
        addressCountry: 'MX',
      },
      sameAs: [CONTACT.instagram, CONTACT.facebook],
    })
  }, [lang, t])
  useEffect(() => () => {
    if (defaults.title) document.title = defaults.title
    if (defaults.desc) headTag('meta', { name: 'description', content: defaults.desc })
    document.head.querySelectorAll('link[data-site], #site-ld').forEach((n) => n.remove())
  }, [])
}

/* ───────── The scroll: which section is on screen, how far down the page, dark or light under the bar ───────── */
function useScrollState(lang) {
  const [state, setState] = useState({ active: null, dark: true, heroGone: false, nearEnd: false })
  const progress = useRef(null)
  useEffect(() => {
    let raf = 0
    const move = () => {
      raf = 0
      const vh = window.innerHeight
      const max = document.documentElement.scrollHeight - vh
      if (progress.current) progress.current.style.clipPath = `inset(0 ${(100 - (max > 0 ? Math.min(1, window.scrollY / max) : 0) * 100).toFixed(2)}% 0 0)`
      let active = null
      for (const s of SECTIONS) {
        const el = document.getElementById(s[lang])
        if (el && el.getBoundingClientRect().top <= vh * 0.4) active = s.key
      }
      const dark = [...document.querySelectorAll('[data-tone="dark"]')].some((el) => {
        const r = el.getBoundingClientRect()
        return r.top <= 28 && r.bottom > 28
      })
      const hero = document.querySelector('.shero')
      const visit = document.getElementById(sectionId('visit', lang))
      const heroGone = hero ? hero.getBoundingClientRect().bottom < 80 : true
      const nearEnd = visit ? visit.getBoundingClientRect().top < vh * 0.9 : false
      setState((p) => (p.active === active && p.dark === dark && p.heroGone === heroGone && p.nearEnd === nearEnd ? p : { active, dark, heroGone, nearEnd }))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(move) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    move()
    const late = setTimeout(move, 600)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); clearTimeout(late) }
  }, [lang])
  return [state, progress]
}

function LangSwitch({ active, onDone }) {
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()
  const go = (l) => {
    if (l === lang) return
    const hash = active ? `#${sectionId(active, l)}` : translateHash(window.location.hash, lang, l)
    const swap = () => flushSync(() => { setLang(l); navigate(homePath(l) + hash, { replace: false, state: { keep: true } }) })
    onDone?.()
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(swap)
    else swap()
  }
  return (
    <div className="lang" role="group" aria-label={t('common.language')}>
      {['es', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => go(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

/** Slim glass bar: logo · sections with a sliding underline (scroll-spy) · ES/EN · App del club; a jump-pole progress line. */
function SiteBar({ scroll, progress }) {
  const { t, lang } = useI18n()
  const nav = useRef(null)
  const [line, setLine] = useState(null)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    const place = () => {
      const a = scroll.active && nav.current?.querySelector(`[data-key="${scroll.active}"]`)
      setLine(a ? { left: a.offsetLeft, width: a.offsetWidth } : null)
    }
    place()
    window.addEventListener('resize', place)
    document.fonts?.ready.then(place)
    return () => window.removeEventListener('resize', place)
  }, [scroll.active, lang])
  useEffect(() => {
    if (!open) return undefined
    const key = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])
  return (
    <>
      <header className={`sbar ${scroll.dark ? 'is-dark' : ''}`}>
        <div className="sbar__inner">
          <a href={`${homePath(lang)}#top`} className="sbar__logo" aria-label={t('site.homeLabel')}><BrandLogo variant={scroll.dark ? 'white' : 'green'} height={40} /></a>
          <nav className="sbar__nav" ref={nav} aria-label={t('site.navLabel')}>
            {SECTIONS.map((s) => (
              <a key={s.key} data-key={s.key} href={`#${s[lang]}`} className={scroll.active === s.key ? 'is-active' : ''}
                aria-current={scroll.active === s.key ? 'true' : undefined}>{t(`site.nav.${s.key}`)}</a>
            ))}
            <span className="sbar__line" style={line ? { transform: `translateX(${line.left}px)`, width: line.width } : { opacity: 0 }} aria-hidden="true" />
          </nav>
          <div className="sbar__end">
            <span className="sbar__lang"><LangSwitch active={scroll.active} /></span>
            <Link to="/app" className="sbar__login">{t('landing.signIn')}</Link>
            <AppButton className="sbtn--sm" />
            <button type="button" className="sbar__menu" aria-expanded={open} aria-controls="ssheet" onClick={() => setOpen(true)} aria-label={t('site.menuOpen')}>
              <SiteIcon name="menu" size={24} />
            </button>
          </div>
        </div>
        <span className="sbar__progress" ref={progress} aria-hidden="true" />
      </header>
      {open && (
        <div className="ssheet" id="ssheet" role="dialog" aria-modal="true" aria-label={t('site.navLabel')}>
          <button type="button" className="ssheet__scrim" aria-label={t('site.menuClose')} onClick={() => setOpen(false)} />
          <div className="ssheet__panel">
            <span className="ssheet__grab" aria-hidden="true" />
            <nav className="ssheet__nav">
              {SECTIONS.map((s) => (
                <a key={s.key} href={`#${s[lang]}`} onClick={() => setOpen(false)} className={scroll.active === s.key ? 'is-active' : ''}>
                  <span>{s.n}</span>{t(`site.nav.${s.key}`)}
                </a>
              ))}
            </nav>
            <div className="ssheet__foot">
              <LangSwitch active={scroll.active} onDone={() => setOpen(false)} />
              <Link to="/app" className="sbar__login">{t('landing.signIn')}</Link>
              <button type="button" className="ssheet__close" onClick={() => setOpen(false)}><SiteIcon name="x" size={20} /> {t('site.menuClose')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SiteFooter() {
  const { t, lang } = useI18n()
  return (
    <footer className="sfooter" data-tone="light">
      <div className="sgallop" aria-hidden="true"><RunningHorse colors={HORSE_COLORS} /></div>
      <div className="scontainer sfooter__row">
        <a href={`${homePath(lang)}#top`} aria-label={t('site.homeLabel')}><Logo /></a>
        <div className="sfooter__social">
          <a href={waLink(t('site.wa.general'))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><SiteIcon name="whatsapp" /></a>
          <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><SiteIcon name="instagram" /></a>
          <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><SiteIcon name="facebook" /></a>
        </div>
      </div>
      <div className="scontainer sfooter__legal">
        <span>© {new Date().getFullYear()} Hípico Riviera Maya · {t('site.footer.place')}</span>
        <span className="sfooter__links"><Link to="/descargar">{t('site.footer.download')}</Link><Link to="/app">{t('landing.signIn')}</Link></span>
      </div>
    </footer>
  )
}

/** The club website around the one page: the glass bar, the phone's sticky "clase muestra" button and the footer. */
export default function SiteLayout({ lang }) {
  const { t, lang: current, setLang } = useI18n()
  const { pathname, hash, state } = useLocation()
  const root = useRef(null)
  const toEnglish = !redirected && lang === 'es' && pathname === '/' && initialPath === '/' && storedLang() === 'en'
  useEffect(() => { redirected = true }, [])
  useEffect(() => { if (!toEnglish && current !== lang) setLang(lang) }, [lang, current, setLang, toEnglish])
  // Land on the section in the address (old page links and the language switch use it).
  useEffect(() => {
    if (current !== lang) return undefined
    const id = hash.replace(/^#/, '')
    const go = () => {
      const el = id && id !== 'top' ? document.getElementById(decodeURIComponent(id)) : null
      if (el) el.scrollIntoView({ block: 'start' })
      else if (!state?.keep) window.scrollTo(0, 0)
    }
    const raf = requestAnimationFrame(go)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash, current, lang, state])
  useHead(lang, t)
  useReveal(root, current)
  const [scroll, progress] = useScrollState(lang)
  if (toEnglish) return <Navigate to="/en" replace />
  return (
    <div className={`site ${reducedMotion() ? '' : 'has-motion'}`} ref={root} id="top">
      <a href="#main" className="skip">{t('site.skip')}</a>
      <SiteBar scroll={scroll} progress={progress} />
      <main id="main">{current === lang ? <Outlet /> : null}</main>
      <a className={`smobilecta sbtn sbtn--deep ${scroll.heroGone && !scroll.nearEnd ? 'is-on' : ''}`} href={waLink(t('site.wa.trial'))}
        target="_blank" rel="noopener noreferrer" aria-hidden={scroll.heroGone && !scroll.nearEnd ? undefined : 'true'}
        tabIndex={scroll.heroGone && !scroll.nearEnd ? undefined : -1}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</span></a>
      <SiteFooter />
    </div>
  )
}
