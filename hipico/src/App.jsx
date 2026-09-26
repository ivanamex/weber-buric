import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Backend from './app/Backend.jsx'
import { LIVE_CONFIGURED } from './data/store.js'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<Backend mode={LIVE_CONFIGURED ? 'live' : 'demo'} base="/app" />} />
      <Route path="/demo/*" element={<Backend mode="demo" base="/demo" />} />
      <Route path="/vista/*" element={<Backend mode="preview" base="/vista" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
