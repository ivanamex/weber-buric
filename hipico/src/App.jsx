import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SiteLayout from './site/SiteLayout.jsx'
import OnePage from './site/OnePage.jsx'
import { OLD_PAGES, homePath, sectionId } from './site/routes.js'
import { useI18n } from './i18n/I18nProvider.jsx'

// The website loads on its own; the app's code comes only when /app, /demo, /vista or /descargar opens.
const LIVE_CONFIGURED = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Backend = lazy(() => import('./app/Backend.jsx'))

/** The download page (the QR and the posters open it) keeps its own title. */
function DownloadPage() {
  const { t } = useI18n()
  useEffect(() => { document.title = t('site.meta.download') }, [t])
  return <Landing />
}

// The old separate pages land on their section of the one page.
const oldPages = (lang) => Object.entries(OLD_PAGES[lang]).map(([slug, key]) => (
  <Route key={slug} path={slug} element={<Navigate to={`${homePath(lang)}#${sectionId(key, lang)}`} replace />} />
))

export default function App() {
  return (
    <Suspense fallback={<div className="route-wait" />}>
      <Routes>
        <Route path="/" element={<SiteLayout lang="es" />}>
          <Route index element={<OnePage />} />
          {oldPages('es')}
        </Route>
        <Route path="/en" element={<SiteLayout lang="en" />}>
          <Route index element={<OnePage />} />
          {oldPages('en')}
        </Route>
        <Route path="/descargar" element={<DownloadPage />} />
        <Route path="/app/*" element={<Backend mode={LIVE_CONFIGURED ? 'live' : 'demo'} base="/app" />} />
        <Route path="/demo/*" element={<Backend mode="demo" base="/demo" />} />
        <Route path="/vista/*" element={<Backend mode="preview" base="/vista" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
