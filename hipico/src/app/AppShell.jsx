import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { familyRiders, logout, useStore, byId } from '../data/store.js'
import { Logo } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useBase } from './Backend.jsx'
import { InstallPrompt } from '../components/Install.jsx'

const TABS = {
  family: [
    { to: 'familia', icon: 'horseHead', key: 'home', end: true },
    { to: 'familia/reservar', icon: 'calendar', key: 'book' },
    { to: 'familia/plan', icon: 'horseshoe', key: 'plan' },
    { to: 'familia/mas', icon: 'more', key: 'more' },
  ],
  admin: [
    { to: 'direccion', icon: 'helmet', key: 'today', end: true },
    { to: 'direccion/horario', icon: 'calendar', key: 'schedule' },
    { to: 'direccion/cobros', icon: 'receipt', key: 'payments' },
    { to: 'direccion/familias', icon: 'family', key: 'families' },
    { to: 'direccion/reportes', icon: 'chart', key: 'reports' },
  ],
}
const RIDER_KEY = 'hipico.rider'

export default function AppShell({ role }) {
  const { t } = useI18n()
  const s = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const { pathname } = useLocation()
  const base = useBase()

  const riders = useMemo(() => (role === 'family' ? familyRiders(s, s.session.familyId) : []), [s, role])
  const [riderId, setRiderIdState] = useState(() => {
    try { return localStorage.getItem(RIDER_KEY) } catch { return null }
  })
  const activeRiderId = riders.some((r) => r.id === riderId) ? riderId : riders[0]?.id ?? null
  const setRiderId = (id) => {
    setRiderIdState(id)
    try { localStorage.setItem(RIDER_KEY, id) } catch { /* ignore */ }
  }

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const onLogout = async () => {
    await logout()
    toast(t('app.loggedOut'), 'info')
    navigate(base)
  }
  const family = role === 'family' ? byId(s.families, s.session.familyId) : null
  const toReview = role === 'admin' ? s.payments.filter((p) => p.status === 'pending' && p.receiptStatus === 'review').length : 0

  return (
    <div className="app">
      <header className="appbar">
        <Logo light compact />
        <div className="appbar__right">
          <LangToggle light />
          <button type="button" className="iconbtn" onClick={onLogout} aria-label={t('app.logout')} title={t('app.logout')}>
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>
      <div className="appbar__role">
        <span>{role === 'admin' ? t('app.roleAdmin') : family?.name}</span>
        {s.mode === 'demo' ? <span className="appbar__demo">{t('app.demo')}</span> : <span className="appbar__email">{s.session.email}</span>}
      </div>
      <main className="app__main">
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
