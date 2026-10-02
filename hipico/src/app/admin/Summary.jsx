import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, activeCounts, moneySummary, overdue, renewingSoon, weekOccupancy, upcomingSalaries, moduleOn, healthDueSoon, occurrencesFor,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { concept, paymentSentence } from '../../components/PaymentHistory.jsx'
import { todayKey } from '../../lib/time.js'
import IncomeChart from './IncomeChart.jsx'

/** WhatsApp link to a family's phone (Mexican numbers get +52), with a friendly reminder. */
export function familyWaLink(phone, text) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = `52${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** Management's first screen: who's active, money, who owes, renewals, occupancy. */
export default function AdminSummary() {
  const { t, fmtMoney, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  const base = useBase()
  const [allOwed, setAllOwed] = useState(false)
  const counts = activeCounts(s)
  const money = moneySummary(s)
  const owed = overdue(s)
  const renewing = renewingSoon(s)
  const occ = weekOccupancy(s)
  const salaries = moduleOn(s, 'modulePayroll') ? upcomingSalaries(s, 15) : []
  const horseDue = healthDueSoon(s, 14)
  const pct = money.expected ? Math.round((money.expectedPaid / money.expected) * 100) : 0
  const owedShown = allOwed ? owed : owed.slice(0, 5)
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  const todayClasses = occurrencesFor(s, todayKey(), null, { includeClosed: true }).filter((o) => o.bookings.length > 0)

  return (
    <div className="page">
      <section className="homehead">
        <div>
          <h1 className="page__title">{t('summary.title')}</h1>
          <p className="daylabel">{fmtDate(todayKey())}</p>
        </div>
      <div className="stats stats--4">
        <div className="stat"><strong>{counts.families}</strong><span>{t('summary.families')}</span></div>
        <div className="stat"><strong>{counts.riders}</strong><span>{t('summary.riders')}</span></div>
        <div className="stat">
          <strong>{counts.plans}</strong><span>{t('summary.plans')}</span>
          {counts.plans > 0 && <small>{Object.entries(counts.byType).sort((a, b) => a[0] - b[0]).map(([n, c]) => t('summary.planType', { n, c })).join(' · ')}</small>}
        </div>
        <div className="stat"><strong>{counts.boarded}</strong><span>{t('summary.boarded')}</span></div>
      </div>
      </section>

      <div className="sumgrid">
      <section className="sumblock sumblock--money">
      <SectionTitle icon="receipt">{t('summary.money')}</SectionTitle>
      <div className="card">
        <div className="money3">
          <div><span className="small muted">{t('summary.today')}</span><strong>{fmtMoney(money.today)}</strong></div>
          <div><span className="small muted">{t('summary.thisMonth')}</span><strong>{fmtMoney(money.month)}</strong></div>
          <div><span className="small muted">{t('summary.last30')}</span><strong>{fmtMoney(money.last30)}</strong></div>
        </div>
        <div className="expected mt12">
          <div className="row between small"><span>{t('summary.expected')}</span><span><strong>{fmtMoney(money.expectedPaid)}</strong> / {fmtMoney(money.expected)} · {pct}%</span></div>
          <div className="expected__track"><span style={{ width: `${pct}%` }} /></div>
        </div>
        <p className="card__label mt16">{t('summary.chartTitle')}</p>
        <IncomeChart daily={money.daily} />
      </div>

      </section>
      <section className="sumblock sumblock--today">
        <SectionTitle icon="helmet" action={<Link to={`${base}/direccion/hoy`} className="link">{t('summary.open')}</Link>}>{t('tabs.today')}</SectionTitle>
        {todayClasses.length === 0 ? <p className="muted small">{t('admin.today.emptyTitle')}</p> : (
          <ul className="list card">
            {todayClasses.map((o) => (
              <li key={o.slot.id} className="list__row">
                <strong className="sumtime">{fmtTime(o.slot.time)}</strong>
                <span className="grow"><span className="list__title">{t(`disciplines.${o.slot.discipline}`)}</span> <span className="small muted">· {t(`levels.${o.slot.level}`)}</span></span>
                <span className="small">{t('summary.ridersN', { n: o.bookings.length, cap: o.slot.capacity })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="sumblock">
      <SectionTitle icon="alert">{t('summary.owes', { n: owed.length })}</SectionTitle>
      {owed.length === 0 ? (
        <p className="muted small">{t('summary.nobodyOwes')}</p>
      ) : (
        <ul className="list card">
          {owedShown.map(({ payment: p, days, family }) => {
            const rider = p.meta?.riderId ? byId(s.riders, p.meta.riderId)?.name : p.meta?.horseId ? byId(s.horses, p.meta.horseId)?.name : ''
            const text = t('summary.waReminder', { contact: family?.contact?.split(' ')[0] || '', what: paymentSentence(t, s, p), amount: fmtMoney(p.amount) })
            return (
              <li key={p.id} className="list__row owed">
                <div className="grow">
                  <p className="list__title">{family?.name}</p>
                  <p className="small muted">{concept(t, p)}{rider ? ` · ${rider}` : ''} · <span className="owed__late">{t('summary.daysLate', { n: days })}</span></p>
                </div>
                <strong className="owed__amount">{fmtMoney(p.amount)}</strong>
                <a className="iconbtn iconbtn--card" href={familyWaLink(family?.phone, text)} target="_blank" rel="noopener noreferrer" aria-label={t('summary.remind', { name: family?.name })}>
                  <Icon name="whatsapp" size={20} />
                </a>
              </li>
            )
          })}
          {owed.length > 5 && (
            <li className="list__row"><button type="button" className="link" onClick={() => setAllOwed(!allOwed)}>{allOwed ? t('summary.showLess') : t('summary.showAll', { n: owed.length })}</button></li>
          )}
        </ul>
      )}

      </section>
      <section className="sumblock">
      <SectionTitle icon="refresh">{t('summary.renewing')}</SectionTitle>
      {renewing.length === 0 ? (
        <p className="muted small">{t('summary.noRenewals')}</p>
      ) : (
        <ul className="list card">
          {renewing.map(({ rider, family, renews }) => (
            <li key={rider.id} className="list__row">
              <span className="grow"><span className="list__title">{rider.name}</span> <span className="small muted">· {family?.name}</span></span>
              <span className="small">{t('plan.classesPlan', { n: rider.planClasses })} · {short(renews)}</span>
            </li>
          ))}
        </ul>
      )}

      </section>
      <section className="sumblock">
      <SectionTitle icon="calendar">{t('summary.occupancy')}</SectionTitle>
      <div className="card row gap">
        <div className="donut" style={{ '--p': occ.pct }}><span>{occ.pct}%</span></div>
        <div className="grow">
          <p className="card__title">{t('admin.reports.seats', { taken: occ.taken, seats: occ.seats })}</p>
          <p className="small muted">{t('summary.thisWeek')}</p>
        </div>
      </div>

      </section>
      {horseDue.length > 0 && (
        <section className="sumblock">
          <SectionTitle icon="horseHead">{t('summary.horsesDue')}</SectionTitle>
          <ul className="list card">
            {horseDue.map((x) => (
              <li key={`${x.horse.id}-${x.kind}`} className="list__row">
                <Link to={`${base}/direccion/caballos/${x.horse.id}`} state={{ from: { to: `${base}/direccion`, label: t('tabs.summary') } }} className="grow"><span className="list__title">{x.horse.name}</span> <span className="small muted">· {t(`horseProfile.kinds.${x.kind}`)}</span></Link>
                <span className={`small ${x.due < todayKey() ? 'owed__late' : ''}`}>{x.due < todayKey() ? t('horseProfile.overdue', { date: short(x.due) }) : short(x.due)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {salaries.length > 0 && (
        <section className="sumblock">
          <SectionTitle icon="users" action={<Link to={`${base}/direccion/nomina`} className="link">{t('summary.open')}</Link>}>{t('summary.salaries')}</SectionTitle>
          <ul className="list card">
            {salaries.map((e) => (
              <li key={e.id} className="list__row">
                <span className="grow"><span className="list__title">{e.name}</span> <span className="small muted">· {short(e.nextPayDate)}</span></span>
                <strong>{fmtMoney(e.salary)}</strong>
              </li>
            ))}
            <li className="list__row small"><span className="grow muted">{t('summary.salariesTotal')}</span><strong>{fmtMoney(salaries.reduce((a, e) => a + e.salary, 0))}</strong></li>
          </ul>
        </section>
      )}
      </div>

      <SectionTitle>{t('summary.more')}</SectionTitle>
      <div className="tiles">
        <Link to={`${base}/direccion/reportes`} className="tilelink"><Icon name="chart" /> {t('tabs.reports')}</Link>
        {moduleOn(s, 'moduleProfit') && <Link to={`${base}/direccion/rentabilidad`} className="tilelink"><Icon name="trophy" /> {t('profit.title')}</Link>}
        {moduleOn(s, 'modulePayroll') && <Link to={`${base}/direccion/nomina`} className="tilelink"><Icon name="users" /> {t('payroll.title')}</Link>}
        <Link to={`${base}/direccion/ajustes`} className="tilelink"><Icon name="plan" /> {t('modules.title')}</Link>
      </div>
    </div>
  )
}
