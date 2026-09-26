import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, getState, byId, getPlan, planRemaining, planExpiry, choosePlan, boardingStatus, requestBoardingPayment,
} from '../../data/store.js'
import { PLANS, BOARDING_MONTHLY } from '../../data/prices.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Progress, SectionTitle, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ReceiptBadge, TransferPanel } from '../../components/Transfer.jsx'
import { currentMonthKey, nextMonthKey } from '../../lib/time.js'

export default function FamilyPlan() {
  const { t, fmtDate, fmtMoney, fmtInstant } = useI18n()
  const s = useStore()
  const toast = useToast()
  const { riderId } = useFamilyContext()
  const rider = byId(s.riders, riderId)
  const familyId = s.session.familyId
  const thisMonth = currentMonthKey()
  const [month, setMonth] = useState(() => (getPlan(s, riderId, thisMonth) ? nextMonthKey(thisMonth) : thisMonth))
  const [selected, setSelected] = useState(PLANS.find((p) => p.popular)?.classes ?? PLANS[0].classes)
  const monthName = (m) => fmtDate(`${m}-01`, { month: 'long' })

  const current = getPlan(s, riderId, thisMonth)
  const target = getPlan(s, riderId, month)
  const boarding = boardingStatus(s, familyId)
  const pending = s.payments.filter((p) => p.familyId === familyId && p.status === 'pending')

  const payCard = () => toast(t('toasts.cardSoon'), 'info')
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState(null)
  const family = byId(s.families, familyId)

  // Open the transfer panel (bank details + upload) of a pending payment and bring it into view.
  const openTransfer = (id) => {
    if (!id) return
    setOpenId(id)
    setTimeout(() => document.getElementById(`pay-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }
  const pendingPlanPayment = () => s.payments.find((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId && p.meta?.month === month)?.id
  const payPlan = async (method) => {
    setBusy(true)
    const res = await choosePlan({ riderId, classes: selected, month })
    setBusy(false)
    if (!res.ok && !(method === 'transfer' && res.code === 'pendingExists')) {
      return toast(t(`errors.${res.code}`, { month: monthName(month) }), 'error')
    }
    if (method === 'transfer') return openTransfer(res.payment?.id || res.payment_id || pendingPlanPayment())
    toast(t('toasts.planPending', { n: selected, name: rider.name, month: monthName(month) }))
  }
  const payBoarding = async (method) => {
    const res = await requestBoardingPayment(familyId)
    if (method === 'transfer' && (res.ok || res.code === 'pendingExists')) {
      const id = getState().payments.find((p) => p.familyId === familyId && p.service === 'boarding' && p.status === 'pending')?.id
      return openTransfer(id)
    }
    toast(res.ok ? t('toasts.boardingPending') : t(`errors.${res.code}`), res.ok ? 'success' : 'info')
  }

  return (
    <div className="page">
      <h1 className="page__title">{t('plan.title')}</h1>
      <RiderPicker />

      {current ? (
        <div className="card">
          <div className="row between">
            <div>
              <p className="card__label">{t('plan.current', { month: monthName(thisMonth) })} · {rider.name}</p>
              <p className="bignum">{t('plan.usedOf', { used: current.used, total: current.total })}</p>
            </div>
            {current.paid ? <Badge tone="success">{t('plan.paid')}</Badge> : <Badge tone="alert">{t('plan.pendingPay')}</Badge>}
          </div>
          <Progress value={current.used} max={current.total} tone="gold" />
          <div className="row between small muted mt8">
            <span>{t('plan.remaining', { n: planRemaining(current) })}</span>
            <span>{t('plan.expires', { date: fmtDate(planExpiry(current), { day: 'numeric', month: 'short' }) })}</span>
          </div>
        </div>
      ) : (
        <div className="notice"><Icon name="info" size={18} /> {t('plan.noPlanFor', { name: rider.name, month: monthName(thisMonth) })}</div>
      )}

      <SectionTitle>{t('plan.packages')}</SectionTitle>
      <Segmented
        options={[thisMonth, nextMonthKey(thisMonth)].map((m) => ({ value: m, label: monthName(m) }))}
        value={month}
        onChange={setMonth}
      />
      {target && <p className="small muted mt8">{t('plan.changeNote', { n: target.total, month: monthName(month) })}</p>}

      <div className="packages">
        {PLANS.map((p) => (
          <button key={p.classes} type="button" className={`package ${selected === p.classes ? 'is-active' : ''}`} onClick={() => setSelected(p.classes)} aria-pressed={selected === p.classes}>
            {p.popular && <span className="package__tag">{t('plan.popular')}</span>}
            <span className="package__n">{p.classes}</span>
            <span className="package__label">{t('plan.classesMonth')}</span>
            <span className="package__price">{fmtMoney(p.price)}</span>
            <span className="package__per">{t('plan.perClass', { price: fmtMoney(Math.round(p.price / p.classes)) })}</span>
          </button>
        ))}
      </div>
      <div className="stack">
        <button type="button" className="btn btn--primary btn--block" onClick={payCard}><Icon name="card" size={20} /> {t('plan.payCard')}</button>
        <div className="grid2">
          <button type="button" className="btn btn--outline" onClick={() => payPlan('transfer')} disabled={busy}><Icon name="share" size={18} /> {t('plan.payTransfer')}</button>
          <button type="button" className="btn btn--outline" onClick={() => payPlan('cash')} disabled={busy}><Icon name="cash" size={18} /> {t('plan.payCash')}</button>
        </div>
      </div>

      <SectionTitle>{t('boarding.title')}</SectionTitle>
      <div className="card pricecard">
        <div className="row gap">
          <span className="tile-icon tile-icon--gold"><Icon name="barn" /></span>
          <div className="grow">
            <p className="card__title">{t('boarding.full')}</p>
            <p className="small muted">{t('boarding.includes')}</p>
          </div>
        </div>
        <p className="pricecard__price">{fmtMoney(BOARDING_MONTHLY)} <span>/ {t('common.month')}</span></p>
        {boarding.map((b) => (
          <div key={b.horse.id} className="row between small">
            <span>{b.horse.name} · {monthName(b.month)}</span>
            <Badge tone={b.status === 'paid' ? 'success' : 'alert'}>{t(`boarding.status.${b.status}`)}</Badge>
          </div>
        ))}
        {boarding.length > 0 && boarding.some((b) => b.status !== 'paid') && (
          <div className="stack mt12">
            <button type="button" className="btn btn--primary btn--block" onClick={payCard}><Icon name="card" size={20} /> {t('plan.payCard')}</button>
            <div className="grid2">
              <button type="button" className="btn btn--outline" onClick={() => payBoarding('transfer')}><Icon name="share" size={18} /> {t('plan.payTransfer')}</button>
              <button type="button" className="btn btn--outline" onClick={() => payBoarding('cash')}><Icon name="cash" size={18} /> {t('plan.payCash')}</button>
            </div>
          </div>
        )}
        {boarding.length === 0 && (
          <button type="button" className="btn btn--outline btn--block mt12" onClick={() => toast(t('toasts.soon'), 'info')}>{t('boarding.ask')}</button>
        )}
      </div>

      <SectionTitle>{t('plan.pendingTitle')}</SectionTitle>
      {pending.length ? (
        <ul className="list card">
          {pending.map((p) => (
            <li key={p.id} id={`pay-${p.id}`} className="list__row list__row--stack">
              <div className="row gap">
                <div className="grow">
                  <p className="list__title">{t(`services.${p.service}`)}{p.meta?.riderId ? ` · ${byId(s.riders, p.meta.riderId)?.name}` : ''}{p.meta?.horseId ? ` · ${byId(s.horses, p.meta.horseId)?.name}` : ''}</p>
                  <p className="small muted">{fmtInstant(p.createdAt)} · {p.receiptStatus ? t('receipt.byTransfer') : t('plan.payAtClubShort')}</p>
                </div>
                <div className="right">
                  <strong>{fmtMoney(p.amount)}</strong>
                  <div><ReceiptBadge status={p.receiptStatus} /></div>
                </div>
              </div>
              {openId === p.id || p.receiptStatus === 'rejected' ? (
                <TransferPanel payment={p} family={family} />
              ) : p.receiptStatus !== 'review' && (
                <button type="button" className="link" onClick={() => openTransfer(p.id)}>{t('receipt.payByTransfer')}</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{t('plan.noPending')}</p>
      )}
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}
