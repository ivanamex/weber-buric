import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, monthResult, moduleOn, saveExpense, deleteExpense, saveCategory, INCOME_SOURCES,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { todayKey, currentMonthKey, monthEnd, addDays, monthKeyOf } from '../../lib/time.js'
import { useSave } from './useSave.js'

const lastMonths = (n) => {
  const out = [currentMonthKey()]
  while (out.length < n) out.unshift(monthKeyOf(addDays(`${out[0]}-01`, -1)))
  return out
}

function ExpenseForm({ categories, month, onDone }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const today = todayKey()
  const [f, setF] = useState({ spentOn: monthKeyOf(today) === month ? today : monthEnd(month), categoryId: categories[0]?.id || '', amount: '', note: '' })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveExpense(f), t('profit.expenseSaved'), onDone) }}>
      <div className="grid2">
        <label className="field"><span>{t('payroll.date')}</span>
          <input className="input" type="date" required value={f.spentOn} onChange={(e) => setF({ ...f, spentOn: e.target.value })} />
        </label>
        <label className="field"><span>{t('payroll.amount')}</span>
          <input className="input" type="number" inputMode="numeric" min={1} required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </label>
      </div>
      <label className="field"><span>{t('profit.category')}</span>
        <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <input className="input" aria-label={t('profit.note')} placeholder={t('profit.note')} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

function Categories() {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const cats = s.expenseCategories || []
  return (
    <div className="card">
      <ul className="list">
        {cats.map((c) => (
          <li key={c.id} className="list__row">
            {editing === c.id ? (
              <form className="row gap-sm grow" onSubmit={(e) => { e.preventDefault(); run(() => saveCategory({ ...c, name: draft }), t('schedule.saved'), () => setEditing(null)) }}>
                <input className="input grow" aria-label={t('profit.category')} value={draft} onChange={(e) => setDraft(e.target.value)} required autoFocus />
                <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
              </form>
            ) : (
              <>
                <span className={`grow ${c.active === false ? 'muted' : ''}`}>{c.name}</span>
                <button type="button" className="link" onClick={() => { setEditing(c.id); setDraft(c.name) }}>{t('more.profile.edit')}</button>
                <button type="button" className="link" onClick={() => run(() => saveCategory({ ...c, active: c.active === false }), t('schedule.saved'))}>{c.active === false ? t('profit.turnOn') : t('profit.turnOff')}</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="row gap-sm mt8" onSubmit={(e) => { e.preventDefault(); run(() => saveCategory({ name }), t('schedule.saved'), () => setName('')) }}>
        <input className="input grow" aria-label={t('profit.newCategory')} placeholder={t('profit.newCategory')} value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="btn btn--sm" disabled={busy}><Icon name="plus" size={16} /></button>
      </form>
    </div>
  )
}

/** Rentabilidad (module on/off): income by source − payroll − expenses = the month's result, with a 6-month trend. */
export default function AdminProfit() {
  const { t, fmtMoney, fmtDate } = useI18n()
  const s = useStore()
  const base = useBase()
  const [run] = useSave()
  const months = lastMonths(6)
  const [month, setMonth] = useState(months[months.length - 1])
  const [adding, setAdding] = useState(false)
  const [showCats, setShowCats] = useState(false)
  if (!moduleOn(s, 'moduleProfit')) return <Navigate to={`${base}/direccion/ajustes`} replace />
  const r = monthResult(s, month)
  const trend = months.map((m) => ({ m, result: monthResult(s, m).result }))
  const maxAbs = Math.max(...trend.map((x) => Math.abs(x.result)), 1)
  const cats = (s.expenseCategories || []).filter((c) => c.active !== false)
  const monthExpenses = (s.expenses || []).filter((x) => monthKeyOf(x.spentOn) === month).sort((a, b) => b.spentOn.localeCompare(a.spentOn))
  const monthName = (m, opts = { month: 'long', year: 'numeric' }) => fmtDate(`${m}-01`, opts)

  return (
    <div className="page">
      <h1 className="page__title">{t('profit.title')}</h1>
      <select className="input" aria-label={t('profit.month')} value={month} onChange={(e) => setMonth(e.target.value)}>
        {[...months].reverse().map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
      </select>

      <div className={`card result ${r.result < 0 ? 'result--neg' : ''}`}>
        <p className="card__label">{t('profit.result')}</p>
        <p className="bignum">{r.result < 0 ? '−' : ''}{fmtMoney(Math.abs(r.result))}</p>
        <ul className="list mt8">
          <li className="list__row"><span className="grow">{t('profit.income')}</span><strong>{fmtMoney(r.totalIncome)}</strong></li>
          <li className="list__row"><span className="grow">− {t('payroll.title')}</span><strong>{fmtMoney(r.payroll)}</strong></li>
          <li className="list__row"><span className="grow">− {t('profit.expenses')}</span><strong>{fmtMoney(r.expenses)}</strong></li>
        </ul>
      </div>

      <SectionTitle icon="trophy">{t('profit.incomeBySource')}</SectionTitle>
      <ul className="list card">
        {INCOME_SOURCES.map((k) => (
          <li key={k} className="list__row"><span className="grow">{t(`profit.sources.${k}`)}</span><strong>{fmtMoney(r.income[k] || 0)}</strong></li>
        ))}
      </ul>

      <SectionTitle icon="receipt" action={<button type="button" className="link" onClick={() => setShowCats(!showCats)}>{t('profit.categories')}</button>}>{t('profit.expenses')}</SectionTitle>
      {showCats && <Categories />}
      <ul className="list card">
        {monthExpenses.map((x) => (
          <li key={x.id} className="list__row">
            <div className="grow">
              <p className="list__title">{byId(s.expenseCategories || [], x.categoryId)?.name || t('profit.noCategory')}</p>
              <p className="small muted">{fmtDate(x.spentOn, { day: 'numeric', month: 'short' })}{x.note ? ` · ${x.note}` : ''}</p>
            </div>
            <strong>{fmtMoney(x.amount)}</strong>
            <button type="button" className="iconbtn" aria-label={t('profit.deleteExpense')} onClick={() => run(() => deleteExpense(x.id), t('profit.expenseDeleted'))}><Icon name="x" size={16} /></button>
          </li>
        ))}
        {monthExpenses.length === 0 && <li className="list__row small muted">{t('profit.noExpenses')}</li>}
      </ul>
      {adding ? <div className="card"><ExpenseForm categories={cats} month={month} onDone={() => setAdding(false)} /></div> : (
        <button type="button" className="btn btn--outline btn--sm btn--block" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> {t('profit.addExpense')}</button>
      )}

      <SectionTitle icon="chart">{t('profit.trend')}</SectionTitle>
      <div className="card trend" role="table" aria-label={t('profit.trend')}>
        {trend.map((x) => (
          <div key={x.m} className={`trend__row ${x.m === month ? 'is-current' : ''}`} role="row">
            <span className="trend__month" role="cell">{monthName(x.m, { month: 'short' })}</span>
            <span className="trend__track" role="cell" aria-hidden="true">
              <span className={`trend__bar ${x.result < 0 ? 'is-neg' : ''}`} style={{ width: `${(Math.abs(x.result) / maxAbs) * 50}%` }} />
            </span>
            <strong className="trend__value" role="cell">{x.result < 0 ? '−' : ''}{fmtMoney(Math.abs(x.result))}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
