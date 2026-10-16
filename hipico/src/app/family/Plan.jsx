import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, getState, byId, getPlan, choosePlan, boardingStatus, requestBoardingPayment, dueOf, dueState, upcomingBookings,
} from '../../data/store.js'
import { PLANS, BOARDING_MONTHLY } from '../../data/prices.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, SectionTitle } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ReceiptBadge } from '../../components/Transfer.jsx'
import { PayDialog } from '../../components/PayDialog.jsx'
import { currentMonthKey } from '../../lib/time.js'
import { ActivePlanCard, ChangePlan } from './ActivePlan.jsx'
import { UpcomingList } from './Upcoming.jsx'
import { PaymentHistory, concept } from '../../components/PaymentHistory.jsx'
import { StatusPill } from '../../components/Colors.jsx'
import { PopularTag } from '../../components/PopularTag.jsx'

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

  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState(null)

  // Every "Pagar" opens the same payment lightbox (Transferencia · Tarjeta · En el club) for that charge.
  const openTransfer = (id) => setOpenId(id || null)
  const pendingPlanPayment = () => getState().payments.filter((p) => p.service === 'plan' && p.status === 'pending' && p.meta?.riderId === riderId).pop()?.id
  const payPlan = async () => {
    setBusy(true)
    const res = await choosePlan({ riderId, classes: selected, month })
    setBusy(false)
    if (!res.ok && res.code !== 'pendingExists') return toast(t(`errors.${res.code}`, { month: monthName(month) }), 'error')
    openTransfer(res.payment?.id || res.payment_id || pendingPlanPayment())
  }
  const payBoarding = async () => {
    const res = await requestBoardingPayment(familyId)
    if (!res.ok && res.code !== 'pendingExists') return toast(t(`errors.${res.code}`), 'error')
    openTransfer(getState().payments.find((p) => p.familyId === familyId && p.service === 'boarding' && p.status === 'pending')?.id)
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
                {p.popular && <PopularTag className="package__tag">{t('plan.popular')}</PopularTag>}
                <span className="package__n">{p.classes}</span>
                <span className="package__label">{t('plan.classesMonth')}</span>
                <span className="package__price">{fmtMoney(p.price)}</span>
                <span className="package__per">{t('plan.perClass', { price: fmtMoney(Math.round(p.price / p.classes)) })}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary btn--block" onClick={payPlan} disabled={busy}><Icon name="receipt" size={18} /> {t('plan.chooseAndPay', { amount: fmtMoney(PLANS.find((p) => p.classes === selected)?.price || 0) })}</button>
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
          <div className="mt12"><button type="button" className="btn btn--primary btn--block" onClick={payBoarding} disabled={busy}><Icon name="receipt" size={18} /> {t('boarding.payInside')}</button></div>
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
    </div>
  )
}

/** Pendientes de pago (each with Pagar por transferencia) and the payment history. Mi plan and Pagos. */
export function PendingPayments({ familyId, openId, onOpen, history = true }) {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
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
              {p.receiptStatus === 'rejected' && p.receiptNote && <p className="small transfer__note"><Icon name="alert" size={14} /> {p.receiptNote}</p>}
              {p.receiptStatus !== 'review' && (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => openTransfer(p.id)}>{t('pay.pay')}</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="card"><Empty icon="receipt" title={t('plan.noPending')} /></div>
      )}
      {openId && <PayDialog paymentId={openId} onClose={() => onOpen(null)} />}
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
