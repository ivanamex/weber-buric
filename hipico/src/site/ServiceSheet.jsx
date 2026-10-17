import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { useSiteData } from './siteData.js'
import { BIG } from './content.js'
import { ContactForm } from './ContactForm.jsx'
import { Enroll } from './Enroll.jsx'
import { lockScroll } from '../lib/scrollLock.js'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * The website's lightbox: photo on the left, content on the right (stacked and scrolling inside on phones).
 * Esc and the close button close it; Tab stays inside while it's open.
 */
export function SiteDialog({ photo, alt, position, labelledBy, onClose, children, variant }) {
  const { t } = useI18n()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    closeBtn.current?.focus({ preventScroll: true })
    const unlock = lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); unlock(); before?.focus?.() }
  }, [onClose])
  return createPortal(
    <div className={`ssheet2 ${variant ? `ssheet2--${variant}` : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button type="button" className="ssheet2__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="ssheet2__panel" ref={panel}>
        <button ref={closeBtn} type="button" className="ssheet2__close" aria-label={t('site.sheet.close')} onClick={onClose}><SiteIcon name="x" size={22} /></button>
        <figure className="ssheet2__photo"><img src={photo.src} width={photo.w} height={photo.h} alt={alt} style={position ? { objectPosition: position } : undefined} /></figure>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/**
 * A service in full: the explanation, what's included and the prices. Prices always come from the app; "Consulta"
 * when one is missing. "Escríbenos" slides the right column to the contact form ("← Volver" comes back).
 */
export function ServiceSheet({ service, onClose }) {
  const { t, fmtMoney } = useI18n()
  const data = useSiteData()
  const [writing, setWriting] = useState(false)
  const [back, setBack] = useState(false) // coming back from the form: the text slides in from the left
  const write = () => { setWriting(true); setBack(true) }
  // "Más información": WhatsApp with a ready message, or the contact form. The same pair in every lightbox.
  const info = <InfoPills waText={t(`site.wa.${{ classes: 'classes', competitions: 'competitions', boarding: 'boarding', early: 'early' }[service.key] || 'general'}`)} onMessage={() => write()} />

  const price = (n) => (n > 0 ? fmtMoney(n) : t('site.sheet.ask'))
  const Row = ({ name, note, value }) => (
    <li className="ssheetrow"><div><b>{name}</b>{note && <em>{note}</em>}</div><span>{value}</span></li>
  )

  let body
  if (service.key === 'classes') {
    body = (
      <Enroll data={data} />
    )
  } else if (service.key === 'boarding') {
    body = (
      <>
        <ul className="slist">
          {['daily', 'feed', 'vet', 'farrier', 'app'].map((k) => (
            <li key={k}><SiteIcon name={{ daily: 'heart', feed: 'hay', vet: 'shield', farrier: 'horseshoe', app: 'phone' }[k]} size={22} /><span>{t(`site.boarding.care.${k}`)}</span></li>
          ))}
        </ul>
        {data?.prices?.boarding_monthly > 0 && (
          <ul className="ssheet2__rows"><Row name={t('site.sheet.boarding.monthly')} note={t('site.sheet.boarding.monthlyNote')} value={fmtMoney(data.prices.boarding_monthly)} /></ul>
        )}
        {info}
      </>
    )
  } else {
    const comp = service.key === 'competitions'
    body = (
      <>
        <ul className="slist">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}><SiteIcon name={comp ? (i === 3 ? 'trophy' : 'jump') : 'check'} size={22} /><span>{t(`site.sheet.${service.key}.items.${i}`)}</span></li>
          ))}
        </ul>
        {info}
      </>
    )
  }

  return (
    <SiteDialog photo={service.photo} alt={service.alt} position={service.position} labelledBy="ssheet2-title" onClose={onClose} variant={service.key === 'classes' ? 'classes' : null}>
      {writing ? (
        <div key="form" className="ssheet2__body ssheet2__body--in">
          <ContactForm service={service.key} titleId="ssheet2-title" onBack={() => setWriting(false)} />
        </div>
      ) : (
        <div key="info" className={`ssheet2__body ${service.key === 'classes' ? 'ssheet2__body--enroll' : ''} ${back ? 'ssheet2__body--back' : ''}`}>
          {service.key === 'classes' ? (
            <div className="ssheet2__head">
              <h2 id="ssheet2-title" className="kinetic is-in">{t('site.sheet.classes.title')}</h2>
              <p className="slead">{t('site.sheet.classes.text')}</p>
            </div>
          ) : (
            <>
              <h2 id="ssheet2-title" className="kinetic is-in">{t(`site.sheet.${service.key}.title`)}</h2>
              <p className="slead">{t(`site.sheet.${service.key}.text`)}</p>
            </>
          )}
          {body}
        </div>
      )}
    </SiteDialog>
  )
}

/** "¿Dudas?": two compact pills side by side, WhatsApp with a ready message and the contact form. The same pair everywhere. */
export function InfoPills({ waText, onMessage }) {
  const { t } = useI18n()
  return (
    <div className="ssheet2__info">
      <span className="ssheet2__infolabel">{t('site.info.title')}</span>
      <div className="ipills">
        <a className="sbtn sbtn--sage sbtn--pill" {...wa(waText)}><span className="sbtn__in"><SiteIcon name="whatsapp" size={18} /> {t('site.info.whatsapp')}</span></a>
        <button type="button" className="sbtn sbtn--sage sbtn--pill" onClick={onMessage}><span className="sbtn__in"><SiteIcon name="mail" size={18} /> {t('site.info.message')}</span></button>
      </div>
    </div>
  )
}

/** "Mensaje" from Visítanos: the same lightbox with only the contact form. */
export function ContactSheet({ onClose }) {
  const { t } = useI18n()
  const photo = BIG.nose
  return (
    <SiteDialog photo={{ src: photo.small, w: 800, h: 1067 }} alt={t('site.alt.nose')} position={photo.position} labelledBy="ssheet2-title" onClose={onClose}>
      <div className="ssheet2__body"><ContactForm titleId="ssheet2-title" /></div>
    </SiteDialog>
  )
}
