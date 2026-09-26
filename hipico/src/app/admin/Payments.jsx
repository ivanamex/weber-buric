import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, pendingPayments, markPaid, monthCollected, recentPaid } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, SectionTitle, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { currentMonthKey } from '../../lib/time.js'

const SERVICE_ICON = { plan: 'plan', boarding: 'barn', camp: 'tent', rental: 'route', events: 'cake' }

export default function AdminPayments() {
  const { t, fmtMoney, fmtInstant, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const pending = pendingPayments(s)
  const [openId, setOpenId] = useState(null)
  const [method, setMethod] = useState('cash')
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0)
  const monthName = fmtDate(`${currentMonthKey()}-01`, { month: 'long', year: 'numeric' })

  const describe = (p) => {
    const bits = [t(`services.${p.service}`)]
    if (p.meta?.classes) bits.push(t('plan.classesPlan', { n: p.meta.classes }))
    if (p.meta?.riderId) bits.push(byId(s.riders, p.meta.riderId)?.name)
    if (p.meta?.horseId) bits.push(byId(s.horses, p.meta.horseId)?.name)
    if (p.meta?.month) bits.push(fmtDate(`${p.meta.month}-01`, { month: 'long' }))
    return bits.filter(Boolean).join(' · ')
  }

  const confirm = (p) => {
    const res = markPaid(p.id, method)
    setOpenId(null)
    toast(res.ok ? t('toasts.paid', { amount: fmtMoney(p.amount), method: t(`methods.${method}`) }) : t('errors.notFound'), res.ok ? 'success' : 'error')
  }

  return (
    <div className="page">
      <h1 className="page__title">{t('admin.payments.title')}</h1>

      <div className="card card--green total">
        <p className="card__label">{t('admin.payments.collected', { month: monthName })}</p>
        <p className="total__num">{fmtMoney(monthCollected(s))}</p>
        <p className="small">{t('admin.payments.pendingSum', { n: pending.length, amount: fmtMoney(pendingTotal) })}</p>
      </div>

      <SectionTitle>{t('admin.payments.pending')}</SectionTitle>
      {pending.length === 0 ? (
        <Empty icon="check" title={t('admin.payments.emptyTitle')} text={t('admin.payments.emptyText')} />
      ) : (
        <ul className="paylist">
          {pending.map((p) => (
            <li key={p.id} className="card pay">
              <div className="row gap">
                <span className="tile-icon"><Icon name={SERVICE_ICON[p.service]} /></span>
                <div className="grow">
                  <p className="list__title">{byId(s.families, p.familyId)?.name}</p>
                  <p className="small muted">{describe(p)}</p>
                  <p className="small muted">{t('admin.payments.since', { date: fmtInstant(p.createdAt) })}</p>
                </div>
                <strong className="pay__amount">{fmtMoney(p.amount)}</strong>
              </div>
              {openId === p.id ? (
                <div className="pay__confirm">
                  <Segmented small value={method} onChange={setMethod}
                    options={[{ value: 'cash', label: t('methods.cash') }, { value: 'transfer', label: t('methods.transfer') }]} />
                  <div className="row gap-sm">
                    <button type="button" className="btn btn--sm" onClick={() => setOpenId(null)}>{t('common.cancel')}</button>
                    <button type="button" className="btn btn--sm btn--primary" onClick={() => confirm(p)}>{t('common.confirm')}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn--outline btn--sm btn--block mt12" onClick={() => { setOpenId(p.id); setMethod('cash') }}>
                  <Icon name="check" size={16} /> {t('admin.payments.markPaid')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>{t('admin.payments.recent')}</SectionTitle>
      {recentPaid(s, 6).length ? (
        <ul className="card list">
          {recentPaid(s, 6).map((p) => (
            <li key={p.id} className="list__row">
              <Icon name={SERVICE_ICON[p.service]} size={18} />
              <div className="grow">
                <p className="list__title">{byId(s.families, p.familyId)?.name}</p>
                <p className="small muted">{t(`services.${p.service}`)} · {fmtInstant(p.paidAt)}</p>
              </div>
              <div className="right">
                <strong>{fmtMoney(p.amount)}</strong>
                <br /><Badge tone="success">{t(`methods.${p.method}`)}</Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="muted small">{t('admin.payments.noneRecent')}</p>}
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}
