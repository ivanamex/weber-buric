import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { QrSvg, qrPngUrl, appLink } from '../../components/QrCode.jsx'
import { BrandLogo } from '../../components/Logo.jsx'
import { Icon } from '../../components/Icon.jsx'
import { useToast } from '../../components/Toast.jsx'

/** Printable sheet (A4 or A5): logo, "Descarga la app del club", the QR and three install steps, in Spanish and English. */
function Poster({ link }) {
  const { t } = useI18n()
  const steps = (lang) => [1, 2, 3].map((n) => t(`share.poster.${lang}.step${n}`))
  return createPortal(
    <div className="poster" aria-hidden="true">
      <BrandLogo variant="green" height={64} className="poster__logo" />
      <h1>{t('share.poster.es.title')}</h1>
      <p className="poster__en">{t('share.poster.en.title')}</p>
      <QrSvg value={link} size={300} className="poster__qr" />
      <p className="poster__link">{link.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
      <div className="poster__steps">
        {['es', 'en'].map((lang) => (
          <ol key={lang} lang={lang}>
            {steps(lang).map((s) => <li key={s}>{s}</li>)}
          </ol>
        ))}
      </div>
    </div>,
    document.body,
  )
}

/** Management → Compartir la app: a large QR with the logo, download, print, copy and WhatsApp. */
export default function ShareApp({ onClose }) {
  const { t } = useI18n()
  const toast = useToast()
  const link = appLink()
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!printing) return undefined
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done)
    const id = setTimeout(() => window.print(), 150) // let the logo load first
    return () => { clearTimeout(id); window.removeEventListener('afterprint', done) }
  }, [printing])

  const download = async () => {
    const url = await qrPngUrl(link, 1200)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hipico-riviera-maya-qr.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast(t('share.copied'))
    } catch {
      toast(link, 'info')
    }
  }
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(t('share.waText', { link }))}`

  return (
    <section className="card share" aria-label={t('share.title')}>
      <div className="row between">
        <p className="card__title">{t('share.title')}</p>
        {onClose && <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><Icon name="x" size={20} /></button>}
      </div>
      <p className="small muted">{t('share.text')}</p>
      <div className="share__qr"><QrSvg value={link} size={260} title={t('share.qrLabel')} /></div>
      <p className="share__link break">{link}</p>
      <div className="grid2">
        <button type="button" className="btn btn--primary" onClick={download}><Icon name="arrowDown" size={18} /> {t('share.download')}</button>
        <button type="button" className="btn" onClick={() => setPrinting(true)}><Icon name="receipt" size={18} /> {t('share.print')}</button>
      </div>
      <div className="grid2">
        <button type="button" className="btn" onClick={copy}><Icon name="copy" size={18} /> {t('share.copy')}</button>
        <a className="btn btn--whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> WhatsApp</a>
      </div>
      {printing && <Poster link={link} />}
    </section>
  )
}
