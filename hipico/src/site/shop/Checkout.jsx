import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { DropZone, MethodCards } from '../../components/PayOptions.jsx'
import { CardForm, cardMode } from '../../components/CardForm.jsx'
import { AppButton } from '../SiteLayout.jsx'
import { FloatField } from '../FloatField.jsx'
import { BankLines, nameCase } from '../Enroll.jsx'
import { useSiteData } from '../siteData.js'
import { cardCheckout, cardDemoWeb, cardInfo, payAtClubWeb, payCard, sendReceipt, RECEIPT_MAX, SITE_DEMO } from '../enroll.js'
import { cartApi, orderItems, placeOrder } from './shopApi.js'
import { productTitle, ShopBtn } from './ShopParts.jsx'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const FIELDS = ['name', 'phone', 'email']
const FIELD_OF = { missing: 'name', badEmail: 'email', badPhone: 'phone' }

/**
 * The cart's second step on the website, exactly like the Clases payment step: the buyer's details (labels inside the
 * fields), then how to pay (Tarjeta · Transferencia · En el club, none chosen; the chosen one opens under the cards).
 * One press checks, places the order (stock taken), then pays, uploads the receipt or keeps the order for the club.
 */
export function ShopCheckout({ lines, totals, back, body }) {
  const { t, fmtMoney, lang } = useI18n()
  const site = useSiteData()
  const [f, setF] = useState({ name: '', phone: '', email: '', website: '' })
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState(null)
  const [file, setFile] = useState(null)
  const [pulse, setPulse] = useState(0)
  const [card, setCard] = useState({ enabled: false, publicKey: null })
  const [order, setOrder] = useState(null) // { order, number, payment_id, amount, key }
  const [done, setDone] = useState(null)
  const top = useRef(null)
  const cardApi = useRef(null)
  const mode = cardMode({ demo: SITE_DEMO, ...card })
  useEffect(() => { cardInfo().then(setCard) }, [])
  useEffect(() => { if (done) body?.current?.scrollTo({ top: 0 }) }, [done, body])

  const check = (v = f) => {
    const e = {}
    if (!v.name.trim()) e.name = t('site.enroll.errors.contact')
    if (v.phone.replace(/\D/g, '').length < 8) e.phone = t('site.enroll.errors.phone')
    if (!EMAIL_RE.test(v.email.trim())) e.email = t('site.enroll.errors.email')
    return e
  }
  const set = (k) => (e) => { const v = { ...f, [k]: e.target.value }; setF(v); if (tried) setErrors((old) => ({ ...check(v), ...(old.pay ? { pay: old.pay } : {}) })) }
  const pick = (m) => { setMethod(m); setErrors(({ pay, general, ...rest }) => rest) }
  const onFile = (picked) => { if (picked.size > RECEIPT_MAX) { setErrors((e) => ({ ...e, pay: t('errors.fileTooBig') })); return } setFile(picked); setErrors(({ pay, ...rest }) => rest) }
  const focusFirst = (e) => {
    const k = FIELDS.find((x) => e[x])
    const el = k && top.current?.querySelector(`[name="${k}"]`)
    if (el) { el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }) }
  }
  useEffect(() => {
    if (!pulse) return
    const first = top.current?.querySelector('.paycard:not(:disabled)')
    first?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    first?.focus({ preventScroll: true })
  }, [pulse])
  const usable = method && !(method === 'card' && mode === 'off')

  const outOfStock = (line) => {
    const l = lines.find((x) => x.slug === line?.product && x.size === line?.size)
    return t('shop.checkout.gone', { size: line?.size || '', product: l?.product ? productTitle(l.product) : line?.name ? `${line.name} ${line.color || ''}`.trim() : '' })
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    if (!usable) { setPulse((n) => n + 1); return }
    setTried(true)
    const e = check()
    if (method === 'transfer' && !file) e.pay = t('shop.checkout.needReceipt')
    setErrors(e)
    if (Object.keys(e).some((k) => k !== 'pay')) { focusFirst(e); return }
    if (e.pay) { setPulse((n) => n + 1); return }
    setBusy(true)
    try {
      let cardData = null
      if (method === 'card') {
        cardData = await cardApi.current?.getData()
        if (!cardData) { setErrors({ pay: t('errors.cardInvalid') }); return }
      }
      // Pressed again after a declined card or a failed upload: the order already placed is reused.
      const key = `${f.email.trim().toLowerCase()}|${lines.map((l) => `${l.slug}:${l.color || ''}:${l.size}:${l.qty}`).join(',')}`
      let o = order?.key === key ? order : null
      if (!o) {
        const res = await placeOrder({ items: orderItems(lines), name: nameCase(f.name), phone: f.phone.trim(), email: f.email.trim(), lang, website: f.website })
        if (!res.ok) {
          if (res.code === 'out_of_stock') { setErrors({ general: outOfStock(res.line) }); return }
          const k = FIELD_OF[res.code]
          setErrors({ [k || 'general']: t(`errors.${res.code}`) })
          if (k) focusFirst({ [k]: true })
          return
        }
        if (res.bot) { setDone({ kind: 'club', number: '' }); return }
        o = { ...res, key }
        setOrder(o)
      }
      let res
      if (method === 'club') res = await payAtClubWeb(o.payment_id)
      else if (method === 'transfer') res = await sendReceipt(o.payment_id, file)
      else if (cardData.demo) res = await cardDemoWeb(o.payment_id)
      else if (cardData.redirect) {
        const r = await cardCheckout(o.payment_id, lang)
        if (r.ok) { cartApi.clear(); window.location.assign(r.url); return }
        res = r
      } else {
        const r = await payCard(o.payment_id, cardData)
        if (r.ok && r.status === 'rejected') { setErrors({ pay: t('errors.cardRejected') }); return }
        res = r.ok ? { ok: true, pending: r.status !== 'approved' } : r
      }
      if (!res.ok) { setErrors({ pay: t(`errors.${res.code}`) }); return }
      cartApi.clear()
      setDone({ kind: method === 'club' ? 'club' : method === 'transfer' ? 'receipt' : res.pending ? 'cardPending' : 'paid', number: o.number })
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const first = nameCase(f.name).split(/\s+/)[0]
    return (
      <div className="cartdrw__body" ref={body}>
        <div className="cdone" ref={top} tabIndex={-1}>
          <span className="cdone__check" aria-hidden="true"><SiteIcon name="check" size={26} /></span>
          <p className="cdone__title">{t('site.enroll.doneTitle', { name: first })}</p>
          <p>{t('shop.checkout.doneLine', { n: done.number })}</p>
          <p className="small">{t({ receipt: 'shop.checkout.doneReceipt', club: 'shop.checkout.doneClub', paid: 'site.enroll.paidDone', cardPending: 'site.enroll.cardPendingDone' }[done.kind])}</p>
          <p className="small">{t('shop.checkout.appLine', { email: f.email.trim() })}</p>
          <AppButton tone="line">{t('site.enroll.appBtn')}</AppButton>
        </div>
      </div>
    )
  }

  const button = !usable ? t('site.enroll.chooseHow')
    : method === 'card' ? t('site.enroll.pay', { amount: fmtMoney(totals.now) })
      : method === 'transfer' ? t('site.enroll.send') : t('shop.checkout.clubBtn')
  const methods = [
    { key: 'card', title: t('site.enroll.card'), text: t('site.enroll.methodCard'), icon: <SiteIcon name="card" size={22} /> },
    { key: 'transfer', title: t('site.enroll.transfer'), text: t('site.enroll.methodTransfer'), icon: <SiteIcon name="bank" size={22} /> },
    { key: 'club', title: t('site.enroll.club'), text: t('shop.checkout.methodClub'), icon: <SiteIcon name="home" size={22} /> },
  ]
  const inv = (k) => (errors[k] ? true : undefined)
  return (
    <form className="ccheckform" onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <div className="cartdrw__body" ref={body}>
        <div className="ccheck" ref={top}>
          <button type="button" className="sback ccheck__back tlink" onClick={back}><span aria-hidden="true">←</span> {t('shop.cart.back')}</button>
          <div>
            <FloatField error={errors.name} label={t('site.contact.name')} className="efield"><input name="name" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={inv('name')} /></FloatField>
            <FloatField error={errors.phone} label={t('site.enroll.phone')} className="efield"><input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} aria-invalid={inv('phone')} /></FloatField>
            <FloatField error={errors.email} label={t('site.enroll.email')} more={t('shop.checkout.emailMore')} className="efield"><input name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} aria-invalid={inv('email')} /></FloatField>
          </div>
          <div className="cform__hp" aria-hidden="true"><label>{t('site.contact.website')}<input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
          <div className={`epay ${pulse ? 'is-pulse' : ''}`} key={`pulse${pulse}`}>
            <h3>{t('site.enroll.howPay')}</h3>
            <MethodCards methods={methods} value={method} onChange={pick} label={t('site.enroll.howPay')} check={<SiteIcon name="check" size={14} />} />
          </div>
          {method && (
            <div className="eacc" key={method}>
              {method === 'card' && <CardForm mode={mode} amount={totals.now} email={EMAIL_RE.test(f.email.trim()) ? f.email.trim() : ''} publicKey={card.publicKey} api={cardApi} />}
              {method === 'transfer' && (
                <div className="eacc__transfer">
                  <BankLines bank={site?.bank} amount={totals.now} reference={order?.number ? t('shop.checkout.ref', { n: order.number }) : nameCase(f.name)} />
                  <DropZone file={file} onFile={onFile} accept={ACCEPT} disabled={busy} title={t('site.enroll.dropTitle')} hint={t('site.enroll.dropHint')} changeLabel={t('site.enroll.change')}
                    icon={<SiteIcon name="upload" size={26} />} fileIcon={<SiteIcon name="file" size={22} />} />
                </div>
              )}
              {method === 'club' && <p className="eacc__club">{t('shop.checkout.clubLine')}</p>}
            </div>
          )}
          {(errors.pay || errors.general) && <p className="cerr" role="alert">{errors.pay || errors.general}</p>}
        </div>
      </div>
      <div className="cartdrw__foot">
        <span className="cartdrw__total"><span>{t(totals.hasOrder ? 'shop.cart.todayShort' : 'shop.cart.total')}</span><b>{fmtMoney(totals.now)}</b></span>
        <ShopBtn type="submit" className={`${busy ? 'is-busy' : ''} ${usable ? '' : 'is-waiting'}`} disabled={busy} aria-busy={busy || undefined}>
          {busy && <span className="sspin" aria-hidden="true" />}{busy ? t('site.enroll.paying') : button}
        </ShopBtn>
      </div>
    </form>
  )
}
