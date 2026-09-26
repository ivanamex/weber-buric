import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './app/Login.jsx'
import AppShell from './app/AppShell.jsx'
import FamilyHome from './app/family/Home.jsx'
import FamilyBook from './app/family/Book.jsx'
import FamilyPlan from './app/family/Plan.jsx'
import FamilyMore from './app/family/More.jsx'
import AdminToday from './app/admin/Today.jsx'
import AdminPayments from './app/admin/Payments.jsx'
import AdminReports from './app/admin/Reports.jsx'
import { useStore } from './data/store.js'

function RequireRole({ role, children }) {
  const { session } = useStore()
  if (!session) return <Navigate to="/app" replace />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/app/direccion' : '/app/familia'} replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Login />} />
      <Route path="/app/familia" element={<RequireRole role="family"><AppShell role="family" /></RequireRole>}>
        <Route index element={<FamilyHome />} />
        <Route path="reservar" element={<FamilyBook />} />
        <Route path="plan" element={<FamilyPlan />} />
        <Route path="mas" element={<FamilyMore />} />
      </Route>
      <Route path="/app/direccion" element={<RequireRole role="admin"><AppShell role="admin" /></RequireRole>}>
        <Route index element={<AdminToday />} />
        <Route path="cobros" element={<AdminPayments />} />
        <Route path="reportes" element={<AdminReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
