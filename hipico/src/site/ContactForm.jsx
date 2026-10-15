import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { waLink } from '../components/ui.jsx'
import { sendContactMessage } from './contact.js'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const CHANNELS = ['whatsapp', 'email']
// Server answers → the field that shows them (anything else is a general line under the button).
const FIELD_OF = { missing: 'name', contactRequired: 'phone', badEmail: 'email', badPhone: 'phone' }
const MSG_OF = { missing: 'name', contactRequired: 'contact', badEmail: 'badEmail', badPhone: 'badPhone', tooMany: 'tooMany', network: 'network' }

/**
 * The website's contact form: name, WhatsApp or email (one of the two), how to reply, the message pre-filled with
 * the service, a hidden field that only bots fill in. "Enviar mensaje" shows a spinner; then a calm thank-you.
 * `service`: the lightbox's service key (null from Visítanos). `onBack`: "← Volver" to the service text.
 */
export function ContactForm({ service = null, prefill = null, onBack, titleId }) {
  const { t, lang } = useI18n()
  const fresh = () => ({ name: '', phone: '', email: '', channel: 'whatsapp', website: '', message: prefill ?? (service ? t('site.contact.prefill', { service: t(`site.sheet.${service}.title`) }) : '') })
  const [f, setF] = useState(fresh)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)
  const nameRef = useRef(null)
  const doneRef = useRef(null)
  useEffect(() => { nameRef.current?.focus() }, [])
  useEffect(() => { if (sent) doneRef.current?.focus() }, [sent])

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errors[k] || errors.general) setErrors({}) }
  const check = () => {
    const e = {}
    const phone = f.phone.trim()
    const email = f.email.trim()
    if (!f.name.trim()) e.name = t('site.contact.errors.name')
    if (!phone && !email) e.phone = t('site.contact.errors.contact')
    else if (f.channel === 'whatsapp' && !phone) e.phone = t('site.contact.errors.needPhone')
    else if (f.channel === 'email' && !email) e.email = t('site.contact.errors.needEmail')
    if (email && !EMAIL_RE.test(email)) e.email = t('site.contact.errors.badEmail')
    if (phone && phone.replace(/\D/g, '').length < 8) e.phone = t('site.contact.errors.badPhone')
    return e
  }
  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const e = check()
    if (Object.keys(e).length) { setErrors(e); return }
    setBusy(true)
    const res = await sendContactMessage({
      name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), channel: f.channel, service: service || '', message: f.message.trim(),
      page: window.location.pathname, lang, website: f.website,
    })
    setBusy(false)
    if (!res.ok) {
      const field = FIELD_OF[res.code] || 'general'
      setErrors({ [field]: t(`site.contact.errors.${MSG_OF[res.code] || 'network'}`) })
      return
    }
    setSent({ name: f.name.trim().split(/\s+/)[0], channel: f.channel })
    setF(fresh())
  }
  const Err = ({ k }) => (errors[k] ? <small className="cform__err" role="alert">{errors[k]}</small> : null)

  if (sent) {
    return (
      <div className="cform__done" ref={doneRef} tabIndex={-1}>
        <span className="cform__check" aria-hidden="true"><SiteIcon name="check" size={28} /></span>
        <p className="cform__thanks" id={titleId}>{t('site.contact.done', { name: sent.name, channel: t(`site.contact.doneChannels.${sent.channel}`) })}</p>
        <button type="button" className="slinkarrow" onClick={() => setSent(null)}>{t('site.contact.another')}</button>
      </div>
    )
  }
  return (
    <form className="cform" onSubmit={submit} noValidate>
      {onBack && <button type="button" className="sback" onClick={onBack}><span aria-hidden="true">←</span> {t('site.contact.back')}</button>}
      <h2 className="kinetic is-in" id={titleId}>{t('site.contact.title')}</h2>
      <p className="slead">{t('site.contact.lead')}</p>
      <label className="cfield">
        <span>{t('site.contact.name')}</span>
        <input ref={nameRef} name="name" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={Boolean(errors.name)} />
        <Err k="name" />
      </label>
      <div className="cform__pair">
        <label className="cfield">
          <span>{t('site.contact.phone')}</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} />
          <Err k="phone" />
        </label>
        <label className="cfield">
          <span>{t('site.contact.email')}</span>
          <input name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} />
          <Err k="email" />
        </label>
      </div>
      {!errors.phone && !errors.email && <small className="cform__hint">{t('site.contact.oneOf')}</small>}
      <div className="cfield" role="radiogroup" aria-labelledby="cform-channel">
        <span id="cform-channel">{t('site.contact.channel')}</span>
        <div className="cpills">
          {CHANNELS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={f.channel === c} className={`cpill ${f.channel === c ? 'is-active' : ''}`}
              onClick={() => { setF({ ...f, channel: c }); setErrors({}) }}>
              <SiteIcon name={c === 'whatsapp' ? 'whatsapp' : 'mail'} size={18} /> {t(`site.contact.channels.${c}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="cfield">
        <span>{t('site.contact.message')}</span>
        <textarea name="message" rows={4} value={f.message} onChange={set('message')} placeholder={t('site.contact.placeholder')} maxLength={2000} />
      </label>
      <div className="cform__hp" aria-hidden="true">
        <label>{t('site.contact.website')}<input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label>
      </div>
      <div className="cform__foot">
        <button type="submit" className={`sbtn sbtn--deep ${busy ? 'is-busy' : ''}`} disabled={busy} aria-busy={busy}>
          <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{t(busy ? 'site.contact.sending' : 'site.contact.send')}</span>
        </button>
        {errors.general && <small className="cform__err" role="alert">{errors.general} <a href={waLink(t('site.wa.general'))} target="_blank" rel="noopener noreferrer">WhatsApp</a></small>}
      </div>
    </form>
  )
}
