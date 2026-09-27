import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, pendingPayments, markPaid, monthCollected, recentPaid, saveSettings, saveClassPrices } from '../../data/store.js'
import { CLASS_PRICES, CLASS_KINDS } from '../../data/prices.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, SectionTitle, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { currentMonthKey } from '../../lib/time.js'
import { ReceiptBadge, BankDetails } from '../../components/Transfer.jsx'
import ReceiptViewer from './ReceiptViewer.jsx'
import { SaveBar } from '../../components/EditKit.jsx'
import { concept } from '../../components/PaymentHistory.jsx'

const SERVICE_ICON = { plan: 'horseshoe', boarding: 'saddle', camp: 'balloons', rental: 'horseHead', events: 'cake' }

export default function AdminPayments() {
  const { t, fmtMoney, fmtInstant, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  // Receipts waiting for review first.
  const pending = pendingPayments(s).sort((a, b) => (b.receiptStatus === 'review') - (a.receiptStatus === 'review'))
  const [viewing, setViewing] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [method, setMethod] = useState('cash')
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0)
  const monthName = fmtDate(`${currentMonthKey()}-01`, { month: 'long', year: 'numeric' })

  const describe = (p) => {
    const bits = [concept(t, p)]
    if (p.meta?.classes && p.meta?.kind !== 'upgrade') bits.push(t('plan.classesPlan', { n: p.meta.classes }))
    if (p.meta?.riderId) bits.push(byId(s.riders, p.meta.riderId)?.name)
    if (p.meta?.horseId) bits.push(byId(s.horses, p.meta.horseId)?.name)
    if (p.meta?.date) bits.push(fmtDate(p.meta.date, { day: 'numeric', month: 'short' }))
    if (p.meta?.month) bits.push(fmtDate(`${p.meta.month}-01`, { month: 'long' }))
    return bits.filter(Boolean).join(' · ')
  }

  const [busy, setBusy] = useState(false)
  const confirm = async (p) => {
    setBusy(true)
    const res = await markPaid(p.id, method)
    setBusy(false)
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

      <SectionTitle icon="receipt">{t('admin.payments.pending')}</SectionTitle>
      {pending.length === 0 ? (
        <Empty icon="receipt" title={t('admin.payments.emptyTitle')} />
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
                <div className="right">
                  <strong className="pay__amount">{fmtMoney(p.amount)}</strong>
                  <div><ReceiptBadge status={p.receiptStatus} /></div>
                </div>
              </div>
              {p.receiptStatus === 'rejected' && p.receiptNote && <p className="small muted mt8">“{p.receiptNote}”</p>}
              {p.receiptStatus === 'review' && openId !== p.id && (
                <button type="button" className="btn btn--accent btn--sm btn--block mt12" onClick={() => setViewing(p)}>
                  <Icon name="info" size={16} /> {t('receipt.view')}
                </button>
              )}
              {openId === p.id ? (
                <div className="pay__confirm">
                  <Segmented small value={method} onChange={setMethod}
                    options={[{ value: 'cash', label: t('methods.cash') }, { value: 'transfer', label: t('methods.transfer') }]} />
                  <div className="row gap-sm">
                    <button type="button" className="btn btn--sm" onClick={() => setOpenId(null)}>{t('common.cancel')}</button>
                    <button type="button" className="btn btn--sm btn--primary" onClick={() => confirm(p)} disabled={busy}>{t('common.confirm')}</button>
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

      <SectionTitle>{t('receipt.bankTitle')}</SectionTitle>
      <BankSettings />

      <SectionTitle icon="horseshoe">{t('prices.title')}</SectionTitle>
      <ClassPrices />

      <SectionTitle>{t('admin.payments.recent')}</SectionTitle>
      {recentPaid(s, 6).length ? (
        <ul className="card list">
          {recentPaid(s, 6).map((p) => (
            <li key={p.id} className="list__row">
              <Icon name={SERVICE_ICON[p.service]} size={18} />
              <div className="grow">
                <p className="list__title">{byId(s.families, p.familyId)?.name}</p>
                <p className="small muted">{concept(t, p)} · {fmtInstant(p.paidAt)}</p>
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
      {viewing && (
        <ReceiptViewer payment={viewing} title={`${byId(s.families, viewing.familyId)?.name} · ${describe(viewing)}`} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}

/** Prices of the classes outside the packages (plans stay the main path). */
function ClassPrices() {
  const { t, fmtMoney } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({})
  const [base, setBase] = useState('{}')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = () => { const next = { ...CLASS_PRICES }; setF(next); setBase(JSON.stringify(next)); setError(null); setEditing(true) }
  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveClassPrices(f)
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
    toast(t('toasts.pricesSaved'))
    setEditing(false)
  }
  if (!editing) {
    return (
      <div className="card">
        <ul className="list">
          {CLASS_KINDS.map((k) => (
            <li key={k} className="list__row"><span className="grow">{t(`classKind.${k}`)}</span><strong>{fmtMoney(CLASS_PRICES[k])}</strong></li>
          ))}
        </ul>
        <p className="small muted mt8">{t('prices.hint')}</p>
        <button type="button" className="btn btn--outline btn--sm btn--block mt12" onClick={start}>{t('more.profile.edit')}</button>
      </div>
    )
  }
  return (
    <form className="card" onSubmit={onSave}>
      {CLASS_KINDS.map((k) => (
        <label key={k} className="field" htmlFor={`price-${k}`}><span>{t(`classKind.${k}`)} (MXN)</span>
          <input id={`price-${k}`} className="input" type="number" inputMode="numeric" min={0} step={10} required
            value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </label>
      ))}
      <SaveBar busy={busy} dirty={JSON.stringify(f) !== base} error={error} onCancel={() => setEditing(false)} />
    </form>
  )
}

function BankSettings() {
  const { t } = useI18n()
  const toast = useToast()
  const { settings = {} } = useStore()
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({})
  const [base, setBase] = useState('{}')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const start = () => { const next = { bankName: settings?.bankName || '', accountHolder: settings?.accountHolder || '', clabe: settings?.clabe || '' }; setF(next); setBase(JSON.stringify(next)); setError(null); setEditing(true) }
  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveSettings(f)
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
    toast(t('toasts.bankSaved'))
    setEditing(false)
  }
  if (!editing) {
    return (
      <div className="card">
        <BankDetails />
        <button type="button" className="btn btn--outline btn--sm btn--block mt12" onClick={start}>{t('more.profile.edit')}</button>
      </div>
    )
  }
  return (
    <form className="card" onSubmit={onSave}>
      <label className="field" htmlFor="bank-name"><span>{t('receipt.bank')}</span>
        <input id="bank-name" className="input" value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} />
      </label>
      <label className="field" htmlFor="bank-holder"><span>{t('receipt.holder')}</span>
        <input id="bank-holder" className="input" value={f.accountHolder} onChange={(e) => setF({ ...f, accountHolder: e.target.value })} />
      </label>
      <label className="field" htmlFor="bank-clabe"><span>CLABE (18)</span>
        <input id="bank-clabe" className="input" inputMode="numeric" maxLength={22} value={f.clabe} onChange={(e) => setF({ ...f, clabe: e.target.value })} />
      </label>
      <SaveBar busy={busy} dirty={JSON.stringify(f) !== base} error={error} onCancel={() => setEditing(false)} />
    </form>
  )
}
