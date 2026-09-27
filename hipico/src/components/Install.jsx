import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { detectDevice, promptInstall, useInstallState } from '../lib/install.js'
import { setPassword, useStore } from '../data/store.js'
import { Icon } from './Icon.jsx'
import { useToast } from './Toast.jsx'

const OFFERED_KEY = 'hipico.installOffered'

/** Phone pictograms: rounded with an island on top (iPhone), squarer with a camera dot and nav keys (Android). */
function PhoneGlyph({ kind }) {
  return kind === 'ios' ? (
    <svg className="phoneglyph" viewBox="0 0 32 48" aria-hidden="true">
      <rect x="3" y="2" width="26" height="44" rx="7.5" className="phoneglyph__body" />
      <rect x="5.5" y="4.5" width="21" height="39" rx="5.5" className="phoneglyph__screen" />
      <rect x="12" y="7" width="8" height="2.6" rx="1.3" className="phoneglyph__ink" />
      <path d="M29 13v6" className="phoneglyph__edge" />
      <rect x="12.5" y="39.5" width="7" height="1.2" rx=".6" className="phoneglyph__ink" />
    </svg>
  ) : (
    <svg className="phoneglyph" viewBox="0 0 32 48" aria-hidden="true">
      <rect x="3.5" y="2" width="25" height="44" rx="4.5" className="phoneglyph__body" />
      <rect x="6" y="4.5" width="20" height="39" rx="2.5" className="phoneglyph__screen" />
      <circle cx="16" cy="7.6" r="1.3" className="phoneglyph__ink" />
      <path d="M3.5 12v5" className="phoneglyph__edge" />
      <path d="m11 40.2 1.8-1.4v2.8zM15 40.2h2M20 39.2h1.8v1.8H20z" className="phoneglyph__keys" />
    </svg>
  )
}

function Sheet({ title, onClose, arrow, children }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="isheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="isheet__scrim" aria-label={t('install.close')} tabIndex={-1} onClick={onClose} />
      <div className={`isheet__panel ${arrow ? 'has-arrow' : ''}`}>
        <div className="isheet__head">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="iconbtn" onClick={onClose} aria-label={t('install.close')}><Icon name="x" size={20} /></button>
        </div>
        {children}
        {arrow && <span className="isheet__arrow" aria-hidden="true"><Icon name="arrowDown" size={30} /></span>}
      </div>
    </div>
  )
}

function Step({ n, title, hint, children }) {
  return (
    <li className="istep">
      <span className="istep__num">{n}</span>
      <div className="istep__text"><strong>{title}</strong><span>{hint}</span></div>
      <div className="istep__ill" aria-hidden="true">{children}</div>
    </li>
  )
}

function IosSheet({ onClose, onPhone, arrow }) {
  const { t } = useI18n()
  return (
    <Sheet title={t('install.iosTitle')} onClose={onClose} arrow={arrow}>
      {!onPhone && <p className="isheet__note"><Icon name="phone" size={16} /> {t('install.otherPhone')}</p>}
      <ol className="isteps">
        <Step n={1} title={t('install.iosStep1')} hint={t('install.iosStep1Hint')}>
          <div className="ill ill--safari">
            <div className="ill__url">hipico-riviera-maya…</div>
            <div className="ill__bar">
              <Icon name="chevronLeft" size={18} /><Icon name="chevronRight" size={18} />
              <span className="ill__hit"><Icon name="share" size={20} /></span>
              <Icon name="book" size={18} /><Icon name="tabs" size={18} />
            </div>
          </div>
        </Step>
        <Step n={2} title={t('install.iosStep2')} hint={t('install.iosStep2Hint')}>
          <div className="ill ill--list">
            <div className="ill__row is-faint"><Icon name="copy" size={16} /> <span className="ill__line" /></div>
            <div className="ill__row ill__row--hit"><span>{t('install.illAdd')}</span><Icon name="addSquare" size={18} /></div>
            <div className="ill__row is-faint"><Icon name="book" size={16} /> <span className="ill__line" /></div>
          </div>
        </Step>
      </ol>
    </Sheet>
  )
}

function AndroidSheet({ onClose, onPhone }) {
  const { t } = useI18n()
  return (
    <Sheet title={t('install.andTitle')} onClose={onClose}>
      {!onPhone && <p className="isheet__note"><Icon name="phone" size={16} /> {t('install.otherPhone')}</p>}
      <ol className="isteps">
        <Step n={1} title={t('install.andStep')} hint={t('install.andHint')}>
          <div className="ill ill--chrome">
            <div className="ill__top"><div className="ill__url">hipico-riviera-maya…</div><span className="ill__hit"><Icon name="kebab" size={18} /></span></div>
            <div className="ill__menu">
              <div className="ill__row is-faint"><Icon name="plus" size={16} /> {t('install.illNewTab')}</div>
              <div className="ill__row is-faint"><Icon name="clock" size={16} /> {t('install.illHistory')}</div>
              <div className="ill__row ill__row--hit"><Icon name="install" size={18} /> {t('install.illInstall')}</div>
            </div>
          </div>
        </Step>
      </ol>
    </Sheet>
  )
}

