import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Icon } from './Icon.jsx'

/** "← Volver al sitio": the club's website in the app's language (`/` or `/en`). */
export function siteHome(lang) {
  return lang === 'en' ? '/en' : '/'
}

export function BackToSite({ className = 'link backsite', label = 'app.backToSite', iconSize = 18, children }) {
  const { t, lang } = useI18n()
  return (
    <Link to={siteHome(lang)} className={className}>
      {children || <><Icon name="arrowLeft" size={iconSize} /> <span>{t(label)}</span></>}
    </Link>
  )
}
