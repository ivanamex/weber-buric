import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, saveEmployee, paySalary, upcomingSalaries, moduleOn, EMPLOYEE_ROLES } from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, SectionTitle, Segmented } from '../../components/ui.jsx'
import { todayKey } from '../../lib/time.js'
import { useSave } from './useSave.js'

function EmployeeForm({ employee, onDone }) {
  const { t } = useI18n()
  const [run, busy] = useSave()
  const [f, setF] = useState(employee
    ? { ...employee }
    : { name: '', role: 'instructor', salary: '', frequency: 'quincenal', nextPayDate: todayKey(), workingDays: '', active: true })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveEmployee(f), t('schedule.saved'), onDone) }}>
      <input className="input" aria-label={t('payroll.name')} placeholder={t('payroll.name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <div className="grid2">
        <label className="field"><span>{t('payroll.role')}</span>
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {EMPLOYEE_ROLES.map((r) => <option key={r} value={r}>{t(`payroll.roles.${r}`)}</option>)}
          </select>
        </label>
        <label className="field"><span>{t('payroll.salary')}</span>
          <input className="input" type="number" inputMode="numeric" min={0} step={100} required value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} />
        </label>
      </div>
      <div className="field"><span>{t('payroll.frequency')}</span>
        <Segmented small value={f.frequency} onChange={(frequency) => setF({ ...f, frequency })}
          options={['quincenal', 'mensual'].map((v) => ({ value: v, label: t(`payroll.freq.${v}`) }))} />
      </div>
      <div className="grid2">
        <label className="field"><span>{t('payroll.nextPay')}</span>
          <input className="input" type="date" required value={f.nextPayDate} onChange={(e) => setF({ ...f, nextPayDate: e.target.value })} />
        </label>
        <label className="field"><span>{t('payroll.days')}</span>
          <input className="input" placeholder={t('payroll.daysPh')} value={f.workingDays || ''} onChange={(e) => setF({ ...f, workingDays: e.target.value })} />
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} /> <span>{t('payroll.active')}</span></label>
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

function PayForm({ employee, onDone }) {
  const { t, fmtMoney } = useI18n()
  const [run, busy] = useSave()
  const [f, setF] = useState({ amount: employee.salary, method: 'transfer', date: todayKey() })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => paySalary({ employeeId: employee.id, ...f }), t('payroll.paidToast', { name: employee.name, amount: fmtMoney(Number(f.amount)) }), onDone) }}>
      <div className="grid2">
        <label className="field"><span>{t('payroll.amount')}</span>
          <input className="input" type="number" inputMode="numeric" min={0} required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </label>
        <label className="field"><span>{t('payroll.date')}</span>
          <input className="input" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </label>
      </div>
      <Segmented small value={f.method} onChange={(method) => setF({ ...f, method })}
        options={['transfer', 'cash'].map((m) => ({ value: m, label: t(`methods.${m}`) }))} />
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('payroll.confirmPay')}</button>
      </div>
    </form>
  )
}

/** Nómina (management only, module on/off): staff, salaries, "Pagar" and each person's payment history. */
export default function AdminPayroll() {
  const { t, fmtMoney, fmtDate } = useI18n()
  const s = useStore()
  const base = useBase()
  const [editing, setEditing] = useState(null) // id | 'new'
  const [paying, setPaying] = useState(null)
  const [history, setHistory] = useState(null)
  if (!moduleOn(s, 'modulePayroll')) return <Navigate to={`${base}/direccion/ajustes`} replace />
  const employees = [...(s.employees || [])].sort((a, b) => (b.active !== false) - (a.active !== false) || a.name.localeCompare(b.name))
  const upcoming = upcomingSalaries(s, 15)
  const today = todayKey()
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })

  return (
    <div className="page">
      <h1 className="page__title">{t('payroll.title')}</h1>

      <div className="card">
        <p className="card__label">{t('payroll.next15')}</p>
        <p className="bignum">{fmtMoney(upcoming.reduce((a, e) => a + e.salary, 0))}</p>
        <p className="small muted">{upcoming.length ? upcoming.map((e) => `${e.name.split(' ')[0]} · ${short(e.nextPayDate)}`).join(' · ') : t('payroll.noneDue')}</p>
      </div>

      <SectionTitle icon="users">{t('payroll.staff')}</SectionTitle>
      <ul className="list card">
        {employees.map((e) => {
          const due = e.active !== false && e.nextPayDate <= today
          const pays = (s.salaryPayments || []).filter((p) => p.employeeId === e.id).sort((a, b) => b.paidOn.localeCompare(a.paidOn))
          return (
            <li key={e.id} className="list__row list__row--stack">
              {editing === e.id ? <EmployeeForm employee={e} onDone={() => setEditing(null)} /> : (
                <>
                  <div className="row gap">
                    <span className="chip__avatar chip__avatar--lg">{e.name[0]}</span>
                    <div className="grow">
                      <p className="list__title">{e.name} {e.active === false && <Badge tone="neutral">{t('schedule.off')}</Badge>}</p>
                      <p className="small muted">{t(`payroll.roles.${e.role}`)} · {fmtMoney(e.salary)} {t(`payroll.freq.${e.frequency}`).toLowerCase()}{e.workingDays ? ` · ${e.workingDays}` : ''}</p>
                      {e.active !== false && <p className={`small ${due ? 'owed__late' : 'muted'}`}>{t('payroll.nextOn', { date: short(e.nextPayDate) })}</p>}
                    </div>
                    <button type="button" className="link" onClick={() => setEditing(e.id)}>{t('more.profile.edit')}</button>
                  </div>
                  {paying === e.id ? <PayForm employee={e} onDone={() => setPaying(null)} /> : (
                    <div className="row gap-sm">
                      {e.active !== false && <button type="button" className="btn btn--sm btn--primary" onClick={() => setPaying(e.id)}>{t('payroll.pay')}</button>}
                      <button type="button" className="link" onClick={() => setHistory(history === e.id ? null : e.id)}>{t(history === e.id ? 'history.hide' : 'payroll.history', { n: pays.length })}</button>
                    </div>
                  )}
                  {history === e.id && (
                    <ul className="list">
                      {pays.length ? pays.map((p) => (
                        <li key={p.id} className="list__row small"><span className="grow">{fmtDate(p.paidOn, { day: 'numeric', month: 'short', year: 'numeric' })} · {t(`methods.${p.method}`)}</span><strong>{fmtMoney(p.amount)}</strong></li>
                      )) : <li className="list__row small muted">{t('payroll.noPays')}</li>}
                    </ul>
                  )}
                </>
              )}
            </li>
          )
        })}
        {employees.length === 0 && <li className="list__row small muted">{t('payroll.noStaff')}</li>}
      </ul>
      {editing === 'new' ? <div className="card"><EmployeeForm onDone={() => setEditing(null)} /></div> : (
        <button type="button" className="btn btn--outline btn--sm btn--block" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> {t('payroll.add')}</button>
      )}
    </div>
  )
}
