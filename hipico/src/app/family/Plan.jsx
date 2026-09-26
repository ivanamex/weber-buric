import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, getPlan, planRemaining, planExpiry, choosePlan, boardingStatus, requestBoardingPayment,
} from '../../data/store.js'
import { PLANS, BOARDING_MONTHLY } from '../../data/prices.js'
import { RiderPicker, useFamilyContext } from '../RiderPicker.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Progress, SectionTitle, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
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
  const payAtClub = async () => {
    setBusy(true)
    const res = await choosePlan({ riderId, classes: selected, month })
    toast(res.ok
      ? t('toasts.planPending', { n: selected, name: rider.name, month: monthName(month) })
      : t(`errors.${res.code}`, { month: monthName(month) }), res.ok ? 'success' : 'error')
    setBusy(false)
  }
  const boardingAtClub = async () => {
    const res = await requestBoardingPayment(familyId)
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
        <button type="button" className="btn btn--outline btn--block" onClick={payAtClub} disabled={busy}><Icon name="cash" size={20} /> {t('plan.payClub')}</button>
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
            <button type="button" className="btn btn--outline btn--block" onClick={boardingAtClub}><Icon name="cash" size={20} /> {t('plan.payClub')}</button>
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
            <li key={p.id} className="list__row">
              <div className="grow">
                <p className="list__title">{t(`services.${p.service}`)}{p.meta?.riderId ? ` · ${byId(s.riders, p.meta.riderId)?.name}` : ''}{p.meta?.horseId ? ` · ${byId(s.horses, p.meta.horseId)?.name}` : ''}</p>
                <p className="small muted">{fmtInstant(p.createdAt)} · {t('plan.payAtClubShort')}</p>
              </div>
              <strong>{fmtMoney(p.amount)}</strong>
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
