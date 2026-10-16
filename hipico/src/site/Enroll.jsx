import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { AppButton } from './SiteLayout.jsx'
import { planList } from './siteData.js'
import { cardCheckout, cardDemoWeb, cardInfo, enroll, payAtClubWeb, payCard, sendReceipt, RECEIPT_MAX, SITE_DEMO } from './enroll.js'
import { DropZone, MethodCards } from '../components/PayOptions.jsx'
import { CardForm, cardMode } from '../components/CardForm.jsx'
import { DateField } from './DateField.jsx'
import { FloatField } from './FloatField.jsx'
import { bestValue, planFact, planLook } from '../data/planLook.js'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cancun', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const FIELD_OF = { missing: 'contact', badEmail: 'email', badPhone: 'phone' }
const FIELDS = ['rider', 'age', 'contact', 'phone', 'email', 'start']
/** "ivana lópez" → "Ivana López" (a name typed all in lowercase); anything already capitalized stays as typed. */
export const nameCase = (s) => { const v = String(s || '').trim(); return v === v.toLowerCase() ? v.replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : v }
/** The reference for a transfer, the way the club names the family: "Familia López". */
const familyRef = (contact) => { const last = nameCase(contact).split(/\s+/).filter(Boolean).pop(); return last ? `Familia ${last}` : '' }

/**
 * Clases on the website, as in the approved draft: Plan mensual (4 · 8 · 12 cards, 8 preselected, a summary card with
 * the price per class and the saving worked out from the live prices) or Sin plan (Clase muestra · Clase suelta).
 * Then one screen: the rider's and the parent's details (labels inside the fields) and how to pay (Tarjeta with the card
 * form inside, Transferencia with the receipt, En el club; none chosen at first), opened as an accordion. One press
 * of the footer's button checks the details, creates the family, rider and charge, and pays, uploads or saves the
 * spot. The footer stays at the bottom of the sheet: what was chosen on the left, the one main button on the right.
 */
