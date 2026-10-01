import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SiteLayout from './site/SiteLayout.jsx'
import Home from './site/pages/Home.jsx'
import { PAGES } from './site/routes.js'
import { useI18n } from './i18n/I18nProvider.jsx'

// The website loads on its own; the app's code comes only when /app, /demo or /vista opens.
const LIVE_CONFIGURED = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Backend = lazy(() => import('./app/Backend.jsx'))
const PAGE_VIEWS = {
  classes: lazy(() => import('./site/pages/Classes.jsx')),
  boarding: lazy(() => import('./site/pages/Boarding.jsx')),
  competitions: lazy(() => import('./site/pages/Competitions.jsx')),
  therapy: lazy(() => import('./site/pages/Therapy.jsx')),
  events: lazy(() => import('./site/pages/Events.jsx')),
  sales: lazy(() => import('./site/pages/Sales.jsx')),
  contact: lazy(() => import('./site/pages/Contact.jsx')),
}

/** The download page (the QR and the posters open it) keeps its own title. */
function DownloadPage() {
  const { t } = useI18n()
  useEffect(() => { document.title = t('site.meta.download.title') }, [t])
  return <Landing />
}

const sitePages = (lang) => PAGES.filter((p) => p.key !== 'home').map((p) => {
  const View = PAGE_VIEWS[p.key]
  return <Route key={p.key} path={p[lang]} element={<View />} />
})

export default function App() {
  return (
    <Suspense fallback={<div className="route-wait" />}>
      <Routes>
        <Route path="/" element={<SiteLayout lang="es" />}>
          <Route index element={<Home />} />
          {sitePages('es')}
        </Route>
        <Route path="/en" element={<SiteLayout lang="en" />}>
          <Route index element={<Home />} />
          {sitePages('en')}
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
