import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

let sdk = null
const loadSdk = () => (sdk ||= new Promise((resolve, reject) => {
  if (window.MercadoPago) return resolve(window.MercadoPago)
  const s = document.createElement('script')
  s.src = 'https://sdk.mercadopago.com/js/v2'
  s.async = true
  s.onload = () => resolve(window.MercadoPago)
  s.onerror = () => { sdk = null; reject(new Error('sdk')) }
  document.head.appendChild(s)
}))

/**
 * The "Tarjeta" part of a payment, shared by the website and the app.
 * mode: 'brick' — Mercado Pago's card form inside the page (number, expiry, CVV, name, installments), with the club's
 *         public key; its own button is hidden, the page's main button asks it for the card data;
 *       'redirect' — only the private key is in: Pagar jumps to Mercado Pago and back;
 *       'demo' — a pretend form with a test card, "Simulación de demo";
 *       'off' — not yet: one line pointing to the other ways.
 * api.current gets { getData() } — the card data for the payment, or null when the form isn't complete.
 */
export function CardForm({ mode, amount, email, publicKey, api }) {
  const { t, lang } = useI18n()
  const raw = useId()
  const id = `mpcard${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  const [state, setState] = useState('loading') // loading | ready | failed
  const ctrl = useRef(null)

  useEffect(() => {
    if (!api) return undefined
    if (mode === 'demo') api.current = { getData: async () => ({ demo: true }) }
    else if (mode === 'redirect') api.current = { getData: async () => ({ redirect: true }) }
    else if (mode === 'brick') api.current = { getData: async () => { try { return (await ctrl.current?.getFormData()) || null } catch { return null } } }
    else api.current = null
    return () => { api.current = null }
  }, [mode, api])

  useEffect(() => {
    if (mode !== 'brick' || !publicKey) return undefined
    let alive = true
    setState('loading')
    loadSdk().then(async (MP) => {
      if (!alive) return
      const mp = new MP(publicKey, { locale: lang === 'en' ? 'en-US' : 'es-MX' })
      const c = await mp.bricks().create('cardPayment', id, {
        initialization: { amount: Number(amount) || 0, ...(email ? { payer: { email } } : {}) },
        customization: {
          visual: { hidePaymentButton: true, style: { theme: 'default', customVariables: { baseColor: '#D9A441', borderRadiusMedium: '14px', borderRadiusSmall: '10px' } } },
          paymentMethods: { maxInstallments: 12 },
        },
        callbacks: {
          onReady: () => { if (alive) setState('ready') },
          onSubmit: () => Promise.resolve(),
          onError: (err) => { console.error('[card] form', err?.message || err); if (alive && err?.type === 'critical') setState('failed') },
        },
      })
      if (!alive) { c?.unmount?.(); return }
      ctrl.current = c
    }).catch(() => { if (alive) setState('failed') })
    return () => { alive = false; ctrl.current?.unmount?.(); ctrl.current = null }
  }, [mode, publicKey, amount, email, id, lang])

  if (mode === 'off') return <p className="cardform__note">{t('card.soon')}</p>
  if (mode === 'redirect') return <p className="cardform__note">{t('card.redirect')}</p>
  if (mode === 'demo') {
    return (
      <div className="cardform cardform--demo">
        <div className="cardform__demo">
          <label className="cardform__field cardform__field--wide"><span>{t('card.number')}</span><input readOnly value="5031 7557 3453 0604" /></label>
          <label className="cardform__field"><span>{t('card.expiry')}</span><input readOnly value="11/30" /></label>
          <label className="cardform__field"><span>{t('card.cvv')}</span><input readOnly value="123" /></label>
          <label className="cardform__field cardform__field--wide"><span>{t('card.name')}</span><input readOnly value="APRO" /></label>
        </div>
        <span className="cardform__tag">{t('pay.cardDemo')}</span>
      </div>
    )
  }
  return (
    <div className="cardform">
      {state === 'loading' && <p className="cardform__note">{t('card.loading')}</p>}
      {state === 'failed' && <p className="cardform__note">{t('card.failed')}</p>}
      <div id={id} className="cardform__brick" />
      <p className="cardform__secure">{t('card.secure')}</p>
    </div>
  )
}

/** Which card form a screen gets: the demo's, the one inside the page, the jump to Mercado Pago, or none yet. */
export const cardMode = ({ demo, enabled, publicKey }) => (demo ? 'demo' : !enabled ? 'off' : publicKey ? 'brick' : 'redirect')
