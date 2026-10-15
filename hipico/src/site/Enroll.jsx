import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { AppButton } from './SiteLayout.jsx'
import { planList } from './siteData.js'
import { cardCheckout, cardEnabled, enroll, payAtClubWeb, sendReceipt, RECEIPT_MAX } from './enroll.js'
import { DropZone, MethodCards } from '../components/PayOptions.jsx'
import { DateField } from './DateField.jsx'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const FIELD_OF = { missing: 'contact', badEmail: 'email', badPhone: 'phone' }
/** "ivana lópez" → "Ivana López" (a name typed all in lowercase); anything already capitalized stays as typed. */
export const nameCase = (s) => { const v = String(s || '').trim(); return v === v.toLowerCase() ? v.replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : v }

/**
 * Clases on the website, as in the approved draft: Plan mensual (4 · 8 · 12 cards, 8 preselected, a summary card with
 * the price per class and the saving worked out from the live prices) or Sin plan (Clase muestra · Clase suelta),
 * "A tu medida" as a link to the contact form; then the rider's and the parent's details, then the payment
 * (transfer with the receipt, card when the club's keys are in, or at the club). One footer stays at the bottom of
 * the sheet through the three steps: what was chosen on the left, the one main button on the right.
 */
export function Enroll({ data, onCustom, info }) {
  const { t, fmtMoney, fmtDate, lang } = useI18n()
  const [step, setStep] = useState('pick') // pick → form → pay → done
  const [tab, setTab] = useState('plan') // plan | single
  const [planN, setPlanN] = useState(8)
  const [single, setSingle] = useState('trial')
  const [f, setF] = useState({ rider: '', age: '', contact: '', phone: '', email: '', start: todayKey(), website: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState(null) // the charge: { payment_id, amount, family_name, … }
  const [card, setCard] = useState(false)
  const [done, setDone] = useState(null) // 'receipt' | 'later' | 'club'
  const top = useRef(null)
  useEffect(() => { top.current?.scrollIntoView?.({ block: 'nearest' }) }, [step])
  useEffect(() => { if (step === 'pay') cardEnabled().then(setCard) }, [step])

  const prices = data?.prices || {}
  const listed = planList(prices)
  const plans = listed.length ? listed : [4, 8, 12].map((classes) => ({ classes, price: 0 }))
  const plan = plans.find((p) => p.classes === planN) || plans[Math.min(1, plans.length - 1)]
  const price = (n) => (n > 0 ? fmtMoney(n) : t('site.sheet.ask'))
  const singles = [
    { key: 'trial', name: t('site.enroll.trialName'), note: t('site.enroll.trialNote'), amount: prices.class_trial },
    { key: 'single', name: t('site.enroll.singleName'), note: t('site.enroll.singleNote'), amount: prices.class_single },
  ]
  const option = tab === 'plan' ? String(plan.classes) : single
  const chosen = tab === 'plan'
    ? { name: t('site.sheet.classes.plan', { n: plan.classes }), amount: plan.price }
    : singles.find((o) => o.key === single)
  const isClass = tab === 'single'
  // The price per class and the saving against a single class, from the live prices.
  const each = plan.price > 0 ? plan.price / plan.classes : 0
  const saving = each > 0 && prices.class_single > 0 ? Math.round((1 - each / prices.class_single) * 100) : 0

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
    const res = await enroll({ option, rider: { name: nameCase(f.rider), age: f.age === '' ? null : Number(f.age) }, contact: nameCase(f.contact), phone: f.phone.trim(), email: f.email.trim(), start: f.start, lang, website: f.website })
    setBusy(false)
    if (!res.ok) { setErrors({ [FIELD_OF[res.code] || 'general']: t(`errors.${res.code}`) }); return }
    if (res.bot) { setDone('later'); setStep('done'); return }
    setOrder(res)
    setStep('pay')
  }
  const reset = () => { setStep('pick'); setOrder(null); setDone(null); setErrors({}); setF({ ...f, rider: '', age: '', website: '' }) }
  const Err = ({ k }) => (errors[k] ? <small className="cform__err" role="alert">{errors[k]}</small> : null)
  const summary = (amount = chosen?.amount) => `${chosen?.name} · ${price(amount)}`
  const arrow = <span className="efoot__arrow" aria-hidden="true">→</span>

  if (step === 'pick') {
    return (
      <>
        <div className="enroll enroll--pick" ref={top}>
          <div className="etabs" role="tablist" aria-label={t('site.sheet.classes.title')}>
            {['plan', 'single'].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={`etab ${tab === k ? 'is-on' : ''}`} onClick={() => setTab(k)}>
                {t(k === 'plan' ? 'site.enroll.tabPlan' : 'site.enroll.tabSingle')}
              </button>
            ))}
          </div>
          {tab === 'plan' ? (
            <div className="epane" role="tabpanel">
              <p className="elabel" id="enroll-howmany">{t('site.enroll.howMany')}</p>
              <div className="eplans" role="radiogroup" aria-labelledby="enroll-howmany">
                {plans.map((p) => (
                  <button key={p.classes} type="button" role="radio" aria-checked={plan.classes === p.classes} className={`eplan ${plan.classes === p.classes ? 'is-on' : ''}`} onClick={() => setPlanN(p.classes)}>
                    {p.classes === 8 && <em className="eplan__tag">{t('site.enroll.popular')}</em>}
                    <b>{p.classes}</b>
                    <span>{t('site.enroll.perWeek', { n: Math.max(1, Math.round(p.classes / 4)) })}</span>
                  </button>
                ))}
              </div>
              <div className="esum">
                {/* Every plan's text sits in the same cell (only the chosen one visible), so the card keeps its height. */}
                <div className="esum__text">
                  {plans.map((p) => (
                    <div key={p.classes} className={p === plan ? '' : 'is-ghost'} aria-hidden={p === plan ? undefined : 'true'}>
                      <p className="esum__title">{t('site.sheet.classes.plan', { n: p.classes })}</p>
                      <ul className="esum__list">
                        <li>{t('site.enroll.planLine1', { n: Math.max(1, Math.round(p.classes / 4)) })}</li>
                        <li>{t('site.enroll.planLine2')}</li>
                        <li>{t('site.enroll.planLine3')}</li>
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="esum__price">
                  <b>{price(plan.price)}</b>
                  {each > 0 && <span>{t('site.enroll.perClass', { price: fmtMoney(Math.round(each)) })}</span>}
                  {saving > 0 && <em className="esum__save">{t('site.enroll.save', { pct: saving })}</em>}
                </div>
              </div>
            </div>
          ) : (
            <div className="epane" role="tabpanel">
              <p className="elabel" id="enroll-single">{t('site.enroll.singleLabel')}</p>
              <div className="erows" role="radiogroup" aria-labelledby="enroll-single">
                {singles.map((o) => (
                  <button key={o.key} type="button" role="radio" aria-checked={single === o.key} className={`erow ${single === o.key ? 'is-on' : ''}`} onClick={() => setSingle(o.key)}>
                    <span className="erow__radio" aria-hidden="true" />
                    <span className="erow__text"><b>{o.name}</b><span>{o.note}</span></span>
                    <span className="erow__price">{price(o.amount)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="ecustom">{t('site.enroll.customAsk')} <button type="button" className="tlink" onClick={onCustom}>{t('site.enroll.customLink')}</button></p>
          <div className="eduds">{info}</div>
        </div>
        <EnrollFoot label={t('site.enroll.youChose')} what={summary()}>
          <button type="button" className="sbtn sbtn--deep efoot__btn" onClick={() => setStep('form')}>{t('site.enroll.continue')} {arrow}</button>
        </EnrollFoot>
      </>
    )
  }

  if (step === 'form') {
    return (
      <form className="cform enroll enroll--form" ref={top} onSubmit={submit} noValidate>
        <button type="button" className="sback" onClick={() => setStep('pick')}><span aria-hidden="true">←</span> {t('site.enroll.back')}</button>
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
        {errors.general && <small className="cform__err" role="alert">{errors.general}</small>}
        <EnrollFoot label={t('site.enroll.youChose')} what={summary()}>
          <button type="submit" className={`sbtn sbtn--deep efoot__btn ${busy ? 'is-busy' : ''}`} disabled={busy} aria-busy={busy}>
            <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{t(busy ? 'site.enroll.paying' : 'site.enroll.pay', { amount: price(chosen?.amount) })}</span>
          </button>
        </EnrollFoot>
      </form>
    )
  }

  if (step === 'pay') {
    return (
      <PayStep order={order} card={card} lang={lang} bank={data?.bank} top={top}
        foot={(button) => <EnrollFoot label={t('site.enroll.youChose')} what={summary(order.amount)}>{button}</EnrollFoot>}
        onDone={(how) => { setDone(how); setStep('done') }} />
    )
  }

  const first = nameCase(f.contact).split(/\s+/)[0]
  return (
    <div className="cform__done enroll" ref={top} tabIndex={-1}>
      <span className="cform__check" aria-hidden="true"><SiteIcon name="check" size={28} /></span>
      <p className="cform__thanks">{t('site.enroll.doneTitle', { name: first })}</p>
      <p className="slead">{t(done === 'receipt' ? 'site.enroll.transferDone' : done === 'club' ? 'site.enroll.clubDone' : 'site.enroll.laterDone')}</p>
      <p className="small">{t('site.enroll.appLine', { email: f.email.trim() })}{isClass ? ` ${t('site.enroll.startHint')}` : ''}</p>
      <div className="ssheet2__ctas">
        <AppButton>{t('site.enroll.appBtn')}</AppButton>
        <button type="button" className="slinkarrow" onClick={reset}>{t('site.enroll.another')}</button>
      </div>
      {order?.start && !isClass && <p className="small muted">{fmtDate(order.start)}</p>}
    </div>
  )
}

/** The sheet's footer through the three steps: "Elegiste" + the option and price, the main button on the right. */
function EnrollFoot({ label, what, children }) {
  return (
    <div className="efoot">
      <p className="efoot__what"><span>{label}</span><b>{what}</b></p>
      {children}
    </div>
  )
}

/**
 * How to pay, as option cards (the same as the app's PayDialog): Transferencia (bank details + the receipt as a drop
 * zone), Tarjeta (Mercado Pago; shown greyed with "Muy pronto" until the club's keys are in) or En el club ("Apartar
 * mi lugar" marks the charge to be paid at the office). One mustard button per screen; the rest are cards and links.
 */
function PayStep({ order, card, lang, bank, onDone, foot, top }) {
  const { t, fmtMoney } = useI18n()
  const [method, setMethod] = useState('transfer')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const clabe = bank?.clabe ? String(bank.clabe).replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : null
  const copy = async () => { try { await navigator.clipboard.writeText(bank.clabe); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const pick = (f) => { if (f.size > RECEIPT_MAX) return setError(t('errors.fileTooBig')); setError(null); setFile(f) }
  const send = async () => {
    if (!file) return
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
  const atClub = async () => {
    setBusy(true); setError(null)
    const res = await payAtClubWeb(order.payment_id)
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
    onDone('club')
  }
  const methods = [
    { key: 'transfer', title: t('site.enroll.transfer'), text: t('site.enroll.methodTransfer'), icon: <SiteIcon name="bank" size={22} /> },
    { key: 'card', title: t('site.enroll.card'), text: t('site.enroll.methodCard'), icon: <SiteIcon name="card" size={22} />, disabled: !card, badge: card ? null : t('site.enroll.soon') },
    { key: 'club', title: t('site.enroll.club'), text: t('site.enroll.methodClub'), icon: <SiteIcon name="home" size={22} /> },
  ]
  const busyLabel = (k) => <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{k}</span>
  const main = method === 'transfer'
    ? <button type="button" className={`sbtn sbtn--deep efoot__btn ${busy ? 'is-busy' : ''}`} disabled={busy || !file} onClick={send}>{busyLabel(t(busy ? 'site.enroll.sending' : 'site.enroll.send'))}</button>
    : method === 'card'
      ? <button type="button" className={`sbtn sbtn--deep efoot__btn ${busy ? 'is-busy' : ''}`} disabled={busy} onClick={goCard}>{busyLabel(t(busy ? 'site.enroll.cardWait' : 'site.enroll.cardPay', { amount: fmtMoney(order.amount) }))}</button>
      : <button type="button" className={`sbtn sbtn--deep efoot__btn ${busy ? 'is-busy' : ''}`} disabled={busy} onClick={atClub}>{busyLabel(t('site.enroll.clubBtn'))}</button>
  return (
    <>
      <div className="enroll enroll--pay" ref={top}>
        <p className="enroll__how">{t('site.enroll.howPay')}</p>
        <MethodCards methods={methods} value={method} onChange={(m) => { setMethod(m); setError(null) }} label={t('site.enroll.howPay')} check={<SiteIcon name="check" size={14} />} />
        {method === 'transfer' && (
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
            <DropZone file={file} onFile={pick} accept={ACCEPT} disabled={busy} title={t('site.enroll.dropTitle')} hint={t('site.enroll.dropHint')} changeLabel={t('site.enroll.change')}
              icon={<SiteIcon name="upload" size={26} />} fileIcon={<SiteIcon name="file" size={22} />} />
            <button type="button" className="tlink enroll__later" onClick={() => onDone('later')}>{t('site.enroll.later')}</button>
          </div>
        )}
        {method === 'card' && card && <div className="enroll__box"><p>{t('site.enroll.cardNote')}</p></div>}
        {method === 'club' && <div className="enroll__box"><p>{t('site.enroll.clubLine')}</p></div>}
        {error && <small className="cform__err" role="alert">{error}</small>}
      </div>
      {foot(main)}
    </>
  )
}
