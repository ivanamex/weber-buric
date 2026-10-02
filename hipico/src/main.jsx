import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/archivo/standard.css'
import '@fontsource-variable/hanken-grotesk/wght.css'
import './styles.css'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { ToastProvider } from './components/Toast.jsx'
import App from './App.jsx'
import { captureInstallPrompt } from './lib/install.js'

captureInstallPrompt()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
