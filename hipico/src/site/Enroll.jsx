import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { AppButton } from './SiteLayout.jsx'
import { planList } from './siteData.js'
import { cardCheckout, cardEnabled, enroll, sendReceipt, RECEIPT_MAX } from './enroll.js'
import { DateField } from './DateField.jsx'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const FIELD_OF = { missing: 'contact', badEmail: 'email', badPhone: 'phone' }

/**
 * Clases on the website: pick Clase muestra · Clase suelta · 4 · 8 · 12 clases al mes (A tu medida asks instead),
 * give the rider's and the parent's details, then pay by transfer (receipt → Cobros → Por revisar) or by card
 * (Mercado Pago, only when the club's keys are in). The family then enters the app with that email.
 */
export function Enroll({ data, onCustom }) {
  const { t, fmtMoney, fmtDate, lang } = useI18n()
  const [step, setStep] = useState('pick') // pick → form → pay → done
  const [option, setOption] = useState(null)
  const [f, setF] = useState({ rider: '', age: '', contact: '', phone: '', email: '', start: todayKey(), website: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState(null) // the charge: { payment_id, amount, family_name, … }
  const [card, setCard] = useState(false)
  const [done, setDone] = useState(null) // 'receipt' | 'later'
  const top = useRef(null)
  useEffect(() => { top.current?.scrollIntoView?.({ block: 'nearest' }) }, [step])
  useEffect(() => { if (step === 'pay') cardEnabled().then(setCard) }, [step])

  const prices = data?.prices || {}
  const plans = planList(prices)
  const price = (n) => (n > 0 ? fmtMoney(n) : t('site.sheet.ask'))
  const options = [
    { key: 'trial', name: t('site.sheet.classes.trial'), note: t('site.sheet.classes.trialNote'), amount: prices.class_trial },
    { key: 'single', name: t('site.sheet.classes.single'), note: t('site.sheet.classes.singleNote'), amount: prices.class_single },
    ...(plans.length ? plans : [4, 8, 12].map((classes) => ({ classes, price: 0 }))).map((p) => ({
      key: String(p.classes), name: t('site.sheet.classes.plan', { n: p.classes }), note: p.price ? t('site.enroll.perClass', { price: fmtMoney(Math.round(p.price / p.classes)) }) : t('site.sheet.classes.plansNote'),
      amount: p.price, popular: p.classes === 8,
    })),
    { key: 'custom', name: t('site.sheet.classes.custom'), note: t('site.sheet.classes.customNote'), amount: null, ask: true },
  ]
  const chosen = options.find((o) => o.key === option)
  const isClass = option === 'trial' || option === 'single'

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errors[k] || errors.general) setErrors({}) }
  const check = () => {
    const e = {}
    if (!f.rider.trim()) e.rider = t('site.enroll.errors.riderName')
    if (f.age !== '' && !(Number(f.age) >= 2 && Number(f.age) <= 99)) e.age = t('site.enroll.errors.age')
    if (!f.contact.trim()) e.contact = t('site.enroll.errors.contact')
    if (!EMAIL_RE.test(f.email.trim())) e.email = t('site.enroll.errors.email')
    if (f.phone.trim() && f.phone.replace(/\D/g, '').length < 8) e.phone = t('site.enroll.errors.phone')
    if (!f.start || f.start < todayKey()) e.start = t('site.enroll.errors.date')
    return e
  }
  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const e = check()
    if (Object.keys(e).length) { setErrors(e); return }
    setBusy(true)
    const res = await enroll({ option, rider: { name: f.rider.trim(), age: f.age === '' ? null : Number(f.age) }, contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), start: f.start, lang, website: f.website })
    setBusy(false)
    if (!res.ok) { setErrors({ [FIELD_OF[res.code] || 'general']: t(`errors.${res.code}`) }); return }
    if (res.bot) { setDone('later'); setStep('done'); return }
    setOrder(res)
    setStep('pay')
  }
  const reset = () => { setStep('pick'); setOption(null); setOrder(null); setDone(null); setErrors({}); setF({ ...f, rider: '', age: '', website: '' }) }
  const Err = ({ k }) => (errors[k] ? <small className="cform__err" role="alert">{errors[k]}</small> : null)

  if (step === 'pick') {
    return (
      <div className="enroll" ref={top}>
        <p className="enroll__lead">{t('site.enroll.pick')}</p>
        <div className="enroll__options" role="radiogroup" aria-label={t('site.enroll.pick')}>
          {options.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={option === o.key} className={`eopt ${option === o.key ? 'is-active' : ''}`} onClick={() => setOption(o.key)}>
              <span className="eopt__name">{o.name}{o.popular && <em className="eopt__tag">{t('site.enroll.popular')}</em>}</span>
              <span className="eopt__note">{o.note}</span>
              <span className="eopt__price">{o.ask ? t('site.sheet.ask') : price(o.amount)}</span>
            </button>
          ))}
        </div>
        {option === 'custom' && <p className="small enroll__hint">{t('site.enroll.customHint')}</p>}
        <div className="ssheet2__ctas">
          {option === 'custom'
            ? <button type="button" className="sbtn sbtn--deep" onClick={onCustom}>{t('site.enroll.request')}</button>
            : <button type="button" className="sbtn sbtn--deep" disabled={!option} onClick={() => setStep('form')}>{t('site.enroll.continue')}</button>}
        </div>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <form className="cform enroll" ref={top} onSubmit={submit} noValidate>
        <button type="button" className="sback" onClick={() => setStep('pick')}><span aria-hidden="true">←</span> {t('site.enroll.back')}</button>
        <p className="enroll__chosen"><strong>{t('site.enroll.chosen', { option: chosen?.name })}</strong> · {price(chosen?.amount)}</p>
        <div className="cform__pair cform__pair--age">
          <label className="cfield"><span>{t('site.enroll.riderName')}</span>
            <input name="rider" autoComplete="off" value={f.rider} onChange={set('rider')} aria-invalid={Boolean(errors.rider)} /><Err k="rider" /></label>
          <label className="cfield"><span>{t('site.enroll.riderAge')}</span>
            <input name="age" type="number" inputMode="numeric" min={2} max={99} value={f.age} onChange={set('age')} aria-invalid={Boolean(errors.age)} /><Err k="age" /></label>
        </div>
        <label className="cfield"><span>{t('site.enroll.contact')}</span>
          <input name="contact" autoComplete="name" value={f.contact} onChange={set('contact')} aria-invalid={Boolean(errors.contact)} /><Err k="contact" /></label>
        <div className="cform__pair">
          <label className="cfield"><span>{t('site.enroll.phone')}</span>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={Boolean(errors.phone)} /><Err k="phone" /></label>
          <label className="cfield"><span>{t('site.enroll.email')}</span>
            <input name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} /><Err k="email" />
            {!errors.email && <small className="cform__hint">{t('site.enroll.emailHint')}</small>}</label>
        </div>
        <label className="cfield cfield--date"><span>{t(isClass ? 'site.enroll.startClass' : 'site.enroll.start')}</span>
          <DateField name="start" min={todayKey()} value={f.start} onChange={set('start')} invalid={Boolean(errors.start)} /><Err k="start" />
          {isClass && !errors.start && <small className="cform__hint">{t('site.enroll.startHint')}</small>}</label>
        <div className="cform__hp" aria-hidden="true"><label>{t('site.contact.website')}<input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
        <div className="cform__foot">
          <button type="submit" className={`sbtn sbtn--deep ${busy ? 'is-busy' : ''}`} disabled={busy} aria-busy={busy}>
            <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{t(busy ? 'site.enroll.paying' : 'site.enroll.pay', { amount: price(chosen?.amount) })}</span>
          </button>
          {errors.general && <small className="cform__err" role="alert">{errors.general}</small>}
        </div>
      </form>
    )
  }

  if (step === 'pay') {
    return (
      <div className="enroll" ref={top}>
        <p className="enroll__chosen"><strong>{chosen?.name} · {f.rider.trim()}</strong> · {fmtMoney(order.amount)}</p>
        <PayStep order={order} card={card} lang={lang} bank={data?.bank} onDone={(how) => { setDone(how); setStep('done') }} />
      </div>
    )
  }

  const first = f.contact.trim().split(/\s+/)[0]
  return (
    <div className="cform__done enroll" ref={top} tabIndex={-1}>
      <span className="cform__check" aria-hidden="true"><SiteIcon name="check" size={28} /></span>
      <p className="cform__thanks">{t('site.enroll.doneTitle', { name: first })}</p>
      <p className="slead">{t(done === 'receipt' ? 'site.enroll.transferDone' : 'site.enroll.laterDone')}</p>
      <p className="small">{t('site.enroll.appLine', { email: f.email.trim() })}{isClass ? ` ${t('site.enroll.startHint')}` : ''}</p>
      <div className="ssheet2__ctas">
        <AppButton>{t('site.enroll.appBtn')}</AppButton>
        <button type="button" className="slinkarrow" onClick={reset}>{t('site.enroll.another')}</button>
      </div>
      {order?.start && !isClass && <p className="small muted">{fmtDate(order.start)}</p>}
    </div>
  )
}

