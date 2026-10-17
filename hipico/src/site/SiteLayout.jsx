import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { BrandLogo, Logo } from '../components/Logo.jsx'
import { CourseHorse } from './Course.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { isStandalone } from '../lib/install.js'
import { SECTIONS, homePath, sectionId, translateHash } from './routes.js'
import { CONTACT, SHARE_IMAGE, SHOP_NEW_UNTIL, SLOGAN } from './content.js'
import { reducedMotion, useReveal } from './motion.jsx'
import { openCart, useCart, useShop } from './shop/shopApi.js'
import { ScreenBoundary } from '../components/ScreenError.jsx'
import { useApplyOnRouteChange } from '../lib/update.js'
import { CATEGORY_SLUGS, categoryFromSlug } from '../data/shop.js'
import './site.css'

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

export function AppButton({ className = '', children, tone = 'deep' }) {
  const { t } = useI18n()
  const [to, setTo] = useState('/descargar')
  useEffect(() => { setTo(hasApp() ? '/app' : '/descargar') }, [])
  return <Link to={to} className={`sbtn sbtn--${tone} ${className}`}><span className="sbtn__in">{children || t('site.appButton')}</span></Link>
}

export const shopPath = (lang) => (lang === 'en' ? '/en/shop' : '/tienda')
const isShopPath = (pathname) => /^\/(tienda|en\/shop)\/?$/.test(pathname)

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
function useHead(lang, t, shop) {
  useEffect(() => {
    const origin = window.location.origin
    const title = t(shop ? 'shop.meta.title' : 'site.meta.title')
    const desc = t(shop ? 'shop.meta.desc' : 'site.meta.desc')
    document.title = title
    headTag('meta', { name: 'description', content: desc })
    headTag('meta', { property: 'og:title', content: title })
    headTag('meta', { property: 'og:description', content: desc })
    headTag('meta', { property: 'og:image', content: origin + SHARE_IMAGE })
    headTag('meta', { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'es_MX' })
    headTag('link', { rel: 'canonical', href: origin + (shop ? shopPath(lang) : homePath(lang)) })
    headTag('link', { rel: 'alternate', hreflang: 'es', href: `${origin}${shop ? shopPath('es') : '/'}` })
    headTag('link', { rel: 'alternate', hreflang: 'en', href: `${origin}${shop ? shopPath('en') : '/en'}` })
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
  }, [lang, t, shop])
  useEffect(() => () => {
    if (defaults.title) document.title = defaults.title
    if (defaults.desc) headTag('meta', { name: 'description', content: defaults.desc })
    document.head.querySelectorAll('link[data-site], #site-ld').forEach((n) => n.remove())
  }, [])
}

