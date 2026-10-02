import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { planList, useSiteData } from './siteData.js'

const wa = (text) => ({ href: waLink(text), target: '_blank', rel: 'noopener noreferrer' })
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A service in full: photo on the left, the explanation, what's included and the prices on the right
 * (stacked and scrolling inside on phones). Prices always come from the app; "Consulta" when one is missing.
 * Esc and the close button close it; Tab stays inside while it's open.
 */
export function ServiceSheet({ service, onClose }) {
  const { t, fmtMoney } = useI18n()
  const data = useSiteData()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    closeBtn.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
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
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; before?.focus?.() }
  }, [onClose])

  const price = (n) => (n > 0 ? fmtMoney(n) : t('site.sheet.ask'))
  const plans = planList(data?.prices)
  const lowest = plans.length ? Math.min(...plans.map((p) => p.price)) : 0
  const Row = ({ name, note, value }) => (
    <li className="ssheetrow"><div><b>{name}</b>{note && <em>{note}</em>}</div><span>{value}</span></li>
  )

  let body
  if (service.key === 'classes') {
    body = (
      <>
        <ul className="ssheet2__rows">
          <Row name={t('site.sheet.classes.trial')} note={t('site.sheet.classes.trialNote')} value={price(data?.prices?.class_trial)} />
          <Row name={t('site.sheet.classes.plans', { list: (plans.length ? plans.map((p) => p.classes) : [4, 8, 12]).join(' · ') })}
            note={t('site.sheet.classes.plansNote')} value={lowest ? t('site.sheet.from', { price: fmtMoney(lowest) }) : t('site.sheet.ask')} />
          <Row name={t('site.sheet.classes.daily')} note={t('site.sheet.classes.dailyNote')} value={t('site.sheet.ask')} />
          <Row name={t('site.sheet.classes.custom')} note={t('site.sheet.classes.customNote')} value={t('site.sheet.ask')} />
        </ul>
        <div className="ssheet2__ctas">
          <a className="sbtn sbtn--deep" {...wa(t('site.wa.trial'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.ctaTrial')}</span></a>
          <a className="sbtn sbtn--line" {...wa(t('site.wa.classes'))}>{t('site.sheet.write')}</a>
        </div>
      </>
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
        <div className="ssheet2__ctas">
          <a className="sbtn sbtn--deep" {...wa(t('site.wa.boarding'))}><span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t('site.boarding.cta')}</span></a>
        </div>
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
        <div className="ssheet2__ctas">
          <a className="sbtn sbtn--deep" {...wa(t(comp ? 'site.wa.competitions' : 'site.wa.early'))}>
            <span className="sbtn__in"><SiteIcon name="whatsapp" size={20} /> {t(comp ? 'site.competitions.cta' : 'site.sheet.early.cta')}</span>
          </a>
        </div>
      </>
    )
  }

  return createPortal(
    <div className="ssheet2" role="dialog" aria-modal="true" aria-labelledby="ssheet2-title">
      <button type="button" className="ssheet2__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="ssheet2__panel" ref={panel}>
        <button ref={closeBtn} type="button" className="ssheet2__close" aria-label={t('site.sheet.close')} onClick={onClose}><SiteIcon name="x" size={22} /></button>
        <figure className="ssheet2__photo"><img src={service.photo.src} width={service.photo.w} height={service.photo.h} alt={service.alt} style={service.position ? { objectPosition: service.position } : undefined} /></figure>
        <div className="ssheet2__body">
          <h2 id="ssheet2-title" className="kinetic is-in">{t(`site.sheet.${service.key}.title`)}</h2>
          <p className="slead">{t(`site.sheet.${service.key}.text`)}</p>
          {body}
        </div>
      </div>
    </div>,
    document.body,
  )
}