function InAppSheet({ app, platform, onClose }) {
  const { t } = useI18n()
  const toast = useToast()
  const browser = platform === 'ios' ? 'Safari' : 'Chrome'
  const url = typeof window === 'undefined' ? '' : window.location.origin + '/'
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast(t('install.copied', { browser }))
    } catch {
      toast(url, 'info')
    }
  }
  return (
    <Sheet title={t('install.inAppTitle', { browser })} onClose={onClose}>
      <p className="isheet__text">{t('install.inAppText', { app: app || t('install.otherApp'), browser })}</p>
      <div className="isheet__url break">{url}</div>
      <button type="button" className="btn btn--primary btn--block btn--lg" onClick={copy}><Icon name="copy" size={20} /> {t('install.copy')}</button>
    </Sheet>
  )
}

/** "Descargar para iPhone / Android". Hidden once the app runs installed. */
export function InstallButtons({ className = '', onChoice }) {
  const { t } = useI18n()
  const toast = useToast()
  const { canPrompt, standalone } = useInstallState()
  const [device] = useState(() => detectDevice())
  const [sheet, setSheet] = useState(null)
  if (standalone) return null

  const open = async (kind) => {
    onChoice?.()
    if (device.inApp !== null && device.platform !== 'desktop') return setSheet('inApp')
    if (kind === 'android' && device.platform === 'android' && canPrompt) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') return toast(t('install.installed'))
      if (outcome === 'dismissed') return undefined
    }
    setSheet(kind)
  }
  const close = () => setSheet(null)
  const button = (kind) => {
    const yours = device.platform === kind
    return (
      <button type="button" className={`dlbtn ${yours ? 'is-yours' : ''}`} onClick={() => open(kind)}>
        <PhoneGlyph kind={kind} />
        <span className="dlbtn__text">
          {yours && <small>{t('install.yours')}</small>}
          <strong>{t(kind === 'ios' ? 'install.iphone' : 'install.android')}</strong>
        </span>
      </button>
    )
  }
  // The visitor's phone goes first.
  const order = device.platform === 'android' ? ['android', 'ios'] : ['ios', 'android']
  return (
    <>
      <div className={`dlbtns ${className}`}>{order.map((k) => <span key={k} className="dlbtns__item">{button(k)}</span>)}</div>
      {sheet === 'ios' && <IosSheet onClose={close} onPhone={device.platform === 'ios'} arrow={device.safari && !device.iPad} />}
      {sheet === 'android' && <AndroidSheet onClose={close} onPhone={device.platform === 'android'} />}
      {sheet === 'inApp' && <InAppSheet app={device.inApp} platform={device.platform} onClose={close} />}
    </>
  )
}

/** Offered once, right after the first sign-in on a phone that hasn't installed the app. */
export function InstallPrompt() {
  const { t } = useI18n()
  const { standalone } = useInstallState()
  const [show] = useState(() => {
    try { return !localStorage.getItem(OFFERED_KEY) } catch { return false }
  })
  const [open, setOpen] = useState(true)
  useEffect(() => {
    if (show) try { localStorage.setItem(OFFERED_KEY, '1') } catch { /* ignore */ }
  }, [show])
  if (!show || !open || standalone) return null
  return (
    <section className="card installcard" aria-label={t('install.promptTitle')}>
      <div className="row between gap">
        <div>
          <p className="card__title">{t('install.promptTitle')}</p>
          <p className="small muted">{t('install.promptText')}</p>
        </div>
        <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label={t('install.later')}><Icon name="x" size={18} /></button>
      </div>
      <InstallButtons className="dlbtns--compact" />
      <button type="button" className="link installcard__later" onClick={() => setOpen(false)}>{t('install.later')}</button>
    </section>
  )
}

const NUDGE_KEY = 'hipico.passwordNudge'

/**
 * After signing in by email link in Safari on an iPhone: offer a password once, so the installed app
 * (which can't open email links) can sign in without waiting for a code.
 */
export function PasswordNudge() {
  const { t } = useI18n()
  const toast = useToast()
  const s = useStore()
  const { standalone } = useInstallState()
  const [show] = useState(() => {
    try { return !localStorage.getItem(NUDGE_KEY) } catch { return false }
  })
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const eligible = show && !standalone && !s.hasPassword && detectDevice().platform === 'ios' && (s.mode === 'demo' || s.viaLink)
  useEffect(() => {
    if (eligible) try { localStorage.setItem(NUDGE_KEY, '1') } catch { /* ignore */ }
  }, [eligible])
  if (!eligible || !open) return null
  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await setPassword(value)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('more.password.saved'))
    setOpen(false)
  }
  return (
    <form className="card installcard" onSubmit={onSave} aria-label={t('nudge.title')}>
      <div className="row between gap">
        <p className="card__title">{t('nudge.title')}</p>
        <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label={t('install.later')}><Icon name="x" size={18} /></button>
      </div>
      <input type="email" autoComplete="username" value={s.session?.email || ''} readOnly hidden />
      <label className="field" htmlFor="nudge-password"><span>{t('more.password.new')}</span>
        <input id="nudge-password" className="input" type="password" autoComplete="new-password" minLength={8}
          value={value} onChange={(e) => setValue(e.target.value)} required />
      </label>
      <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? '…' : t('nudge.save')}</button>
      <button type="button" className="link installcard__later" onClick={() => setOpen(false)}>{t('install.later')}</button>
    </form>
  )
}
