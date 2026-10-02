import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, getState, byId, getPlan, choosePlan, boardingStatus, requestBoardingPayment, dueOf, dueState, upcomingBookings,
} from '../../data/store.js'
import { PLANS, BOARDING_MONTHLY } from '../../data/prices.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ReceiptBadge, TransferPanel } from '../../components/Transfer.jsx'
import { currentMonthKey } from '../../lib/time.js'
import { ActivePlanCard, ChangePlan } from './ActivePlan.jsx'
import { UpcomingList } from './Upcoming.jsx'
import { PaymentHistory, concept } from '../../components/PaymentHistory.jsx'
import { StatusPill } from '../../components/Colors.jsx'

export default function FamilyPlan() {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const { riderId } = useFamilyContext()
  const rider = byId(s.riders, riderId)
  const familyId = s.session.familyId
  const thisMonth = currentMonthKey()
  const month = thisMonth
  const [params, setParams] = useSearchParams()
  const [changing, setChanging] = useState(params.get('cambiar') === '1')
  const scrollToId = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  // Arriving from "Cambiar plan" / "Elegir plan" on Inicio.
  useEffect(() => {
    const pay = params.get('pagar')
    if (pay) { openTransfer(pay); setParams({}, { replace: true }); return }
    const target = params.get('cambiar') === '1' ? 'cambiar' : params.get('elegir') === '1' ? 'elegir' : null
    if (!target) return
    scrollToId(target)
    setParams({}, { replace: true })
  }, [])
  const [selected, setSelected] = useState(PLANS.find((p) => p.popular)?.classes ?? PLANS[0].classes)
  const monthName = (m) => fmtDate(`${m}-01`, { month: 'long' })

  const current = getPlan(s, riderId)
  const upcoming = upcomingBookings(s, [riderId])
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
  const pendingPlanPayment = () => getState().payments.filter((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId).pop()?.id
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

      <div className="fcols">
      <div className="fcol">
      <ActivePlanCard riderId={riderId} onChange={() => { setChanging(true); scrollToId('cambiar') }} />
      {upcoming.length > 0 && (
        <>
          <SectionTitle icon="calendar">{t('family.home.upcoming')}</SectionTitle>
          <UpcomingList bookings={upcoming} />
        </>
      )}
      {current && changing && (
        <ChangePlan key={riderId} riderId={riderId} onCancel={() => setChanging(false)}
          onDone={(paymentId) => { setChanging(false); openTransfer(paymentId) }} />
      )}

      {!current && (
        <>
          <SectionTitle icon="horseshoe">{t('plan.packages')}</SectionTitle>
          <div className="packages" id="elegir">
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
        </>
      )}

      <SectionTitle icon="saddle">{t('boarding.title')}</SectionTitle>
      <div className="card pricecard">
        <div className="row gap">
          <span className="tile-icon tile-icon--accent"><Icon name="saddle" /></span>
          <div className="grow">
            <p className="card__title">{t('boarding.full')}</p>
            <p className="small muted">{t('boarding.includes')}</p>
          </div>
        </div>
        <p className="pricecard__price">{fmtMoney(BOARDING_MONTHLY)} <span>/ {t('common.month')}</span></p>
        {boarding.map((b) => (
          <div key={b.horse.id} className="row between small">
            <span>{b.horse.name} · {monthName(b.month)}</span>
            <StatusPill status={b.status === 'paid' ? 'paid' : 'pending'}>{t(`boarding.status.${b.status}`)}</StatusPill>
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

      </div>
      <div className="fcol">
        <PendingPayments familyId={familyId} openId={openId} onOpen={openTransfer} />
      </div>
      </div>
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}

/** Pendientes de pago (each with Pagar por transferencia) and the payment history. Mi plan and Pagos. */
export function PendingPayments({ familyId, openId, onOpen, history = true }) {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
  const family = byId(s.families, familyId)
  const pending = s.payments.filter((p) => p.familyId === familyId && p.status === 'pending')
  const openTransfer = onOpen
  return (
    <>
      <SectionTitle icon="receipt">{t('plan.pendingTitle')}</SectionTitle>
      {pending.length ? (
        <ul className="list card">
          {pending.map((p) => (
            <li key={p.id} id={`pay-${p.id}`} className="list__row list__row--stack">
              <div className="row gap">
                <div className="grow">
                  <p className="list__title">{concept(t, p)}{p.meta?.riderId ? ` · ${byId(s.riders, p.meta.riderId)?.name}` : ''}{p.meta?.horseId ? ` · ${byId(s.horses, p.meta.horseId)?.name}` : ''}</p>
                  <p className="small muted">{(() => { const st = dueState(dueOf(s, p)); return <span className={`due due--${st === 'overdue' ? 'late' : st}`}>{t(`familyDue.${st === 'later' ? 'soon' : st}`, { date: fmtDate(dueOf(s, p), { day: 'numeric', month: 'short' }) })}</span> })()} · {p.receiptStatus ? t('receipt.byTransfer') : t('plan.payAtClubShort')}</p>
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
      {history && (
        <>
          <SectionTitle icon="receipt">{t('history.title')}</SectionTitle>
          <PaymentHistory familyId={familyId} />
        </>
      )}
    </>
  )
}

/** Pagos (desktop sidebar): what's pending and the history, on its own page. */
export function FamilyPaymentsPage() {
  const { t } = useI18n()
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const [openId, setOpenId] = useState(params.get('pagar'))
  useEffect(() => {
    if (!params.get('pagar')) return
    setTimeout(() => document.getElementById(`pay-${params.get('pagar')}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
    setParams({}, { replace: true })
  }, [])
  return (
    <div className="page">
      <h1 className="page__title">{t('family.payments')}</h1>
      <div className="fcols">
        <div className="fcol"><PendingPayments familyId={s.session.familyId} openId={openId} onOpen={setOpenId} history={false} /></div>
        <div className="fcol">
          <SectionTitle icon="receipt">{t('history.title')}</SectionTitle>
          <PaymentHistory familyId={s.session.familyId} />
        </div>
      </div>
    </div>
  )
}