export function Enroll({ data }) {
  const { t, fmtMoney, fmtDate, lang } = useI18n()
  const [step, setStep] = useState('pick') // pick → details → done
  const [tab, setTab] = useState('plan') // plan | single
  const [planN, setPlanN] = useState(null) // null = the best price per class (12 today)
  const [single, setSingle] = useState('trial')
  const [f, setF] = useState({ rider: '', age: '', contact: '', phone: '', email: '', start: todayKey(), website: '' })
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [order, setOrder] = useState(null) // the charge once created: { payment_id, amount, family_name, key }
  const [card, setCard] = useState({ enabled: false, publicKey: null })
  const [method, setMethod] = useState(null) // nothing chosen until the visitor picks
  const [file, setFile] = useState(null)
  const [later, setLater] = useState(false)
  const [pulse, setPulse] = useState(0)
  const [done, setDone] = useState(null) // 'receipt' | 'later' | 'club' | 'paid' | 'cardPending'
  const top = useRef(null)
  const cardApi = useRef(null)
  // Every step opens at the top of the sheet: the column (computer) and the panel (phones) both go back to 0.
  useEffect(() => {
    for (let n = top.current?.parentElement; n && !n.classList.contains('ssheet2'); n = n.parentElement) n.scrollTop = 0
  }, [step])
  useEffect(() => { if (step === 'details') cardInfo().then(setCard) }, [step])

  const prices = data?.prices || {}
  const listed = planList(prices)
  const plans = listed.length ? listed : [4, 8, 12].map((classes) => ({ classes, price: 0 }))
  const best = bestValue(plans)
  const plan = plans.find((p) => p.classes === planN) || plans.find((p) => p.classes === best) || plans[plans.length - 1]
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
  const summary = `${chosen?.name} · ${price(chosen?.amount)}`
  const arrow = <span className="efoot__arrow" aria-hidden="true">→</span>
  const mode = cardMode({ demo: SITE_DEMO, ...card })

  const check = (v = f) => {
    const e = {}
    if (!v.rider.trim()) e.rider = t('site.enroll.errors.riderName')
    if (v.age !== '' && !(Number(v.age) >= 2 && Number(v.age) <= 99)) e.age = t('site.enroll.errors.age')
    if (!v.contact.trim()) e.contact = t('site.enroll.errors.contact')
    if (!EMAIL_RE.test(v.email.trim())) e.email = t('site.enroll.errors.email')
    if (v.phone.trim() && v.phone.replace(/\D/g, '').length < 8) e.phone = t('site.enroll.errors.phone')
    if (!v.start || v.start < todayKey()) e.start = t('site.enroll.errors.date')
    return e
  }
  // Errors show after the first press, then follow the typing field by field.
  const set = (k) => (e) => { const v = { ...f, [k]: e.target.value }; setF(v); if (tried) setErrors((old) => ({ ...check(v), ...(old.pay ? { pay: old.pay } : {}) })) }
  const pick = (m) => { setMethod(m); setErrors(({ pay, general, ...rest }) => rest) }
  const onFile = (picked) => { if (picked.size > RECEIPT_MAX) { setErrors((e) => ({ ...e, pay: t('errors.fileTooBig') })); return } setFile(picked); setLater(false); setErrors(({ pay, ...rest }) => rest) }
  const focusFirst = (e) => {
    const k = FIELDS.find((x) => e[x])
    const el = k && top.current?.querySelector(`[name="${k}"]`)
    if (el) { el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }) }
  }
  // "Elige cómo pagar": the three cards pulse once (they re-mount for it) and then the first one takes the focus.
  const nudgePay = () => setPulse((n) => n + 1)
  useEffect(() => {
    if (!pulse) return
    const first = top.current?.querySelector('.epay .paycard:not(:disabled)')
    first?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    first?.focus({ preventScroll: true })
  }, [pulse])

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const usable = method && !(method === 'card' && mode === 'off')
    if (!usable) { nudgePay(); return } // no way to pay chosen yet: point at the cards, no errors yet
    setTried(true)
    const e = check()
    if (method === 'transfer' && !later && !file) e.pay = t('site.enroll.needReceipt')
    setErrors(e)
    if (Object.keys(e).some((k) => k !== 'pay')) { focusFirst(e); return }
    if (e.pay) { nudgePay(); return }
    setBusy(true)
    try {
      let cardData = null
      if (method === 'card') {
        cardData = await cardApi.current?.getData()
        if (!cardData) { setErrors({ pay: t('errors.cardInvalid') }); return }
      }
      // The same choice and email pressed again (a declined card, a failed upload) reuses the charge already made.
      const key = `${option}|${f.email.trim().toLowerCase()}|${nameCase(f.rider)}`
      let o = order?.key === key ? order : null
      if (!o) {
        const res = await enroll({ option, rider: { name: nameCase(f.rider), age: f.age === '' ? null : Number(f.age) }, contact: nameCase(f.contact), phone: f.phone.trim(), email: f.email.trim(), start: f.start, lang, website: f.website })
        if (!res.ok) { const k = FIELD_OF[res.code]; setErrors({ [k || 'general']: t(`errors.${res.code}`) }); if (k) focusFirst({ [k]: true }); return }
        if (res.bot) { setDone('later'); setStep('done'); return }
        o = { ...res, key }
        setOrder(o)
      }
      let res
      if (method === 'club') res = await payAtClubWeb(o.payment_id)
      else if (method === 'transfer') res = later ? { ok: true } : await sendReceipt(o.payment_id, file)
      else if (cardData.demo) res = await cardDemoWeb(o.payment_id)
      else if (cardData.redirect) {
        const r = await cardCheckout(o.payment_id, lang)
        if (r.ok) { window.location.assign(r.url); return }
        res = r
      } else {
        const r = await payCard(o.payment_id, cardData)
        if (r.ok && r.status === 'rejected') { setErrors({ pay: t('errors.cardRejected') }); return }
        res = r.ok ? { ok: true, pending: r.status !== 'approved' } : r
      }
      if (!res.ok) { setErrors({ pay: t(`errors.${res.code}`) }); return }
      setDone(method === 'club' ? 'club' : method === 'transfer' ? (later ? 'later' : 'receipt') : res.pending ? 'cardPending' : 'paid')
      setStep('done')
    } finally {
      setBusy(false)
    }
  }
  const reset = () => { setStep('pick'); setOrder(null); setDone(null); setErrors({}); setTried(false); setFile(null); setLater(false); setF({ ...f, rider: '', age: '', website: '' }) }

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
                {plans.map((p) => {
                  const look = planLook(p.classes)
                  const fact = planFact(p.classes, best)
                  return (
                    <button key={p.classes} type="button" role="radio" aria-checked={plan.classes === p.classes} className={`eplan c-${look.color} ${plan.classes === p.classes ? 'is-on' : ''}`} onClick={() => setPlanN(p.classes)}>
                      <span className="eplan__icon" aria-hidden="true"><SiteIcon name={look.icon} size={24} /></span>
                      <b>{p.classes}</b>
                      <span className="eplan__line">
                        <span>{t('site.enroll.perWeek', { n: Math.max(1, Math.round(p.classes / 4)) })}</span>
                        {fact && <span className="eplan__fact">{t(`planCard.${fact}`)}</span>}
                      </span>
                    </button>
                  )
                })}
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
        </div>
        <EnrollFoot label={t('site.enroll.youChose')} what={summary}>
          <button type="button" className="sbtn sbtn--deep efoot__btn" onClick={() => setStep('details')}>{t('site.enroll.continue')} {arrow}</button>
        </EnrollFoot>
      </>
    )
  }

  if (step === 'details') {
    const inv = (k) => (errors[k] ? true : undefined)
    const button = !method || (method === 'card' && mode === 'off') ? t('site.enroll.chooseHow')
      : method === 'card' ? t('site.enroll.pay', { amount: price(chosen?.amount) })
        : method === 'transfer' && !later ? t('site.enroll.send') : t('site.enroll.clubBtn')
    const methods = [
      { key: 'card', title: t('site.enroll.card'), text: t('site.enroll.methodCard'), icon: <SiteIcon name="card" size={22} /> },
      { key: 'transfer', title: t('site.enroll.transfer'), text: t('site.enroll.methodTransfer'), icon: <SiteIcon name="bank" size={22} /> },
      { key: 'club', title: t('site.enroll.club'), text: t('site.enroll.methodClub'), icon: <SiteIcon name="home" size={22} /> },
    ]
    return (
      <form className="cform enroll enroll--details" ref={top} onSubmit={submit} noValidate>
        <p className="eback"><button type="button" className="sback" onClick={() => setStep('pick')}><span aria-hidden="true">←</span> {t('site.enroll.back')}</button><b>{summary}</b></p>
        <div className="edetails">
          <FloatField error={errors.rider} label={t('site.enroll.riderName')} className="efield"><input name="rider" autoComplete="off" value={f.rider} onChange={set('rider')} aria-invalid={inv('rider')} /></FloatField>
          <FloatField error={errors.age} label={t('site.enroll.riderAge')} className="efield efield--age"><input name="age" type="number" inputMode="numeric" min={2} max={99} value={f.age} onChange={set('age')} aria-invalid={inv('age')} /></FloatField>
          <FloatField error={errors.contact} label={t('site.enroll.contact')} className="efield"><input name="contact" autoComplete="name" value={f.contact} onChange={set('contact')} aria-invalid={inv('contact')} /></FloatField>
          <FloatField error={errors.phone} label={t('site.enroll.phone')} className="efield"><input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={inv('phone')} /></FloatField>
          <FloatField error={errors.email} label={t('site.enroll.email')} more={t('site.enroll.emailMore')} className="efield"><input name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={inv('email')} /></FloatField>
          <FloatField error={errors.start} label={t(isClass ? 'site.enroll.startClass' : 'site.enroll.start')} hint={isClass ? t('site.enroll.startHint') : ''} float className="efield">
            <DateField name="start" min={todayKey()} value={f.start} onChange={set('start')} invalid={Boolean(errors.start)} />
          </FloatField>
        </div>
        <div className="cform__hp" aria-hidden="true"><label>{t('site.contact.website')}<input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>

        <div className={`epay ${pulse ? 'is-pulse' : ''}`} key={`pulse${pulse}`}>
          <p className="elabel">{t('site.enroll.howPay')}</p>
          <MethodCards methods={methods} value={method} onChange={pick} label={t('site.enroll.howPay')} check={<SiteIcon name="check" size={14} />} />
        </div>
        {method && (
          <div className="eacc" key={method}>
            {method === 'card' && <CardForm mode={mode} amount={chosen?.amount} email={EMAIL_RE.test(f.email.trim()) ? f.email.trim() : ''} publicKey={card.publicKey} api={cardApi} />}
            {method === 'transfer' && (
              <div className="eacc__transfer">
                <BankLines bank={data?.bank} amount={chosen?.amount} reference={familyRef(f.contact)} />
                {later ? (
                  <p className="small eacc__later">{t('site.enroll.laterOn')} <button type="button" className="tlink" onClick={() => setLater(false)}>{t('site.enroll.uploadNow')}</button></p>
                ) : (
                  <>
                    <DropZone file={file} onFile={onFile} accept={ACCEPT} disabled={busy} title={t('site.enroll.dropTitle')} hint={t('site.enroll.dropHint')} changeLabel={t('site.enroll.change')}
                      icon={<SiteIcon name="upload" size={26} />} fileIcon={<SiteIcon name="file" size={22} />} />
                    <button type="button" className="tlink enroll__later" onClick={() => { setLater(true); setFile(null); setErrors(({ pay, ...rest }) => rest) }}>{t('site.enroll.later')}</button>
                  </>
                )}
              </div>
            )}
            {method === 'club' && <p className="eacc__club">{t('site.enroll.clubLine')}</p>}
          </div>
        )}
        {(errors.pay || errors.general) && <p className="cform__err" role="alert">{errors.pay || errors.general}</p>}
        <EnrollFoot label={t('site.enroll.youChose')} what={summary}>
          <button type="submit" className={`sbtn sbtn--deep efoot__btn ${busy ? 'is-busy' : ''} ${method && !(method === 'card' && mode === 'off') ? '' : 'is-waiting'}`} disabled={busy} aria-busy={busy}>
            <span className="sbtn__in">{busy && <span className="sspin" aria-hidden="true" />}{busy ? t('site.enroll.paying') : button}</span>
          </button>
        </EnrollFoot>
      </form>
    )
  }

  const first = nameCase(f.contact).split(/\s+/)[0]
  return (
    <div className="cform__done enroll" ref={top} tabIndex={-1}>
      <span className="cform__check" aria-hidden="true"><SiteIcon name="check" size={28} /></span>
      <p className="cform__thanks">{t('site.enroll.doneTitle', { name: first })}</p>
      <p className="slead">{t({ receipt: 'site.enroll.transferDone', club: 'site.enroll.clubDone', paid: 'site.enroll.paidDone', cardPending: 'site.enroll.cardPendingDone' }[done] || 'site.enroll.laterDone')}</p>
      <p className="small">{t('site.enroll.appLine', { email: f.email.trim() })}{isClass ? ` ${t('site.enroll.startHint')}` : ''}</p>
      <div className="ssheet2__ctas">
        <AppButton>{t('site.enroll.appBtn')}</AppButton>
        <button type="button" className="slinkarrow" onClick={reset}>{t('site.enroll.another')}</button>
      </div>
      {order?.start && !isClass && <p className="small muted">{fmtDate(order.start)}</p>}
    </div>
  )
}

