import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Logo } from '../components/Logo.jsx'
import { RunningHorse } from '../components/TextHorse.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { isStandalone } from '../lib/install.js'
import { PAGES, pageAt, pagePath } from './routes.js'
import { CONTACT } from './content.js'
import { reducedMotion, useReveal } from './motion.jsx'
import './site.css'

// The footer QR is for computers only, so phones never download the QR code maker.
const QrSvg = lazy(() => import('../components/QrCode.jsx').then((m) => ({ default: m.QrSvg })))
const NAV = PAGES.filter((p) => p.key !== 'home')
const LANG_KEY = 'hipico.lang'
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
export const appTarget = () => (hasApp() ? '/app' : '/descargar')

export function AppButton({ className = '', children }) {
  const { t } = useI18n()
  const [to, setTo] = useState('/descargar')
  useEffect(() => { setTo(appTarget()) }, [])
  return <Link to={to} className={`sbtn sbtn--accent ${className}`}>{children || t('site.appButton')}</Link>
}

const defaults = typeof document === 'undefined' ? {} : {
  title: document.title,
  desc: document.querySelector('meta[name="description"]')?.getAttribute('content'),
}
function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta')
    const m = selector.match(/\[(\w+(?::\w+)?)="([^"]+)"\]/g) || []
    for (const pair of m) { const [, k, v] = pair.match(/\[([^=]+)="([^"]+)"\]/); el.setAttribute(k, v) }
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/** Each page's <title>, description and language links, for search engines and shared links. */
function useDocumentMeta(pageKey, lang, t) {
  useEffect(() => {
    const title = t(`site.meta.${pageKey}.title`)
    const desc = t(`site.meta.${pageKey}.desc`)
    document.title = title
    setMeta('meta[name="description"]', 'content', desc)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', desc)
    setMeta('meta[property="og:locale"]', 'content', lang === 'en' ? 'en_US' : 'es_MX')
    const origin = window.location.origin
    setMeta('link[rel="alternate"][hreflang="es"]', 'href', origin + pagePath(pageKey, 'es'))
    setMeta('link[rel="alternate"][hreflang="en"]', 'href', origin + pagePath(pageKey, 'en'))
    setMeta('link[rel="canonical"]', 'href', origin + pagePath(pageKey, lang))
  }, [pageKey, lang, t])
  useEffect(() => () => {
    if (defaults.title) document.title = defaults.title
    if (defaults.desc) setMeta('meta[name="description"]', 'content', defaults.desc)
    document.head.querySelectorAll('link[rel="alternate"][hreflang], link[rel="canonical"]').forEach((n) => n.remove())
  }, [])
}

function LangSwitch({ pageKey, light }) {
  const { lang, setLang, t } = useI18n()
  const navigate = useNavigate()
  const go = (l) => {
    if (l === lang) return
    setLang(l)
    navigate(pagePath(pageKey, l))
  }
  return (
    <div className={`lang ${light ? 'lang--light' : ''}`} role="group" aria-label={t('common.language')}>
      {['es', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => go(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

function SiteHeader({ pageKey, overHero }) {
  const { t, lang } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return undefined
    const key = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.documentElement.classList.add('is-locked')
    window.addEventListener('keydown', key)
    return () => { document.documentElement.classList.remove('is-locked'); window.removeEventListener('keydown', key) }
  }, [open])
  const solid = scrolled || !overHero
  return (
    <header className={`sheader ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
      <div className="scontainer sheader__inner">
        <Link to={pagePath('home', lang)} className="sheader__logo" aria-label={t('site.homeLabel')}><Logo light={!solid || open} compact /></Link>
        <nav className="sheader__nav" aria-label={t('site.navLabel')}>
          {NAV.map((p) => <NavLink key={p.key} to={pagePath(p.key, lang)} className="sheader__link">{t(`site.nav.${p.key}`)}</NavLink>)}
        </nav>
        <div className="sheader__actions">
          <LangSwitch pageKey={pageKey} light={!solid} />
          <Link to="/app" className="sheader__login">{t('landing.signIn')}</Link>
          <AppButton className="sbtn--sm" />
        </div>
        <button type="button" className="sheader__menu" aria-expanded={open} aria-controls="smenu" onClick={() => setOpen((o) => !o)}
          aria-label={open ? t('site.menuClose') : t('site.menuOpen')}>
          <SiteIcon name={open ? 'x' : 'menu'} size={26} />
        </button>
      </div>
      <div id="smenu" className="smenu" hidden={!open}>
        <nav className="smenu__nav" aria-label={t('site.navLabel')}>
          {PAGES.map((p, i) => (
            <NavLink key={p.key} end to={pagePath(p.key, lang)} className="smenu__link" style={{ '--i': i }}>{t(`site.nav.${p.key}`)}</NavLink>
          ))}
        </nav>
        <div className="smenu__foot">
          <AppButton className="sbtn--lg sbtn--block" />
          <div className="smenu__row">
            <LangSwitch pageKey={pageKey} light />
            <Link to="/app" className="sheader__login">{t('landing.signIn')}</Link>
            <a href={waLink(t('site.wa.general'))} target="_blank" rel="noopener noreferrer" className="sheader__login"><SiteIcon name="whatsapp" size={20} /> WhatsApp</a>
          </div>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  const { t, lang } = useI18n()
  const [qr, setQr] = useState('')
  useEffect(() => { if (window.matchMedia?.('(min-width: 1100px)').matches) setQr(`${window.location.origin}/descargar`) }, [])
  return (
    <footer className="sfooter">
      <section className="sgallop" aria-hidden="true"><RunningHorse /></section>
      <div className="scontainer sfooter__grid">
        <div className="sfooter__brand">
          <Logo light />
          <p>{t('site.footer.mission')}</p>
          <AppButton />
        </div>
        <nav className="sfooter__col" aria-label={t('site.navLabel')}>
          <h2>{t('site.footer.club')}</h2>
          {PAGES.map((p) => <Link key={p.key} to={pagePath(p.key, lang)}>{t(`site.nav.${p.key}`)}</Link>)}
        </nav>
        <div className="sfooter__col">
          <h2>{t('site.footer.contact')}</h2>
          <p className="sfooter__line"><SiteIcon name="pin" size={18} /> <span>{CONTACT.address}</span></p>
          <a className="sfooter__line" href={CONTACT.phoneHref}><SiteIcon name="call" size={18} /> {CONTACT.phone}</a>
          <a className="sfooter__line" href={`mailto:${CONTACT.email}`}><SiteIcon name="mail" size={18} /> <span className="break">{CONTACT.email}</span></a>
          <div className="sfooter__social">
            <a href={waLink(t('site.wa.general'))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><SiteIcon name="whatsapp" /></a>
            <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><SiteIcon name="instagram" /></a>
            <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><SiteIcon name="facebook" /></a>
          </div>
        </div>
        {qr && (
          <Link to="/descargar" className="sfooter__qr">
            <Suspense fallback={<span className="sfooter__qrwait" />}><QrSvg value={qr} size={104} title={t('share.qrLabel')} /></Suspense>
            <span>{t('site.footer.scan')}</span>
          </Link>
        )}
      </div>
      <div className="scontainer sfooter__legal">
        <span>© {new Date().getFullYear()} Hípico Riviera Maya</span>
        <span>{t('site.footer.place')}</span>
      </div>
    </footer>
  )
}

/** The club website around every page: header (transparent over the hero, cream once scrolled), footer. */
export default function SiteLayout({ lang }) {
  const { t, lang: current, setLang } = useI18n()
  const { pathname, hash } = useLocation()
  const page = pageAt(pathname) || { key: 'home', lang }
  const root = useRef(null)
  const toEnglish = !redirected && lang === 'es' && pathname === '/' && initialPath === '/' && storedLang() === 'en'
  useEffect(() => { redirected = true }, [])
  useEffect(() => { if (!toEnglish && current !== lang) setLang(lang) }, [lang, current, setLang, toEnglish])
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  useDocumentMeta(page.key, lang, t)
  useReveal(root, `${pathname}:${current}`)
  if (toEnglish) return <Navigate to="/en" replace />
  return (
    <div className={`site ${reducedMotion() ? '' : 'has-motion'}`} ref={root}>
      <a href="#main" className="skip">{t('site.skip')}</a>
      <SiteHeader pageKey={page.key} overHero />
      <main id="main" key={pathname}>
        {current === lang ? <Outlet /> : null}
      </main>
      <SiteFooter />
    </div>
  )
}