/* ───────── The scroll: which section is on screen, how far down the page, dark or light under the bar ───────── */
function useScrollState(lang) {
  const [state, setState] = useState({ active: null, dark: true, heroGone: false, nearEnd: false, scrolled: false })
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
      // Past 8 px the bar gets its background (olivewood glass over dark sections): its links never sit on the hero title.
      const scrolled = window.scrollY > 8
      setState((p) => (p.active === active && p.dark === dark && p.heroGone === heroGone && p.nearEnd === nearEnd && p.scrolled === scrolled ? p : { active, dark, heroGone, nearEnd, scrolled }))
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

/** Switch the language, keeping the place: the same section, or the same shop category and product. */
function useLangGo(active, onDone) {
  const { lang, setLang } = useI18n()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  return (l) => {
    if (l === lang) { onDone?.(); return }
    let to
    if (isShopPath(pathname)) {
      const q = new URLSearchParams(search)
      const cat = categoryFromSlug(q.get('cat'))
      if (cat) q.set('cat', CATEGORY_SLUGS[l][cat])
      to = shopPath(l) + (q.toString() ? `?${q}` : '')
    } else to = homePath(l) + (active ? `#${sectionId(active, l)}` : translateHash(window.location.hash, lang, l))
    const swap = () => flushSync(() => { setLang(l); navigate(to, { replace: false, state: { keep: true } }) })
    onDone?.()
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(swap)
    else swap()
  }
}

const LANGS = ['es', 'en']
/** "ES ▾": a small card with Español / English (the current one checked); Esc or a click outside closes it, arrows move. */
function LangMenu({ active, onDone, long, up }) {
  const { lang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const go = useLangGo(active, () => { setOpen(false); onDone?.() })
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false) }
    const key = (e) => {
      if (e.key === 'Escape') { setOpen(false); box.current?.querySelector('.langm__btn')?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = [...box.current.querySelectorAll('[role="menuitemradio"]')]
        const i = items.indexOf(document.activeElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    box.current?.querySelector('[aria-checked="true"]')?.focus()
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className={`langm ${up ? 'langm--up' : ''}`} ref={box}>
      {long && <span className="langm__label">{t('site.langLabel')}</span>}
      <button type="button" className="langm__btn" aria-haspopup="menu" aria-expanded={open} aria-label={t('common.language')} onClick={() => setOpen((o) => !o)}>
        {long ? t(`site.langName.${lang}`) : lang.toUpperCase()}<SiteIcon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="langm__card" role="menu">
          {LANGS.map((l) => (
            <button key={l} type="button" role="menuitemradio" aria-checked={lang === l} className={lang === l ? 'is-active' : ''} onClick={() => go(l)}>
              <span>{t(`site.langName.${l}`)}</span>{lang === l && <SiteIcon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Tienda in the bar: the bag (with the cart's count), the word in mustard, "Nuevo" for its first weeks. */
function ShopNavLink({ onShop, onClick, sheet }) {
  const { t, lang } = useI18n()
  const n = useCart().reduce((a, l) => a + (l.qty || 0), 0)
  const isNew = new Date().toISOString().slice(0, 10) <= SHOP_NEW_UNTIL
  const go = (e) => { if (onShop && n) { e.preventDefault(); openCart() } onClick?.() }
  return (
    <Link to={shopPath(lang)} data-key="shop" className={`sbar__shop ${onShop ? 'is-active' : ''}`} aria-current={onShop ? 'page' : undefined}
      aria-label={n ? `${t('shop.nav')} · ${t('shop.cart.open', { n })}` : undefined} onClick={go}>
      <span className="sbar__shopicon"><SiteIcon name="bag" size={sheet ? 22 : 18} />{n > 0 && <span className="sbar__bagn">{n}</span>}</span>
      {t('shop.nav')}
      {isNew && <em className="sbar__new">{t('shop.newTag')}</em>}
    </Link>
  )
}

/** Slim glass bar: logo · sections with a sliding underline (scroll-spy) · ES/EN · App del club; a jump-pole progress line. */
function SiteBar({ scroll, progress, onShop, shopOn }) {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const nav = useRef(null)
  const active = onShop ? 'shop' : scroll.active
  const [line, setLine] = useState(null)
  const [open, setOpen] = useState(false)
  useLayoutEffect(() => {
    const place = () => {
      const a = active && nav.current?.querySelector(`[data-key="${active}"]`)
      setLine(a ? { left: a.offsetLeft, width: a.offsetWidth } : null)
    }
    place()
    window.addEventListener('resize', place)
    document.fonts?.ready.then(place)
    return () => window.removeEventListener('resize', place)
  }, [active, lang, shopOn])
  // On the shop the sections are on the home page: the links go there (the layout scrolls to the section).
  const sectionLink = (s, props) => (onShop
    ? <Link key={s.key} to={{ pathname: homePath(lang), hash: `#${s[lang]}` }} {...props}>{props.children}</Link>
    : <a key={s.key} href={`#${s[lang]}`} {...props}>{props.children}</a>)
  const openBag = () => (onShop ? openCart() : navigate(`${shopPath(lang)}?carrito=1`))
  useEffect(() => {
    if (!open) return undefined
    const key = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])
  return (
    <>
      <header className={`sbar ${scroll.dark ? 'is-dark' : ''} ${scroll.scrolled ? 'is-solid' : ''}`}>
        <div className="sbar__inner">
          <a href={`${homePath(lang)}#top`} className="sbar__logo" aria-label={t('site.homeLabel')}><BrandLogo variant={scroll.dark ? 'white' : 'green'} height={40} /></a>
          <nav className="sbar__nav" ref={nav} aria-label={t('site.navLabel')}>
            {SECTIONS.map((s) => sectionLink(s, { 'data-key': s.key, className: active === s.key ? 'is-active' : '', 'aria-current': active === s.key ? 'true' : undefined, children: t(`site.nav.${s.key}`) }))}
            {shopOn && <span className="sbar__div" aria-hidden="true" />}
            {shopOn && <ShopNavLink onShop={onShop} />}
            <span className="sbar__line" style={line ? { transform: `translateX(${line.left}px)`, width: line.width } : { opacity: 0 }} aria-hidden="true" />
          </nav>
          <div className="sbar__end">
            <span className="sbar__lang"><LangMenu active={scroll.active} /></span>
            <Link to="/app" className="sbar__login">{t('landing.signIn')}</Link>
            <Bag onOpen={openBag} />
            <AppButton className="sbtn--sm" tone="sage" />
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
                {shopOn && <ShopNavLink onShop={onShop} sheet onClick={() => setOpen(false)} />}
              {SECTIONS.map((s) => sectionLink(s, { onClick: () => setOpen(false), className: active === s.key ? 'is-active' : '', children: <><span>{s.n}</span>{t(`site.nav.${s.key}`)}</> }))}
            </nav>
            <div className="ssheet__foot">
              <LangMenu active={scroll.active} onDone={() => setOpen(false)} long up />
              <Link to="/app" className="sbar__login">{t('landing.signIn')}</Link>
              <button type="button" className="ssheet__close" onClick={() => setOpen(false)}><SiteIcon name="x" size={20} /> {t('site.menuClose')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** The bag after "Entrar" while the cart has something: opens the cart (on the shop) or goes to it. */
function Bag({ onOpen }) {
  const { t } = useI18n()
  const n = useCart().reduce((a, l) => a + (l.qty || 0), 0)
  if (!n) return null
  return (
    <button type="button" className="sbar__bag" aria-label={t('shop.cart.open', { n })} onClick={onOpen}>
      <SiteIcon name="bag" size={22} /><span className="sbar__bagn">{n}</span>
    </button>
  )
}

function SiteFooter() {
  const { t, lang } = useI18n()
  return (
    <footer className="sfooter" data-tone="light">
      <p className="sfooter__slogan">{SLOGAN[lang] || SLOGAN.es}</p>
      <div className="sgallop" aria-hidden="true"><CourseHorse /></div>
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
  const onShop = isShopPath(pathname)
  useApplyOnRouteChange(pathname) // a new version waiting: taken on the next page change
  const shop = useShop()
  const shopOn = shop?.on !== false
  useHead(lang, t, onShop)
  useReveal(root, current)
  const [scroll, progress] = useScrollState(lang)
  const cta = scroll.heroGone && !scroll.nearEnd && !onShop
  if (toEnglish) return <Navigate to="/en" replace />
  return (
    <div className={`site ${reducedMotion() ? '' : 'has-motion'}`} ref={root} id="top">
      <a href="#main" className="skip">{t('site.skip')}</a>
      <SiteBar scroll={scroll} progress={progress} onShop={onShop} shopOn={shopOn} />
      <main id="main">{current === lang ? <ScreenBoundary key={pathname}><Suspense fallback={<div className="route-wait" />}><Outlet /></Suspense></ScreenBoundary> : null}</main>
      <a className={`smobilecta sbtn sbtn--deep ${cta ? 'is-on' : ''}`} href={waLink(t('site.wa.trial'))}
        target="_blank" rel="noopener noreferrer" aria-hidden={cta ? undefined : 'true'}
        tabIndex={cta ? undefined : -1}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</span></a>
      <SiteFooter />
    </div>
  )
}
