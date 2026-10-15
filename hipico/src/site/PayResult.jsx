import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { AppButton } from './SiteLayout.jsx'
import { homePath } from './routes.js'

const STATES = { recibido: 'received', pendiente: 'pending', rechazado: 'rejected', received: 'received', pending: 'pending', rejected: 'rejected' }

/** Where Mercado Pago sends the visitor back: Pago recibido · pendiente · rechazado. */
export default function PayResult() {
  const { t, lang } = useI18n()
  const { estado } = useParams()
  const state = STATES[estado] || 'pending'
  useEffect(() => { document.title = t('site.meta.pay') }, [t])
  return (
    <section className="sec spay" data-tone="light">
      <div className="scontainer spay__inner">
        <span className={`spay__mark spay__mark--${state}`} aria-hidden="true"><SiteIcon name={state === 'rejected' ? 'x' : state === 'pending' ? 'clock' : 'check'} size={30} /></span>
        <h1 className="kinetic is-in">{t(`site.pay.${state}.title`)}</h1>
        <p className="slead">{t(`site.pay.${state}.text`)}</p>
        <div className="sctas">
          <AppButton>{t('site.enroll.appBtn')}</AppButton>
          <Link className="sbtn sbtn--sage" to={homePath(lang)}>{t('site.pay.back')}</Link>
        </div>
      </div>
    </section>
  )
}
