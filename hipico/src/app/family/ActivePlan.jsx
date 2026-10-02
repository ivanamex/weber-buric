import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, getPlan, planRemaining, planExpiry, planRenewal, planStatus, pendingUpgrade, changePlan, trialDone, planStart,
} from '../../data/store.js'
import { PLANS, planPrice } from '../../data/prices.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Horseshoes } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { StatusPill } from '../../components/Colors.jsx'

const STATUS = { paid: ['paid', 'plan.paid'], review: ['review', 'receipt.status.review'], pending: ['pending', 'plan.statusPending'] }

/** "Plan activo" card at the top of Inicio and Mi plan: counter, renewal date, status, Reservar / Cambiar plan. */
export function ActivePlanCard({ riderId, onChange }) {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const base = useBase()
  const rider = byId(s.riders, riderId)
  const plan = getPlan(s, riderId)
  if (!rider) return null

  if (!plan) {
    const tried = trialDone(s, riderId)
    return (
      <section className="card activeplan activeplan--empty">
        <span className="tile-icon tile-icon--accent"><Icon name="horseshoe" /></span>
        <p className="card__title">{t(tried ? 'plan.likedIt' : 'plan.noneYet')}</p>
        <p className="small muted">{t(tried ? 'plan.likedItText' : 'plan.noneYetText', { name: rider.name })}</p>
        <Link to={`${base}/familia/plan?elegir=1`} className="btn btn--primary btn--block">{t('plan.choose')}</Link>
      </section>
    )
  }

  const [tone, label] = STATUS[planStatus(s, plan)]
  const upgrade = pendingUpgrade(s, riderId)
  const nextSize = rider.planClasses && rider.planClasses < plan.total ? rider.planClasses : null
  const nextStart = planRenewal(plan)
  // Classes already confirmed in the next period count there: show it, so a booking after the renewal is visible.
  const nextPlan = getPlan(s, riderId, nextStart)
  const nextMonth = nextPlan ? fmtDate(planStart(nextPlan), { month: 'long' }) : ''
  const changeProps = onChange
    ? { as: 'button', props: { type: 'button', onClick: onChange } }
    : { as: Link, props: { to: `${base}/familia/plan?cambiar=1` } }
  const Change = changeProps.as
  return (
    <section className="card activeplan" aria-label={t('plan.activeLabel', { n: plan.total })}>
      <div className="row between gap">
        <p className="card__label">{t('plan.activeLabel', { n: plan.total })} · {rider.name}</p>
        <StatusPill status={tone}>{t(label)}</StatusPill>
      </div>
      <p className="bignum">{t('plan.usedOf', { used: plan.used, total: plan.total })}</p>
      <Horseshoes used={plan.used} total={plan.total} label={t('plan.usedOf', { used: plan.used, total: plan.total })} />
      <div className="row between small muted">
        <span>{t('plan.remaining', { n: planRemaining(plan) })}</span>
        <span>{t(rider.planClasses ? 'plan.renews' : 'plan.expires', { date: fmtDate(rider.planClasses ? planRenewal(plan) : planExpiry(plan), { day: 'numeric', month: 'short' }) })}</span>
      </div>
      {upgrade && <p className="activeplan__note"><Icon name="clock" size={15} /> {t('plan.upgradeWaiting', { n: upgrade.meta.classes })}</p>}
      {nextPlan && (
        <p className="activeplan__note activeplan__note--next">
          <Icon name="calendar" size={15} /> {t('plan.nextPeriodCount', {
            month: nextMonth.charAt(0).toUpperCase() + nextMonth.slice(1), date: fmtDate(planStart(nextPlan), { day: 'numeric', month: 'short' }),
            used: nextPlan.used, total: nextPlan.total,
          })}
        </p>
      )}
      {nextSize && <p className="activeplan__note"><Icon name="calendar" size={15} /> {t('plan.downgradeNote', { n: nextSize, date: fmtDate(nextStart, { day: 'numeric', month: 'short' }) })}</p>}
      <div className="grid2">
        <Link to={`${base}/familia/reservar`} className="btn btn--primary">{t('plan.bookClass')}</Link>
        <Change className="btn activeplan__change" {...changeProps.props}>{t('plan.change')}</Change>
      </div>
    </section>
  )
}

/** The plans side by side, the current one marked "Tu plan", with the price per class and the honest saving. */
export function ChangePlan({ riderId, onDone, onCancel }) {
  const { t, fmtDate, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const rider = byId(s.riders, riderId)
  const plan = getPlan(s, riderId)
  const current = plan?.total
  const [selected, setSelected] = useState(current)
  const [busy, setBusy] = useState(false)
  if (!plan) return null
  const basePerClass = Math.max(...PLANS.map((p) => p.price / p.classes))
  const nextStart = fmtDate(planRenewal(plan), { day: 'numeric', month: 'short' })
  const unchanged = selected === current && (rider.planClasses ?? current) === current

  let info = null
  if (selected > current) {
    info = plan.paid
      ? t('plan.upgradeInfo', { amount: fmtMoney(Math.max(planPrice(selected) - planPrice(current), 0)) })
      : t('plan.upgradeUnpaidInfo', { amount: fmtMoney(planPrice(selected)) })
  } else if (selected < current) {
    info = t('plan.downgradeInfo', { date: nextStart, n: current })
  } else if (!unchanged) {
    info = t('plan.keepInfo', { n: current })
  }

  const onConfirm = async () => {
    setBusy(true)
    const res = await changePlan({ riderId, classes: selected })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`, { month: '' }), 'error')
    if (res.kind === 'upgrade') toast(t('toasts.upgradeRequested', { n: selected }))
    else toast(t('toasts.downgradeScheduled', { n: selected, date: nextStart }))
    onDone?.(res.kind === 'upgrade' ? (res.payment?.id || res.payment_id) : null)
  }

  return (
    <section className="card changeplan" id="cambiar">
      <div className="row between">
        <p className="card__title">{t('plan.changeTitle')}</p>
        {onCancel && <button type="button" className="link" onClick={onCancel}>{t('common.cancel')}</button>}
      </div>
      <div className="packages">
        {PLANS.map((p) => {
          const per = Math.round(p.price / p.classes)
          const saving = Math.round((1 - p.price / p.classes / basePerClass) * 100)
          return (
            <button key={p.classes} type="button" className={`package ${selected === p.classes ? 'is-active' : ''}`} onClick={() => setSelected(p.classes)} aria-pressed={selected === p.classes}>
              {p.classes === current && <span className="package__tag package__tag--mine">{t('plan.yours')}</span>}
              <span className="package__n">{p.classes}</span>
              <span className="package__label">{t('plan.classesMonth')}</span>
              <span className="package__price">{fmtMoney(p.price)}</span>
              <span className="package__per">{t('plan.perClassShort', { price: fmtMoney(per) })}</span>
              {saving >= 1 && <span className="package__save">{t('plan.saves', { n: saving })}</span>}
            </button>
          )
        })}
      </div>
      {info && <p className="small changeplan__info">{info}</p>}
      <button type="button" className="btn btn--primary btn--block" disabled={busy || unchanged} onClick={onConfirm}>
        {busy ? '…' : t('plan.changeTo', { n: selected })}
      </button>
    </section>
  )
}
