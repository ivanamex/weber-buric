import { createContext, useContext, useEffect, useLayoutEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { activate, useStore } from '../data/store.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Mark } from '../components/Logo.jsx'
import Login from './Login.jsx'
import LiveLogin from './LiveLogin.jsx'
import AppShell from './AppShell.jsx'
import FamilyHome from './family/Home.jsx'
import FamilyBook from './family/Book.jsx'
import FamilyPlan from './family/Plan.jsx'
import FamilyMore from './family/More.jsx'
import AdminToday from './admin/Today.jsx'
import AdminPayments from './admin/Payments.jsx'
import AdminFamilies from './admin/Families.jsx'
import AdminReports from './admin/Reports.jsx'
import AdminSchedule from './admin/Schedule.jsx'
import AdminSummary from './admin/Summary.jsx'
import AdminPayroll from './admin/Payroll.jsx'
import AdminProfit from './admin/Profit.jsx'
import AdminModules from './admin/Modules.jsx'

const BaseContext = createContext('/app')
/** '/app' (live, or demo when Supabase isn't set up) or '/demo'. */
export const useBase = () => useContext(BaseContext)

export function Splash({ text }) {
  return (
    <div className="splash">
      <Mark size={64} />
      {text && <p>{text}</p>}
    </div>
  )
}

function RequireRole({ role, children }) {
  const { session } = useStore()
  const base = useBase()
  if (!session) return <Navigate to={base} replace />
  if (session.role !== role) return <Navigate to={`${base}/${session.role === 'admin' ? 'direccion' : 'familia'}`} replace />
  return children
}

const TOUR = ['familia', 'familia/reservar', 'familia/plan']
const TOUR_MS = 4200

/** The landing's phone preview: moves Inicio → Reservar → Mi plan on its own, scrolling each screen a little. */
function PreviewTour({ base }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const i = TOUR.findIndex((p) => pathname === `${base}/${p}`)
    const scroll = setTimeout(() => window.scrollTo({ top: 240, behavior: 'smooth' }), 1400)
    const next = setTimeout(() => navigate(`${base}/${TOUR[(i + 1) % TOUR.length]}`, { replace: true }), TOUR_MS)
    return () => { clearTimeout(scroll); clearTimeout(next) }
  }, [pathname, base, navigate])
  return null
}

/** Mounts the app for one data source (demo, live or the landing preview) under a base path. */
export default function Backend({ mode, base }) {
  const s = useStore()
  const { t } = useI18n()
  useLayoutEffect(() => { activate(mode) }, [mode])

  if (s.mode !== mode || s.status === 'loading' || s.status === 'idle') return <Splash text={t('live.loading')} />

  return (
    <BaseContext.Provider value={base}>
      <Routes>
        <Route index element={mode === 'live' ? <LiveLogin /> : mode === 'preview' ? <Navigate to="familia" replace /> : <Login />} />
        <Route path="familia" element={<RequireRole role="family"><AppShell role="family" /></RequireRole>}>
          <Route index element={<FamilyHome />} />
          <Route path="reservar" element={<FamilyBook />} />
          <Route path="plan" element={<FamilyPlan />} />
          <Route path="mas" element={<FamilyMore />} />
        </Route>
        <Route path="direccion" element={<RequireRole role="admin"><AppShell role="admin" /></RequireRole>}>
          <Route index element={<AdminSummary />} />
          <Route path="hoy" element={<AdminToday />} />
          <Route path="nomina" element={<AdminPayroll />} />
          <Route path="rentabilidad" element={<AdminProfit />} />
          <Route path="ajustes" element={<AdminModules />} />
          <Route path="horario" element={<AdminSchedule />} />
          <Route path="cobros" element={<AdminPayments />} />
          <Route path="familias" element={<AdminFamilies />} />
          <Route path="reportes" element={<AdminReports />} />
        </Route>
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
      {mode === 'preview' && <PreviewTour base={base} />}
    </BaseContext.Provider>
  )
}
