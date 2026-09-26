import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { familyRiders, logout, useStore, byId } from '../data/store.js'
import { Logo } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'

const TABS = {
  family: [
    { to: '/app/familia', icon: 'home', key: 'home', end: true },
    { to: '/app/familia/reservar', icon: 'calendar', key: 'book' },
    { to: '/app/familia/plan', icon: 'plan', key: 'plan' },
    { to: '/app/familia/mas', icon: 'more', key: 'more' },
  ],
  admin: [
    { to: '/app/direccion', icon: 'clock', key: 'today', end: true },
    { to: '/app/direccion/cobros', icon: 'cash', key: 'payments' },
    { to: '/app/direccion/reportes', icon: 'chart', key: 'reports' },
  ],
}
const RIDER_KEY = 'hipico.rider'

export default function AppShell({ role }) {
  const { t } = useI18n()
  const s = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const { pathname } = useLocation()

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

  const onLogout = () => {
    logout()
    toast(t('app.loggedOut'), 'info')
    navigate('/app')
  }
  const family = role === 'family' ? byId(s.families, s.session.familyId) : null

  return (
    <div className="app">
      <header className="appbar">
        <Logo compact />
        <div className="appbar__right">
          <LangToggle />
          <button type="button" className="iconbtn" onClick={onLogout} aria-label={t('app.logout')} title={t('app.logout')}>
            <Icon name="logout" size={20} />
          </button>
        </div>
      </header>
      <div className="appbar__role">
        <span>{role === 'admin' ? t('app.roleAdmin') : family?.name}</span>
        <span className="appbar__demo">{t('app.demo')}</span>
      </div>
      <main className="app__main">
        <Outlet context={{ riders, riderId: activeRiderId, setRiderId }} />
      </main>
      <nav className="tabbar" aria-label={t('app.nav')}>
        {TABS[role].map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
            <Icon name={tab.icon} size={22} />
            <span>{t(`tabs.${tab.key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