/** Transferencia (bank details + the receipt) or Tarjeta (Mercado Pago, when it's on). */
function PayStep({ order, card, lang, bank, onDone }) {
  const { t, fmtMoney } = useI18n()
  const [method, setMethod] = useState('transfer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const input = useRef(null)
  const clabe = bank?.clabe ? String(bank.clabe).replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : null
  const copy = async () => { try { await navigator.clipboard.writeText(bank.clabe); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > RECEIPT_MAX) return setError(t('errors.fileTooBig'))
    setBusy(true); setError(null)
    const res = await sendReceipt(order.payment_id, file)
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
    onDone('receipt')
  }
  const goCard = async () => {
    setBusy(true); setError(null)
    const res = await cardCheckout(order.payment_id, lang)
    if (!res.ok) { setBusy(false); return setError(t(`errors.${res.code}`)) }
    window.location.assign(res.url)
  }
  return (
    <>
      <p className="cfield"><span>{t('site.enroll.howPay')}</span></p>
      <div className="cpills">
        <button type="button" role="radio" aria-checked={method === 'transfer'} className={`cpill ${method === 'transfer' ? 'is-active' : ''}`} onClick={() => setMethod('transfer')}><SiteIcon name="check" size={18} /> {t('site.enroll.transfer')}</button>
        {card && <button type="button" role="radio" aria-checked={method === 'card'} className={`cpill ${method === 'card' ? 'is-active' : ''}`} onClick={() => setMethod('card')}><SiteIcon name="card" size={18} /> {t('site.enroll.card')}</button>}
      </div>
      {method === 'card' ? (
        <div className="enroll__box">
          <p>{t('site.enroll.cardNote')}</p>
          <button type="button" className={`sbtn sbtn--deep ${busy ? 'is-busy' : ''}`} disabled={busy} onClick={goCard}>
            <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{t(busy ? 'site.enroll.cardWait' : 'site.enroll.cardGo')}</span>
          </button>
        </div>
      ) : (
        <div className="enroll__box">
          <p><strong>{t('site.enroll.transferTitle', { amount: fmtMoney(order.amount) })}</strong></p>
          {bank?.clabe ? (
            <dl className="ebank">
              {bank.bankName && <><dt>{t('receipt.bank')}</dt><dd>{bank.bankName}</dd></>}
              {bank.accountHolder && <><dt>{t('receipt.holder')}</dt><dd>{bank.accountHolder}</dd></>}
              <dt>CLABE</dt><dd className="ebank__clabe">{clabe} <button type="button" className="ebank__copy" onClick={copy}>{t(copied ? 'site.enroll.copied' : 'site.enroll.copy')}</button></dd>
            </dl>
          ) : <p className="small">{t('site.enroll.bankPending')}</p>}
          <p className="small">{t('site.enroll.concept', { ref: order.family_name })}</p>
          <input ref={input} type="file" accept={ACCEPT} className="cform__hp" onChange={onFile} tabIndex={-1} />
          <div className="ssheet2__ctas">
            <button type="button" className={`sbtn sbtn--deep ${busy ? 'is-busy' : ''}`} disabled={busy} onClick={() => input.current?.click()}>
              <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{t(busy ? 'site.enroll.uploading' : 'site.enroll.upload')}</span>
            </button>
            <button type="button" className="slinkarrow" onClick={() => onDone('later')}>{t('site.enroll.later')}</button>
          </div>
          <p className="small">{t('site.enroll.formats')}</p>
        </div>
      )}
      {error && <small className="cform__err" role="alert">{error}</small>}
    </>
  )
}