/** The sheet's footer through the steps: "Elegiste" + the option and price, the main button on the right. */
function EnrollFoot({ label, what, children }) {
  return (
    <div className="efoot">
      <p className="efoot__what"><span>{label}</span><b>{what}</b></p>
      {children}
    </div>
  )
}

/** The club's bank details for a transfer, each line with its copy button: CLABE, amount, reference. */
function BankLines({ bank, amount, reference }) {
  const { t, fmtMoney } = useI18n()
  const [copied, setCopied] = useState(null)
  const copy = async (k, v) => { try { await navigator.clipboard.writeText(String(v)); setCopied(k); setTimeout(() => setCopied(null), 1800) } catch { /* ignore */ } }
  if (!bank?.clabe) return <p className="small">{t('site.enroll.bankPending')}</p>
  const clabe = String(bank.clabe).replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
  const Copy = ({ k, v }) => <button type="button" className="ebank__copy" onClick={() => copy(k, v)}>{t(copied === k ? 'site.enroll.copiedShort' : 'site.enroll.copy')}</button>
  return (
    <dl className="ebank">
      {bank.bankName && <><dt>{t('receipt.bank')}</dt><dd>{bank.bankName}</dd></>}
      {bank.accountHolder && <><dt>{t('receipt.holder')}</dt><dd>{bank.accountHolder}</dd></>}
      <dt>CLABE</dt><dd className="ebank__clabe">{clabe} <Copy k="clabe" v={String(bank.clabe).replace(/\s+/g, '')} /></dd>
      {amount > 0 && <><dt>{t('site.enroll.amountLabel')}</dt><dd>{fmtMoney(amount)} <Copy k="amount" v={amount} /></dd></>}
      {reference && <><dt>{t('site.enroll.refLabel')}</dt><dd>{reference} <Copy k="ref" v={reference} /></dd></>}
    </dl>
  )
}
