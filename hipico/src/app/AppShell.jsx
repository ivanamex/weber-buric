import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { familyRiders, login, logout, useStore, byId, moduleOn } from '../data/store.js'
import { Logo } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useBase } from './Backend.jsx'
import { InstallPrompt, PasswordNudge } from '../components/Install.jsx'
import { useInstallState } from '../lib/install.js'
import { DeskContext, useDesktop } from '../components/Desk.jsx'

const TABS = {
  family: [
    { to: 'familia', icon: 'horseHead', key: 'home', end: true },
    { to: 'familia/reservar', icon: 'calendar', key: 'book' },
    { to: 'familia/plan', icon: 'horseshoe', key: 'plan' },
    { to: 'familia/mas', icon: 'more', key: 'more' },
  ],
  admin: [
    { to: 'direccion', icon: 'chart', key: 'summary', end: true },
    { to: 'direccion/hoy', icon: 'helmet', key: 'today' },
    { to: 'direccion/horario', icon: 'calendar', key: 'schedule' },
    { to: 'direccion/cobros', icon: 'receipt', key: 'payments' },
    { to: 'direccion/familias', icon: 'family', key: 'families' },
  ],
}
// Management on a big screen: a sidebar with every section.
const SIDEBAR = [
  { to: 'direccion', icon: 'chart', label: 'tabs.summary', end: true },
  { to: 'direccion/hoy', icon: 'helmet', label: 'tabs.today' },
  { to: 'direccion/horario', icon: 'calendar', label: 'tabs.schedule', match: (p, q) => p.endsWith('/horario') && q.get('vista') !== 'caballos' && q.get('vista') !== 'instructores' },
  { to: 'direccion/cobros', icon: 'receipt', label: 'tabs.payments', badge: true },
  { to: 'direccion/familias', icon: 'family', label: 'tabs.families' },
  { to: 'direccion/horario?vista=caballos', icon: 'horseHead', label: 'schedule.horses', match: (p, q) => p.includes('/caballos/') || (p.endsWith('/horario') && q.get('vista') === 'caballos') },
  { to: 'direccion/horario?vista=instructores', icon: 'user', label: 'schedule.instructors', match: (p, q) => p.endsWith('/horario') && q.get('vista') === 'instructores' },
  { to: 'direccion/nomina', icon: 'users', label: 'payroll.title', module: 'modulePayroll' },
  { to: 'direccion/rentabilidad', icon: 'trophy', label: 'profit.title', module: 'moduleProfit' },
  { to: 'direccion/reportes', icon: 'book', label: 'tabs.reports' },
  { to: 'direccion/ajustes', icon: 'plan', label: 'modules.title' },
]
/** The top bar's title for the page on screen. */
function deskTitle(pathname, search) {
  const q = new URLSearchParams(search)
  if (pathname.includes('/caballos/') || q.get('vista') === 'caballos') return 'schedule.horses'
  if (q.get('vista') === 'instructores') return 'schedule.instructors'
  const last = pathname.replace(/\/$/, '').split('/').pop()
  return { direccion: 'tabs.summary', hoy: 'tabs.today', horario: 'tabs.schedule', cobros: 'tabs.payments', familias: 'tabs.families',
    nomina: 'payroll.title', rentabilidad: 'profit.title', ajustes: 'modules.title', reportes: 'tabs.reports' }[last] || 'tabs.summary'
}
const SIDE_KEY = 'hipico.sidebarSmall'

// Going back (browser or "← back" link) returns to the same scroll position; anything else starts at the top.
const scrollMemory = {}
function useScrollMemory() {
  const location = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    const key = location.key
    const save = () => { scrollMemory[key] = window.scrollY }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [location.key])
  useLayoutEffect(() => {
    const y = navType === 'POP' ? scrollMemory[location.key] : null
    if (y != null) requestAnimationFrame(() => window.scrollTo(0, y))
    else window.scrollTo(0, 0)
  }, [location.key, navType])
}

