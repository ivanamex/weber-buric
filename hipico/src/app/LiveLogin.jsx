import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { logout, resume, selfSignup, sendLink, signInPassword, useStore, verifyCode, LEVELS } from '../data/store.js'
import { refresh } from '../data/live.js'
import { Mark } from '../components/Logo.jsx'
import { LangToggle } from '../components/LangToggle.jsx'
import { Icon } from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useBase } from './Backend.jsx'

const EMAIL_KEY = 'hipico.loginEmail'
const CODE_LENGTH = 6
const RESEND_SECONDS = 60
const readEmail = () => { try { return localStorage.getItem(EMAIL_KEY) || '' } catch { return '' } }

/** Real sign-in: email → login link (or the code in the same email, for the installed app on iPhone). */
export default function LiveLogin() {
  const { t } = useI18n()
  const s = useStore()
  const toast = useToast()
  const base = useBase()
  const [email, setEmail] = useState(readEmail)
  const [step, setStep] = useState('email')
  const [code, setCode] = useState('')
  const [password, setPasswordValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentAt, setSentAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const codeInput = useRef(null)
  const wait = Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000))
  useEffect(() => {
    if (step !== 'code' || wait === 0) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [step, wait])

  if (s.session) return <Navigate to={`${base}/${s.session.role === 'admin' ? 'direccion' : 'familia'}`} replace />

  const onSend = async (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast(t('errors.badEmail'), 'error')
    setBusy(true)
    const res = await sendLink(email)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    try { localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()) } catch { /* ignore */ }
    setSentAt(Date.now()); setNow(Date.now())
    setCode('')
    setStep('code')
    setTimeout(() => codeInput.current?.focus(), 50)
  }
  const onResend = async () => {
    if (wait > 0 || busy) return
    setBusy(true)
    const res = await sendLink(email)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    setSentAt(Date.now()); setNow(Date.now())
    toast(t('live.resent'))
  }
  const submitCode = async (value) => {
    if (busy || value.length !== CODE_LENGTH) return
    setBusy(true)
    const res = await verifyCode(email, value)
    setBusy(false)
    if (!res.ok) { toast(t(`errors.${res.code}`), 'error'); setCode(''); codeInput.current?.focus() }
  }
  const onCodeChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH) submitCode(digits) // typed, pasted or filled in by the phone
  }
  const onPassword = async (e) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast(t('errors.badEmail'), 'error')
    setBusy(true)
    const res = await signInPassword(email, password)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    try { localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase()) } catch { /* ignore */ }
  }
  const onResume = async () => {
    setBusy(true)
    await resume()
    setBusy(false)
  }
  const onVerify = (e) => {
    e.preventDefault()
    submitCode(code)
  }

  let body
  if (s.status === 'paused') {
    body = (
      <div className="login__panel">
        <p className="login__panelTitle">{t('live.pausedTitle')}</p>
        <p>{t('live.pausedText')}</p>
        <button type="button" className="btn btn--accent btn--block btn--lg" onClick={onResume} disabled={busy}>
          <span className="break">{t('live.continueAs', { email: s.email })}</span>
        </button>
        <button type="button" className="link link--light" onClick={() => logout({ full: true })}>{t('live.otherEmail')}</button>
      </div>
    )
  } else if (s.status === 'signup') {
    body = <SignupForm email={s.email} />
  } else if (s.status === 'deleted') {
    body = (
      <div className="login__panel">
        <p className="login__panelTitle">{t('live.deletedTitle')}</p>
        <p>{t('live.deletedText')}</p>
        <button type="button" className="btn btn--accent btn--block" onClick={() => logout()}>{t('live.otherEmail')}</button>
      </div>
    )
  } else if (s.status === 'inactive') {
    body = (
      <div className="login__panel">
        <p className="login__panelTitle">{t('live.inactiveTitle')}</p>
        <p>{t('live.inactiveText')}</p>
        <button type="button" className="btn btn--accent btn--block" onClick={() => logout()}>{t('live.otherEmail')}</button>
      </div>
    )
  } else if (s.status === 'noAccess') {
    body = (
      <div className="login__panel">
        <p className="login__panelTitle">{t('live.noAccessTitle')}</p>
        <p>{t('live.noAccessText', { email: s.email })}</p>
        <button type="button" className="btn btn--accent btn--block" onClick={() => logout()}>{t('live.otherEmail')}</button>
      </div>
    )
  } else if (s.status === 'error') {
    body = (
      <div className="login__panel">
        <p className="login__panelTitle">{t('live.errorTitle')}</p>
        <p>{t('live.errorText')}</p>
        <button type="button" className="btn btn--accent btn--block" onClick={() => refresh()}>{t('live.retry')}</button>
      </div>
    )
  } else if (step === 'code') {
    const mm = Math.floor(wait / 60)
    const ss = String(wait % 60).padStart(2, '0')
    body = (
      <form className="login__panel" onSubmit={onVerify}>
        <p className="login__panelTitle"><Icon name="info" size={18} /> {t('live.checkEmail')}</p>
        <p>{t('live.sentCode', { email: email.trim().toLowerCase() })}</p>
        <label className="otp" htmlFor="login-code">
          <span className="visually-hidden">{t('live.codeLabel')}</span>
          <input ref={codeInput} id="login-code" className="otp__input" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]*" maxLength={CODE_LENGTH} value={code} autoFocus disabled={busy}
            onChange={(e) => onCodeChange(e.target.value)}
            onPaste={(e) => { e.preventDefault(); onCodeChange(e.clipboardData.getData('text')) }} />
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <span key={i} className={`otp__cell ${i === code.length ? 'is-current' : ''} ${code[i] ? 'is-filled' : ''}`} aria-hidden="true">{code[i] || ''}</span>
          ))}
        </label>
        <button type="submit" className="btn btn--accent btn--block" disabled={busy || code.length !== CODE_LENGTH}>{busy ? '…' : t('live.enter')}</button>
        <button type="button" className="btn btn--outline btn--block" onClick={onResend} disabled={wait > 0 || busy}>
          {wait > 0 ? t('live.resendIn', { time: `${mm}:${ss}` }) : t('live.resend')}
        </button>
        <p className="small muted center">{t('live.linkFallback')}</p>
        <button type="button" className="link link--light" onClick={() => { setStep('email'); setCode('') }}>{t('live.otherEmail')}</button>
      </form>
    )
  } else if (step === 'password') {
    body = (
      <form className="login__panel" onSubmit={onPassword}>
        <label className="field" htmlFor="login-email">
          <span>{t('live.emailLabel')}</span>
          <input id="login-email" className="input" type="email" inputMode="email" autoComplete="username"
            placeholder="nombre@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field" htmlFor="login-password">
          <span>{t('live.passwordLabel')}</span>
          <input id="login-password" className="input" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPasswordValue(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn--accent btn--block" disabled={busy}>{busy ? '…' : t('live.enter')}</button>
        <button type="button" className="link link--light" onClick={() => setStep('email')}>{t('live.forgot')}</button>
      </form>
    )
  } else {
    body = (
      <form className="login__panel" onSubmit={onSend}>
        <label className="field" htmlFor="login-email">
          <span>{t('live.emailLabel')}</span>
          <input id="login-email" className="input" type="email" inputMode="email" autoComplete="email"
            placeholder="nombre@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn--accent btn--block" disabled={busy}>{busy ? '…' : t('live.sendLink')}</button>
        <p className="small">{t('live.emailHint')}</p>
        <button type="button" className="link link--light" onClick={() => setStep('password')}>{t('live.havePassword')}</button>
      </form>
    )
  }

  return (
    <div className="login">
      <div className="login__top">
        <Link to="/" className="login__back"><Icon name="chevronLeft" size={18} /> {t('login.back')}</Link>
        <LangToggle />
      </div>
      <div className="login__body">
        <Mark size={64} />
        <h1>Hípico Riviera Maya</h1>
        <p>{t('live.subtitle')}</p>
        {body}
        <Link to="/demo" className="login__note"><Icon name="sparkle" size={16} /> {t('live.seeDemo')}</Link>
      </div>
    </div>
  )
}

