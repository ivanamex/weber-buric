import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { useStore, byId, paymentHistory, planChangesFor } from '../data/store.js'
import ReceiptViewer from '../app/admin/ReceiptViewer.jsx'
import { Badge } from './ui.jsx'
import { Icon } from './Icon.jsx'

/** What a payment was for: "Plan mensual", "Diferencia de plan (4 → 8 clases)", "Pensión"… */
export function concept(t, p) {
  if (p.service === 'class') return t(`classKind.${p.meta?.kind || 'single'}`)
  if (p.service === 'plan' && p.meta?.kind === 'upgrade') return t('services.planDiff', { from: p.meta.fromClasses, to: p.meta.classes })
  return t(`services.${p.service}`)
}

function statusOf(p) {
  if (p.status === 'paid') return ['success', 'history.paid']
  if (p.receiptStatus === 'review') return ['accent', 'receipt.status.review']
  if (p.receiptStatus === 'rejected') return ['alert', 'receipt.status.rejected']
  return ['alert', 'history.pending']
}

/** Payments of the last 12 months: date, concept, amount, method, status and the receipt when there is one. */
export function PaymentHistory({ familyId }) {
  const { t, fmtMoney, fmtInstant } = useI18n()
  const s = useStore()
  const [viewing, setViewing] = useState(null)
  const list = paymentHistory(s, familyId)
  if (!list.length) return <p className="muted small">{t('history.empty')}</p>
  return (
    <>
      <ul className="list card history">
        {list.map((p) => {
          const [tone, label] = statusOf(p)
          const who = p.meta?.riderId ? byId(s.riders, p.meta.riderId)?.name : p.meta?.horseId ? byId(s.horses, p.meta.horseId)?.name : null
          return (
            <li key={p.id} className="list__row list__row--stack">
              <div className="row gap">
                <div className="grow">
                  <p className="list__title">{concept(t, p)}{who ? ` · ${who}` : ''}</p>
                  <p className="small muted">
                    {fmtInstant(p.paidAt || p.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.method ? ` · ${t(`methods.${p.method}`)}` : ''}
                  </p>
                </div>
                <div className="right">
                  <strong>{fmtMoney(p.amount)}</strong>
                  <div><Badge tone={tone}>{t(label)}</Badge></div>
                </div>
              </div>
              {p.receiptPath && (
                <button type="button" className="link history__receipt" onClick={() => setViewing(p)}><Icon name="receipt" size={14} /> {t('history.receipt')}</button>
              )}
            </li>
          )
        })}
      </ul>
      {viewing && <ReceiptViewer payment={viewing} title={concept(t, viewing)} onClose={() => setViewing(null)} readOnly />}
    </>
  )
}

/** Plan history of a family (management): new plans, upgrades and downgrades. */
export function PlanHistory({ familyId }) {
  const { t, fmtInstant, fmtDate } = useI18n()
  const s = useStore()
  const list = planChangesFor(s, familyId)
  if (!list.length) return <p className="muted small">{t('history.noChanges')}</p>
  return (
    <ul className="list">
      {list.map((c) => (
        <li key={c.id} className="list__row small">
          <span className="grow">
            <strong>{byId(s.riders, c.riderId)?.name}</strong> · {t(`history.kind.${c.kind}`, { from: c.fromClasses ?? '—', to: c.toClasses })}
            <span className="muted"> · {t('history.from', { month: fmtDate(`${c.effectiveMonth}-01`, { month: 'short', year: 'numeric' }) })}</span>
          </span>
          <span className="muted">{fmtInstant(c.createdAt)}</span>
        </li>
      ))}
    </ul>
  )
}