/** "Dirección / Caballos / Relámpago": where you are, each step a link back. */
function Crumbs({ items }) {
  if (items.length < 2) return null
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      {items.map((c, i) => (
        <span key={i} className="crumbs__item">
          {i > 0 && <span className="crumbs__sep" aria-hidden="true">/</span>}
          {c.to && i < items.length - 1 ? <Link to={c.to}>{c.label}</Link> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{c.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/** Management on a computer: sidebar (collapsible to icons), top bar with title, search and the page's main action. */
function DeskShell({ onLogout, toReview, demoBar }) {
  const { t } = useI18n()
  const s = useStore()
  const base = useBase()
  const { pathname, search } = useLocation()
  // Icons only by default on smaller laptops and tablets (under 1280 px); the choice is remembered once made.
  const [small, setSmall] = useState(() => {
    try { const v = localStorage.getItem(SIDE_KEY); if (v != null) return v === '1' } catch { /* ignore */ }
    return window.innerWidth < 1280
  })
  const [query, setQuery] = useState('')
  const [action, setAction] = useState(null)
  const [searchable, setSearchable] = useState(null)
  const searchRef = useRef(null)
  const toggle = () => { const next = !small; setSmall(next); try { localStorage.setItem(SIDE_KEY, next ? '1' : '0') } catch { /* ignore */ } }
  useEffect(() => { setQuery('') }, [pathname, search])
  // "/" jumps to the search box.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return
      if (!searchRef.current) return
      e.preventDefault()
      searchRef.current.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const ctx = useMemo(() => ({ desk: true, query, setQuery, setAction, setSearchable }), [query])
  const q = new URLSearchParams(search)
  const items = SIDEBAR.filter((i) => !i.module || moduleOn(s, i.module))
  const horseId = pathname.match(/\/caballos\/([^/]+)$/)?.[1]
  const adminCrumbs = [{ label: t('desk.crumbAdmin'), to: `${base}/direccion` }]
  if (deskTitle(pathname, search) !== 'tabs.summary') adminCrumbs.push({ label: t(deskTitle(pathname, search)), to: horseId ? `${base}/direccion/horario?vista=caballos` : null })
  if (horseId) adminCrumbs.push({ label: horseId === 'nuevo' ? t('schedule.addHorse') : byId(s.horses, horseId)?.name || '' })
  return (
    <DeskContext.Provider value={ctx}>
      <div className={`desk ${small ? 'is-small' : ''}`}>
        <aside className="desk__side" aria-label={t('app.nav')}>
          <Link to={`${base}/direccion`} className="desk__brand" title={t('tabs.summary')}><Logo light compact /></Link>
          <nav className="desk__nav">
            {items.map((i) => {
              const active = i.match ? i.match(pathname, q) : undefined
              return (
                <NavLink key={i.to} to={`${base}/${i.to}`} end={i.end} title={t(i.label)}
                  className={({ isActive }) => `desk__link ${(active ?? isActive) ? 'is-active' : ''}`}>
                  <span className="desk__icon"><Icon name={i.icon} size={20} />{i.badge && toReview > 0 && <span className="tabbar__badge">{toReview}</span>}</span>
                  <span className="desk__label">{t(i.label)}</span>
                </NavLink>
              )
            })}
          </nav>
          <div className="desk__foot">
            <p className="desk__who" title={s.session?.email || ''}><Icon name="user" size={18} /> <span className="desk__label">{s.mode === 'demo' ? t('app.roleAdmin') : s.session?.email}</span></p>
            <div className="desk__label"><LangToggle light /></div>
            <button type="button" className="desk__link" onClick={onLogout} title={t('app.logout')}><span className="desk__icon"><Icon name="logout" size={20} /></span><span className="desk__label">{t('app.logout')}</span></button>
            <button type="button" className="desk__link desk__collapse" onClick={toggle} title={t(small ? 'desk.expand' : 'desk.collapse')} aria-pressed={small}>
              <span className="desk__icon"><Icon name="panel" size={20} /></span><span className="desk__label">{t('desk.collapse')}</span>
            </button>
          </div>
        </aside>
        <div className="desk__main">
          {demoBar}
          <header className="desk__top">
            <div className="desk__heading">
              <Crumbs items={adminCrumbs} />
              <h1 className="desk__title">{t(deskTitle(pathname, search))}</h1>
            </div>
            {searchable && (
              <label className="search desk__search">
                <Icon name="search" size={18} />
                <input ref={searchRef} type="search" placeholder={`${searchable}  ( / )`} aria-label={searchable} value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() } }} />
              </label>
            )}
            {action && (
              <button type="button" className="btn btn--primary desk__action" onClick={action.onClick}>
                {action.icon && <Icon name={action.icon} size={18} />} {action.label}
              </button>
            )}
          </header>
          <main className="desk__content">
            <InstallPrompt />
            <Outlet context={{ riders: [], riderId: null, setRiderId: () => {} }} />
          </main>
        </div>
      </div>
    </DeskContext.Provider>
  )
}
// Families on a computer: every section straight in the sidebar (no "Más").
const FAMILY_SIDEBAR = [
  { to: 'familia', icon: 'horseHead', label: 'tabs.home', end: true },
  { to: 'familia/reservar', icon: 'calendar', label: 'tabs.book' },
  { to: 'familia/plan', icon: 'horseshoe', label: 'tabs.plan' },
  { to: 'familia/caballo', icon: 'saddle', label: 'myHorse.title', ownsHorse: true },
  { to: 'familia/pagos', icon: 'receipt', label: 'family.payments' },
  { to: 'familia/eventos', icon: 'balloons', label: 'more.events' },
  { to: 'familia/perfil', icon: 'family', label: 'more.profile.title' },
  { to: 'familia/instalar', icon: 'install', label: 'install.pageTitle', notInstalled: true },
  { to: 'familia/ajustes', icon: 'plan', label: 'more.settings' },
]
const FAMILY_TITLES = { reservar: 'tabs.book', plan: 'tabs.plan', caballo: 'myHorse.title', pagos: 'family.payments', eventos: 'more.events', perfil: 'more.profile.title', instalar: 'install.pageTitle', ajustes: 'more.settings', mas: 'tabs.more' }

function FamilyDeskShell({ onLogout, demoBar, family, outletContext }) {
  const { t } = useI18n()
  const s = useStore()
  const base = useBase()
  const { pathname } = useLocation()
  const { standalone } = useInstallState()
  const ownsHorse = s.horses.some((h) => h.ownerFamilyId === s.session.familyId && h.status !== 'sold')
  const items = FAMILY_SIDEBAR.filter((i) => (!i.ownsHorse || ownsHorse) && (!i.notInstalled || !standalone))
  const section = pathname.replace(/\/$/, '').split('/').pop()
  const crumbs = [{ label: family?.name || '', to: `${base}/familia` }]
  if (FAMILY_TITLES[section]) crumbs.push({ label: t(FAMILY_TITLES[section]) })
  return (
    <div className="fdesk">
      <div className="apptop">
        <header className="appbar">
          <Link to={`${base}/familia`} title={t('tabs.home')}><Logo light compact /></Link>
          <div className="appbar__right">
            <LangToggle light />
            <button type="button" className="iconbtn" onClick={onLogout} aria-label={t('app.logout')} title={t('app.logout')}><Icon name="logout" size={20} /></button>
          </div>
        </header>
        {demoBar}
      </div>
      <div className="fdesk__body">
        <aside className="fdesk__side" aria-label={t('app.nav')}>
          <nav className="fdesk__nav">
            {items.map((i) => (
              <NavLink key={i.to} to={`${base}/${i.to}`} end={i.end} className={({ isActive }) => `fdesk__link ${isActive ? 'is-active' : ''}`}>
                <Icon name={i.icon} size={20} /> <span>{t(i.label)}</span>
              </NavLink>
            ))}
          </nav>
          <button type="button" className="fdesk__link fdesk__logout" onClick={onLogout}><Icon name="logout" size={20} /> <span>{t('app.logout')}</span></button>
        </aside>
        <main className="fdesk__content">
          <Crumbs items={crumbs} />
          {s.mode !== 'preview' && <PasswordNudge />}
          {s.mode !== 'preview' && <InstallPrompt />}
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}

// The demo keeps its own copy, so it never changes what the real app remembers.
const riderKey = (mode) => (mode === 'demo' ? 'hipico.demo.rider' : 'hipico.rider')

/** Demo only: always visible — switch Familia ⇄ Dirección (same demo data) or leave to the role picker. */
function DemoBar({ role }) {
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const base = useBase()
  const switchTo = async (next) => {
    if (next === role) return
    const res = await login(next)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    navigate(`${base}/${next === 'admin' ? 'direccion' : 'familia'}`)
  }
  const leave = async () => {
    await logout()
    navigate(base)
  }
  return (
    <div className="demobar" role="region" aria-label={t('demoBar.label')}>
      <span className="demobar__tag">{t('app.demo')}</span>
      <div className="demobar__switch" role="group" aria-label={t('demoBar.switch')}>
        {['family', 'admin'].map((r) => (
          <button key={r} type="button" className={r === role ? 'is-active' : ''} aria-pressed={r === role} onClick={() => switchTo(r)}>
            {t(r === 'admin' ? 'demoBar.admin' : 'demoBar.family')}
          </button>
        ))}
      </div>
      <button type="button" className="demobar__exit" onClick={leave}>{t('demoBar.exit')}</button>
    </div>
  )
}

export default function AppShell({ role }) {
  useScrollMemory()
  const { t } = useI18n()
  const s = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const { pathname } = useLocation()
  const base = useBase()
  const desk = useDesktop()

  const riders = useMemo(() => (role === 'family' ? familyRiders(s, s.session.familyId) : []), [s, role])
  const [riderId, setRiderIdState] = useState(() => {
    try { return localStorage.getItem(riderKey(s.mode)) } catch { return null }
  })
  const activeRiderId = riders.some((r) => r.id === riderId) ? riderId : riders[0]?.id ?? null
  const setRiderId = (id) => {
    setRiderIdState(id)
    try { localStorage.setItem(riderKey(s.mode), id) } catch { /* ignore */ }
  }


  const onLogout = async () => {
    await logout()
    toast(t('app.loggedOut'), 'info')
    navigate(base)
  }
  const family = role === 'family' ? byId(s.families, s.session.familyId) : null
  const toReview = role === 'admin' ? s.payments.filter((p) => p.status === 'pending' && p.receiptStatus === 'review').length : 0

  if (role === 'family' && desk) {
    return <FamilyDeskShell onLogout={onLogout} family={family} demoBar={s.mode === 'demo' ? <DemoBar role={role} /> : null}
      outletContext={{ riders, riderId: activeRiderId, setRiderId }} />
  }
  if (role === 'admin' && desk) {
    return <DeskShell onLogout={onLogout} toReview={toReview} demoBar={s.mode === 'demo' ? <DemoBar role={role} /> : null} />
  }

  return (
    <div className={`app app--${role}`}>
      <div className="apptop">
      <header className="appbar">
        <Link to={`${base}/${role === 'admin' ? 'direccion' : 'familia'}`} title={t(role === 'admin' ? 'tabs.summary' : 'tabs.home')}><Logo light compact /></Link>
        <div className="appbar__right">
          <LangToggle light />
          <button type="button" className="iconbtn" onClick={onLogout} aria-label={t('app.logout')} title={t('app.logout')}>
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>
      {s.mode === 'demo' && <DemoBar role={role} />}
      </div>
      <div className="appbar__role">
        <span>{role === 'admin' ? t('app.roleAdmin') : family?.name}</span>
        {s.mode !== 'demo' && <span className="appbar__email">{s.session.email}</span>}
      </div>
      <main className="app__main">
        {s.mode !== 'preview' && role === 'family' && <PasswordNudge />}
        {s.mode !== 'preview' && <InstallPrompt />}
        <Outlet context={{ riders, riderId: activeRiderId, setRiderId }} />
      </main>
      <nav className="tabbar" aria-label={t('app.nav')}>
        {TABS[role].map((tab) => (
          <NavLink key={tab.to} to={`${base}/${tab.to}`} end={tab.end} className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
            <span className="tabbar__icon">
              <Icon name={tab.icon} size={22} />
              {tab.key === 'payments' && toReview > 0 && <span className="tabbar__badge" aria-label={t('receipt.toReview', { n: toReview })}>{toReview}</span>}
            </span>
            <span>{t(`tabs.${tab.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
