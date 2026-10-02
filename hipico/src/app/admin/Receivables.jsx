import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, markPaid, receivables, cashflow, remindersFor, dueOf } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { ReceiptBadge } from '../../components/Transfer.jsx'
import { concept, paymentSentence } from '../../components/PaymentHistory.jsx'
import { daysBetween, todayKey } from '../../lib/time.js'
import { familyWaLink } from './Summary.jsx'
import { DataTable, exportCsv, useDeskAction, useDeskSearch } from '../../components/Desk.jsx'
import { Sheet } from '../../components/EditKit.jsx'
import { addDays } from '../../lib/time.js'

export const SERVICE_ICON = { plan: 'horseshoe', boarding: 'saddle', camp: 'balloons', rental: 'horseHead', events: 'cake', class: 'helmet' }
const GROUPS = ['overdue', 'today', 'soon', 'later']
const FILTERS = ['all', 'plan', 'boarding', 'class', 'rental', 'events']
const matches = (filter, x) => filter === 'all' || x.service === filter || (filter === 'events' && x.service === 'camp')

/** "Nico · 8 clases · octubre", "Relámpago · noviembre" … */
function useDescribe() {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  return (p) => {
    const bits = [concept(t, p)]
    if (p.meta?.classes && p.meta?.kind !== 'upgrade') bits.push(t('plan.classesPlan', { n: p.meta.classes }))
    if (p.meta?.riderId) bits.push(byId(s.riders, p.meta.riderId)?.name)
    if (p.meta?.horseId) bits.push(byId(s.horses, p.meta.horseId)?.name)
    if (p.meta?.month && p.service === 'boarding') bits.push(fmtDate(`${p.meta.month}-01`, { month: 'long' }))
    return bits.filter(Boolean).join(' · ')
  }
}

function DueLine({ item }) {
  const { t, fmtDate } = useI18n()
  const today = todayKey()
  const short = fmtDate(item.due, { day: 'numeric', month: 'short' })
  if (item.state === 'overdue') return <span className="due due--late">{t('collect.dueOverdue', { date: short, n: daysBetween(item.due, today) })}</span>
  if (item.state === 'today') return <span className="due due--today">{t('collect.dueToday')}</span>
  return <span className={`due ${item.state === 'soon' ? 'due--soon' : ''}`}>{t('collect.dueOn', { date: short })}</span>
}

function Reminders({ payment }) {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const list = remindersFor(s, payment)
  if (!list.length) return null
  // Weekly reminders read as one entry: "semanal ×3 (25 sep, correo enviado)".
  const weekly = list.filter((r) => r.kind === 'weekly')
  const shown = [...list.filter((r) => r.kind !== 'weekly'), ...(weekly.length ? [{ ...weekly[weekly.length - 1], times: weekly.length }] : [])]
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  return (
    <p className="reminders small muted">
      <Icon name="clock" size={14} />
      <span>{t('collect.reminders')}:{' '}
        {shown.map((r) => `${t(`collect.kinds.${r.kind}`)}${r.times > 1 ? ` ×${r.times}` : ''} (${short(r.sentOn)}, ${t(`collect.status.${r.emailStatus || 'pending'}`)})`).join(' · ')}</span>
    </p>
  )
}

