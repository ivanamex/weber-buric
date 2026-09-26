import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { login, useStore } from '../data/store.js'
import { Mark } from '../components/Logo.jsx'
import { useBase } from './Backend.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Login() {
  const { t } = useI18n()
  const { session } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const base = useBase()
  if (session) return <Navigate to={`${base}/${session.role === 'admin' ? 'direccion' : 'familia'}`} replace />

  const enter = async (role) => {
    await login(role)
    toast(t(role === 'admin' ? 'login.welcomeAdmin' : 'login.welcomeFamily'))
    navigate(`${base}/${role === 'admin' ? 'direccion' : 'familia'}`)
  }

  return (
    <div className="login">
      <div className="login__top">
        <Link to="/" className="login__back"><Icon name="chevronLeft" size={18} /> {t('login.back')}</Link>
        <LangToggle light />
      </div>
      <div className="login__body">
        <Mark size={76} />
        <h1>Hípico Riviera Maya</h1>
        <p>{t('login.subtitle')}</p>
        <div className="login__buttons">
          <button type="button" className="login__btn" onClick={() => enter('family')}>
            <span className="login__btnIcon"><Icon name="users" size={26} /></span>
            <span><strong>{t('login.family')}</strong><small>{t('login.familyHint')}</small></span>
            <Icon name="chevronRight" size={20} />
          </button>
          <button type="button" className="login__btn login__btn--gold" onClick={() => enter('admin')}>
            <span className="login__btnIcon"><Icon name="chart" size={26} /></span>
            <span><strong>{t('login.admin')}</strong><small>{t('login.adminHint')}</small></span>
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
        <p className="login__note"><Icon name="info" size={16} /> {t('login.demoNote')}</p>
      </div>
    </div>
  )
}