/** First sign-in with an email the club doesn't know yet: one short form, then straight into the app. */
function SignupForm({ email }) {
  const { t } = useI18n()
  const toast = useToast()
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [riders, setRiders] = useState([{ name: '', level: 'beginner' }])
  const [busy, setBusy] = useState(false)
  const update = (i, patch) => setRiders(riders.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await selfSignup({ contact, phone, riders: riders.filter((r) => r.name.trim()) })
    setBusy(false)
    if (!res.ok) toast(t(`errors.${res.code}`), 'error')
  }
  return (
    <form className="login__panel" onSubmit={onSubmit}>
      <p className="login__panelTitle">{t('live.signupTitle')}</p>
      <p>{t('live.signupText', { email })}</p>
      <label className="field" htmlFor="su-contact"><span>{t('admin.families.contact')}</span>
        <input id="su-contact" className="input" autoComplete="name" value={contact} onChange={(e) => setContact(e.target.value)} required />
      </label>
      <label className="field" htmlFor="su-phone"><span>{t('admin.families.phone')}</span>
        <input id="su-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <div className="field"><span>{t('admin.families.riders')}</span>
        {riders.map((r, i) => (
          <div key={i} className="rider-row rider-row--2">
            <input id={`su-rider-${i}`} className="input" placeholder={t('admin.families.riderName')} aria-label={t('admin.families.riderName')}
              value={r.name} onChange={(e) => update(i, { name: e.target.value })} required={i === 0} />
            <select id={`su-level-${i}`} className="input" aria-label={t('admin.families.level')} value={r.level} onChange={(e) => update(i, { level: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
            </select>
          </div>
        ))}
        <button type="button" className="link link--light" onClick={() => setRiders([...riders, { name: '', level: 'beginner' }])}>+ {t('more.profile.addRider')}</button>
      </div>
      <button type="submit" className="btn btn--accent btn--block" disabled={busy}>{busy ? '…' : t('live.signupSubmit')}</button>
      <button type="button" className="link link--light" onClick={() => logout()}>{t('live.otherEmail')}</button>
    </form>
  )
}