function PayRow({ item, onView }) {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const toast = useToast()
  const describe = useDescribe()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('cash')
  const [busy, setBusy] = useState(false)
  const family = byId(s.families, item.familyId)
  const confirm = async () => {
    setBusy(true)
    const res = await markPaid(item.id, method)
    setBusy(false)
    setOpen(false)
    toast(res.ok ? t('toasts.paid', { amount: fmtMoney(item.amount), method: t(`methods.${method}`) }) : t('errors.notFound'), res.ok ? 'success' : 'error')
  }
  const waText = t('summary.waReminder', { contact: family?.contact?.split(' ')[0] || '', what: paymentSentence(t, s, item), amount: fmtMoney(item.amount) })
  return (
    <li className={`card pay ${item.projected ? 'pay--expected' : ''}`}>
      <div className="row gap">
        <span className="tile-icon"><Icon name={SERVICE_ICON[item.service] || 'receipt'} /></span>
        <div className="grow">
          <p className="list__title">{family?.name}</p>
          <p className="small muted">{describe(item)}</p>
          <p className="small"><DueLine item={item} /></p>
        </div>
        <div className="right">
          <strong className="pay__amount">{fmtMoney(item.amount)}</strong>
          <div>{item.projected ? <Badge tone="neutral">{t('collect.expected')}</Badge> : <ReceiptBadge status={item.receiptStatus} />}</div>
        </div>
      </div>
      {item.projected ? <p className="small muted mt8">{t(item.state === 'overdue' ? 'collect.notCharged' : 'collect.expectedHint')}</p> : (
        <>
          <Reminders payment={item} />
          {item.receiptStatus === 'rejected' && item.receiptNote && <p className="small muted mt8">“{item.receiptNote}”</p>}
          {item.receiptStatus === 'review' && !open && (
            <button type="button" className="btn btn--accent btn--sm btn--block mt12" onClick={() => onView(item)}>
              <Icon name="info" size={16} /> {t('receipt.view')}
            </button>
          )}
          {open ? (
            <div className="pay__confirm">
              <Segmented small value={method} onChange={setMethod}
                options={[{ value: 'cash', label: t('methods.cash') }, { value: 'transfer', label: t('methods.transfer') }]} />
              <div className="row gap-sm">
                <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
                <button type="button" className="btn btn--sm btn--primary" onClick={confirm} disabled={busy}>{t('common.confirm')}</button>
              </div>
            </div>
          ) : (
            <div className="pay__actions">
              <button type="button" className="btn btn--outline btn--sm" onClick={() => { setOpen(true); setMethod('cash') }}>
                <Icon name="check" size={16} /> {t('admin.payments.markPaid')}
              </button>
              {family?.phone && item.state !== 'later' && (
                <a className="iconbtn iconbtn--card" href={familyWaLink(family.phone, waText)} target="_blank" rel="noopener noreferrer" aria-label={t('collect.remind', { name: family.name })}>
                  <Icon name="whatsapp" size={20} />
                </a>
              )}
            </div>
          )}
        </>
      )}
    </li>
  )
}

/** Por cobrar: overdue, due today, next 5 days, later this month, with totals and filters. */
export function Receivables({ onView }) {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const [filter, setFilter] = useState('all')
  const [only, setOnly] = useState(null)
  const { groups } = receivables(s)
  const shown = Object.fromEntries(GROUPS.map((g) => [g, groups[g].filter((x) => matches(filter, x))]))
  const sum = (list) => list.reduce((a, x) => a + x.amount, 0)
  const any = GROUPS.some((g) => shown[g].length)
  return (
    <>
      <SectionTitle icon="receipt">{t('collect.title')}</SectionTitle>
      <div className="duegroups" role="group" aria-label={t('collect.title')}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={`duegroup duegroup--${g} ${only === g ? 'is-active' : ''}`} aria-pressed={only === g} onClick={() => setOnly(only === g ? null : g)}>
            <span className="duegroup__label">{t(`collect.groups.${g}`)}</span>
            <strong className="duegroup__sum">{fmtMoney(sum(shown[g]))}</strong>
            <span className="duegroup__n">{t('collect.count', { n: shown[g].length })}</span>
          </button>
        ))}
      </div>
      <div className="chips-scroll" role="group">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`collect.filters.${f}`)}</button>
        ))}
      </div>
      {!any && <p className="muted small">{t('collect.none')}</p>}
      {GROUPS.filter((g) => (!only || only === g) && shown[g].length).map((g) => (
        <section key={g} className="duesection">
          <p className={`duesection__title duesection__title--${g}`}>{t(`collect.groups.${g}`)} · {fmtMoney(sum(shown[g]))}</p>
          <ul className="paylist">{shown[g].map((x) => <PayRow key={x.id} item={x} onView={onView} />)}</ul>
        </section>
      ))}
      {only && !shown[only].length && <p className="muted small">{t('collect.noneGroup')}</p>}
    </>
  )
}

/** Flujo por mes: this month and the next two — expected, collected, still to collect, overdue. */
export function Cashflow() {
  const { t, fmtMoney, fmtDate } = useI18n()
  const s = useStore()
  const describe = useDescribe()
  const [open, setOpen] = useState(null)
  const months = cashflow(s)
  return (
    <>
      <SectionTitle icon="chart">{t('collect.flow')}</SectionTitle>
      <div className="flow">
        {months.map((m) => {
          const pct = m.expected ? Math.round((m.collected / m.expected) * 100) : 0
          return (
            <section key={m.month} className="card flow__month">
              <p className="card__title flow__name">{fmtDate(`${m.month}-01`, { month: 'long', year: 'numeric' })}</p>
              <div className="flow__bar" role="img" aria-label={`${t('collect.flowCollected')} ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
              <dl className="flow__nums">
                <div><dt>{t('collect.flowExpected')}</dt><dd>{fmtMoney(m.expected)}</dd></div>
                <div><dt>{t('collect.flowCollected')}</dt><dd>{fmtMoney(m.collected)}</dd></div>
                <div><dt>{t('collect.flowPending')}</dt><dd>{fmtMoney(m.pending)}</dd></div>
                <div className={m.overdue ? 'is-late' : ''}><dt>{t('collect.flowOverdue')}</dt><dd>{fmtMoney(m.overdue)}</dd></div>
              </dl>
              {m.lines.length > 0 && (
                <button type="button" className="link" onClick={() => setOpen(open === m.month ? null : m.month)}>{open === m.month ? t('collect.flowHide') : t('collect.flowShow')}</button>
              )}
              {open === m.month && (
                <ul className="list">
                  {m.lines.map((x) => (
                    <li key={x.id} className="list__row">
                      <Icon name={SERVICE_ICON[x.service] || 'receipt'} size={18} />
                      <div className="grow">
                        <p className="list__title">{byId(s.families, x.familyId)?.name}</p>
                        <p className="small muted">{describe(x)} · {fmtDate(x.due, { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="right">
                        <strong>{fmtMoney(x.amount)}</strong><br />
                        {x.projected ? <Badge tone="neutral">{t('collect.expected')}</Badge>
                          : x.status === 'paid' ? <Badge tone="success">{t('collect.paidTag')}</Badge>
                            : <Badge tone={x.due < todayKey() ? 'alert' : 'accent'}>{t(x.due < todayKey() ? 'collect.flowOverdue' : 'collect.flowPending')}</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

/** Cobros on a computer: the four totals, then one sortable table (search, status and concept filters), details in a side panel, CSV export. */
export function ReceivablesDesk({ onView }) {
  const { t, fmtMoney, fmtDate, fmtInstant } = useI18n()
  const s = useStore()
  const describe = useDescribe()
  const q = useDeskSearch(t('collect.searchPh'))
  const [status, setStatus] = useState('pending')
  const [filter, setFilter] = useState('all')
  const [only, setOnly] = useState(null)
  const [open, setOpen] = useState(null)
  const today = todayKey()
  const { groups } = receivables(s)
  const sum = (list) => list.reduce((a, x) => a + x.amount, 0)
  const pending = GROUPS.flatMap((g) => groups[g])
  const since = addDays(today, -60)
  const paid = s.payments.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt.slice(0, 10) >= since)
    .map((p) => ({ ...p, due: dueOf(s, p), state: 'paid' }))
  const base = status === 'pending' ? pending : status === 'paid' ? paid : [...pending, ...paid]
  const rows = base
    .filter((x) => matches(filter, x) && (!only || x.state === only))
    .filter((x) => !q || [byId(s.families, x.familyId)?.name, describe(x)].some((v) => v?.toLowerCase().includes(q)))
  const stateLabel = (x) => (x.state === 'paid' ? t('collect.paidTag') : x.state === 'overdue' ? t('collect.dueOverdue', { date: fmtDate(x.due, { day: 'numeric', month: 'short' }), n: daysBetween(x.due, today) })
    : t(`collect.groups.${x.state}`))
  const columns = [
    { key: 'family', label: t('collect.col.family'), value: (x) => byId(s.families, x.familyId)?.name || '', render: (x) => <span className="dtable__strong">{byId(s.families, x.familyId)?.name}</span> },
    { key: 'concept', label: t('collect.col.concept'), value: (x) => describe(x) },
    { key: 'due', nowrap: true, label: t('collect.col.due'), value: (x) => x.due, render: (x) => fmtDate(x.due, { day: 'numeric', month: 'short', year: 'numeric' }), csv: (x) => x.due },
    { key: 'state', label: t('desk.status'), value: (x) => ({ overdue: 0, today: 1, soon: 2, later: 3, paid: 4 }[x.state]), csv: (x) => stateLabel(x),
      render: (x) => (
        <span className="row gap-sm wrap">
          <Badge tone={x.state === 'paid' ? 'success' : x.state === 'overdue' ? 'alert' : x.state === 'later' ? 'neutral' : 'accent'}>{stateLabel(x)}</Badge>
          {x.projected && <Badge tone="neutral">{t('collect.expected')}</Badge>}
          {x.receiptStatus && x.state !== 'paid' && <ReceiptBadge status={x.receiptStatus} />}
        </span>
      ) },
    { key: 'reminders', label: t('collect.reminders'), value: (x) => (x.projected || x.state === 'paid' ? 0 : remindersFor(s, x).length), csv: (x) => (x.projected || x.state === 'paid' ? '' : remindersFor(s, x).length) },
    { key: 'amount', nowrap: true, label: t('collect.col.amount'), align: 'right', value: (x) => x.amount, render: (x) => <strong>{fmtMoney(x.amount)}</strong> },
  ]
  useDeskAction({ label: t('desk.export'), icon: 'download', onClick: () => exportCsv(`cobros-${today}.csv`, columns, rows) }, [rows.length, status, filter, only, q])
  const selected = open && [...pending, ...paid].find((x) => x.id === open)
  return (
    <>
      <div className="duegroups" role="group" aria-label={t('collect.title')}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className={`duegroup duegroup--${g} ${only === g ? 'is-active' : ''}`} aria-pressed={only === g} onClick={() => { setOnly(only === g ? null : g); setStatus('pending') }}>
            <span className="duegroup__label">{t(`collect.groups.${g}`)}</span>
            <strong className="duegroup__sum">{fmtMoney(sum(groups[g]))}</strong>
            <span className="duegroup__n">{t('collect.count', { n: groups[g].length })}</span>
          </button>
        ))}
      </div>
      <div className="dtoolbar">
        <Segmented small value={status} onChange={(v) => { setStatus(v); if (v !== 'pending') setOnly(null) }} options={[
          { value: 'pending', label: t('collect.status2.pending') }, { value: 'paid', label: t('collect.status2.paid') }, { value: 'all', label: t('desk.all') },
        ]} />
        <div className="chips-scroll grow" role="group">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`collect.filters.${f}`)}</button>
          ))}
        </div>
        <button type="button" className="btn btn--sm" onClick={() => window.print()} title={t('desk.print')}><Icon name="printer" size={16} /> {t('desk.print')}</button>
      </div>
      <DataTable columns={columns} rows={rows} onRow={(x) => setOpen(x.id)} selected={open} defaultSort={{ key: 'due', dir: status === 'paid' ? -1 : 1 }}
        empty={<p className="muted small">{t('collect.none')}</p>} />
      <p className="small muted">{t('collect.tableTotal', { n: rows.length, amount: fmtMoney(sum(rows)) })}</p>
      {selected && (
        <Sheet title={byId(s.families, selected.familyId)?.name || ''} onClose={() => setOpen(null)}>
          {selected.state === 'paid' ? (
            <div className="card">
              <p className="list__title">{describe(selected)}</p>
              <p className="small muted">{t('collect.dueOn', { date: fmtDate(selected.due, { day: 'numeric', month: 'short' }) })}</p>
              <p className="mt8"><strong>{fmtMoney(selected.amount)}</strong> · <Badge tone="success">{t(`methods.${selected.method}`)}</Badge> · {fmtInstant(selected.paidAt)}</p>
            </div>
          ) : <ul className="paylist"><PayRow item={selected} onView={onView} /></ul>}
        </Sheet>
      )}
    </>
  )
}
