import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, activeCounts, moneySummary, overdue, renewingSoon, weekOccupancy, upcomingSalaries, moduleOn, healthDueSoon, occurrencesFor, newMessages, refreshData,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Empty, SectionTitle } from '../../components/ui.jsx'
import { concept, paymentSentence } from '../../components/PaymentHistory.jsx'
import { todayKey, addDays, currentMonthKey } from '../../lib/time.js'
import IncomeChart from './IncomeChart.jsx'
import { LevelPill } from '../../components/Colors.jsx'
import { BackToSite } from '../../components/BackToSite.jsx'

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
  const counts = activeCounts(s)
  const money = moneySummary(s)
  const owed = overdue(s)
  const renewing = renewingSoon(s)
  const occ = weekOccupancy(s)
  const salaries = moduleOn(s, 'modulePayroll') ? upcomingSalaries(s, 15) : []
  const horseDue = healthDueSoon(s, 14)
  const pct = money.expected ? Math.round((money.expectedPaid / money.expected) * 100) : 0
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  const todayClasses = occurrencesFor(s, todayKey(), null, { includeClosed: true }).filter((o) => o.bookings.length > 0)
  const today = todayKey()

  return (
    <div className="page">
      <section className="homehead">
        <div>
          <h1 className="page__title">{t('summary.title')}</h1>
          <p className="daylabel daylabel--live">{fmtDate(todayKey())} <Updated at={s.loadedAt} /></p>
        </div>
      <div className="stats stats--4">
        <Stat to={`${base}/direccion/familias?estado=activas`} n={counts.families} label={t('summary.families')} hint={t('summary.counts.families')} />
        <Stat to={`${base}/direccion/familias?vista=jinetes`} n={counts.riders} label={t('summary.riders')} hint={t('summary.counts.riders')} />
        <Stat to={`${base}/direccion/familias?plan=con`} n={counts.plans} label={t('summary.plans')} hint={t('summary.counts.plans')}>
          {counts.plans > 0 && (
            <span className="stat__split">
              {Object.entries(counts.byType).sort((a, b) => a[0] - b[0]).map(([n, c]) => (
                <Link key={n} to={`${base}/direccion/familias?plan=con&clases=${n}`} onClick={(e) => e.stopPropagation()}>{t('summary.planType', { n, c })}</Link>
              ))}
            </span>
          )}
        </Stat>
        <Stat to={`${base}/direccion/horario?vista=caballos&estado=boarded`} n={counts.boarded} label={t('summary.boarded')} hint={t('summary.counts.boarded')} />
      </div>
      </section>

      <div className="sumgrid">
      <section className="sumblock sumblock--money">
      <SectionTitle icon="receipt">{t('summary.money')}</SectionTitle>
      <div className="card c-sage edge-c">
        <div className="money3">
          {[
            { k: 'today', label: t('summary.today'), n: money.today, from: today },
            { k: 'month', label: t('summary.thisMonth'), n: money.month, from: `${currentMonthKey()}-01` },
            { k: 'last30', label: t('summary.last30'), n: money.last30, from: addDays(today, -29) },
          ].map((m) => (
            <Link key={m.k} to={`${base}/direccion/cobros?estado=pagados&desde=${m.from}&hasta=${today}`} title={t('summary.see')}>
              <span className="small muted">{m.label}</span><strong>{fmtMoney(m.n)}</strong><small>{t(`summary.moneyHint.${m.k}`)}</small>
              <span className="stat__go">{t('summary.see')} <Icon name="arrowRight" size={12} /></span>
            </Link>
          ))}
        </div>
        <Link to={`${base}/direccion/cobros?estado=pendientes`} className="expected expected__link mt12" title={t('summary.see')}>
          <div className="row between small"><span>{t('summary.expected')}</span><span><strong>{fmtMoney(money.expectedPaid)}</strong> / {fmtMoney(money.expected)} · {pct}%</span></div>
          <div className="expected__track"><span style={{ width: `${pct}%` }} /></div>
        </Link>
        <p className="card__label mt16">{t('summary.chartTitle')}</p>
        <IncomeChart daily={money.daily} />
      </div>

      </section>
      <section className="sumblock sumblock--today">
        <SectionTitle icon="helmet" action={<Link to={`${base}/direccion/hoy`} className="link">{t('summary.open')}</Link>}>{t('tabs.today')}</SectionTitle>
        {todayClasses.length === 0 ? (
          <div className="card"><Empty icon="helmet" title={t('summary.emptyToday')}><Link to={`${base}/direccion/hoy`} className="link">{t('summary.open')}</Link></Empty></div>
        ) : (
          <ul className="list card c-slate edge-c">
            {todayClasses.slice(0, 5).map((o) => (
              <li key={o.slot.id} className="list__row">
                <strong className="sumtime">{fmtTime(o.slot.time)}</strong>
                <span className="grow"><span className="list__title">{t(`disciplines.${o.slot.discipline}`)}</span> <LevelPill level={o.slot.level} /></span>
                <span className="small">{t('summary.ridersN', { n: o.bookings.length, cap: o.slot.capacity })}</span>
              </li>
            ))}
            {todayClasses.length > 5 && <li className="list__row list__more"><Link to={`${base}/direccion/hoy`} className="link">{t('summary.seeToday', { n: todayClasses.length })}</Link></li>}
          </ul>
        )}
      </section>
      <section className="sumblock">
      <SectionTitle icon="alert">{t('summary.owes', { n: owed.length })}</SectionTitle>
      {owed.length === 0 ? (
        <div className="card"><Empty icon="receipt" title={t('summary.nobodyOwes')}><Link to={`${base}/direccion/cobros`} className="link">{t('summary.seeCollect')}</Link></Empty></div>
      ) : (
        <ul className="list card c-terracotta edge-c">
          {owed.slice(0, 5).map(({ payment: p, days, family }) => {
            const rider = p.meta?.riderId ? byId(s.riders, p.meta.riderId)?.name : p.meta?.horseId ? byId(s.horses, p.meta.horseId)?.name : ''
            const text = t(p.meta?.payAtClub ? 'summary.waReminderClub' : 'summary.waReminder', { contact: family?.contact?.split(' ')[0] || '', what: paymentSentence(t, s, p), amount: fmtMoney(p.amount) })
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
            <li className="list__row list__more"><Link to={`${base}/direccion/cobros?estado=pendientes`} className="link">{t('summary.viewAll', { n: owed.length })}</Link></li>
          )}
        </ul>
      )}

      </section>
      <section className="sumblock">
      <SectionTitle icon="refresh">{t('summary.renewing')}</SectionTitle>
      {renewing.length === 0 ? (
        <div className="card"><Empty icon="refresh" title={t('summary.noRenewals')}><Link to={`${base}/direccion/familias?plan=con`} className="link">{t('summary.seePlans')}</Link></Empty></div>
      ) : (
        <ul className="list card c-sage edge-c">
          {renewing.slice(0, 5).map(({ rider, family, renews }) => (
            <li key={rider.id} className="list__row">
              <span className="grow"><span className="list__title">{rider.name}</span> <span className="small muted">· {family?.name}</span></span>
              <span className="small">{t('plan.classesPlan', { n: rider.planClasses })} · {short(renews)}</span>
            </li>
          ))}
          {renewing.length > 5 && <li className="list__row list__more"><Link to={`${base}/direccion/familias?plan=con`} className="link">{t('summary.viewAll', { n: renewing.length })}</Link></li>}
        </ul>
      )}

      </section>
      <section className="sumblock">
      <SectionTitle icon="calendar">{t('summary.occupancy')}</SectionTitle>
      <div className={`card occcard edge-c ${occ.pct > 80 ? 'c-mustard' : occ.pct >= 40 ? 'c-sage' : 'c-slate'}`}>
        <div className="occcard__row">
          <div className={`donut donut--${occ.pct > 80 ? 'mustard' : occ.pct >= 40 ? 'sage' : 'slate'}`} style={{ '--p': occ.pct }}><span>{occ.pct}%</span></div>
          <div className="grow">
            <p className="card__title occcard__seats">{t('summary.seats', { taken: occ.taken, seats: occ.seats })}</p>
            <p className="small muted">{t('summary.thisWeek')}</p>
          </div>
        </div>
        {occ.levels.length > 0 && (
          <div className="occcard__levels">
            <p className="card__label">{t('summary.byLevel')}</p>
            {occ.levels.map((l) => (
              <div key={l.level} className="occlevel">
                <span className="occlevel__name">{t(`levels.${l.level}`)}</span>
                <span className="occlevel__track" aria-hidden="true"><span style={{ width: `${l.pct}%` }} /></span>
                <span className="occlevel__n">{t('summary.seats', { taken: l.taken, seats: l.seats })}</span>
              </div>
            ))}
          </div>
        )}
        <Link to={`${base}/direccion/horario`} className="link card__foot">{t('summary.seeSchedule')}</Link>
      </div>

      </section>
      <section className="sumblock">
        <SectionTitle icon="horseHead">{t('summary.horsesDue')}</SectionTitle>
        {horseDue.length === 0 ? (
          <div className="card"><Empty icon="horseHead" title={t('summary.emptyHorses')}><Link to={`${base}/direccion/horario?vista=caballos`} className="link">{t('summary.seeHorses')}</Link></Empty></div>
        ) : (
          <ul className="list card c-plum edge-c">
            {horseDue.slice(0, 5).map((x) => (
              <li key={`${x.horse.id}-${x.kind}`} className="list__row">
                <Link to={`${base}/direccion/caballos/${x.horse.id}`} state={{ from: { to: `${base}/direccion`, label: t('tabs.summary') } }} className="grow"><span className="list__title">{x.horse.name}</span> <span className="small muted">· {t(`horseProfile.kinds.${x.kind}`)}</span></Link>
                <span className={`small ${x.due < todayKey() ? 'owed__late' : ''}`}>{x.due < todayKey() ? t('horseProfile.overdue', { date: short(x.due) }) : short(x.due)}</span>
              </li>
            ))}
            {horseDue.length > 5 && <li className="list__row list__more"><Link to={`${base}/direccion/horario?vista=caballos&salud=pendientes`} className="link">{t('summary.viewAll', { n: horseDue.length })}</Link></li>}
          </ul>
        )}
      </section>

      {moduleOn(s, 'modulePayroll') && (
        <section className="sumblock">
          <SectionTitle icon="users" action={<Link to={`${base}/direccion/nomina`} className="link">{t('summary.open')}</Link>}>{t('summary.salaries')}</SectionTitle>
          {salaries.length === 0 ? (
            <div className="card"><Empty icon="users" title={t('summary.emptySalaries')}><Link to={`${base}/direccion/nomina`} className="link">{t('summary.seePayroll')}</Link></Empty></div>
          ) : (
            <ul className="list card c-mustard edge-c">
              {salaries.slice(0, 5).map((e) => (
                <li key={e.id} className="list__row">
                  <span className="grow"><span className="list__title">{e.name}</span> <span className="small muted">· {short(e.nextPayDate)}</span></span>
                  <strong>{fmtMoney(e.salary)}</strong>
                </li>
              ))}
              {salaries.length > 5 && <li className="list__row list__more"><Link to={`${base}/direccion/nomina`} className="link">{t('summary.viewAll', { n: salaries.length })}</Link></li>}
              <li className="list__row small"><span className="grow muted">{t('summary.salariesTotal')}</span><strong>{fmtMoney(salaries.reduce((a, e) => a + e.salary, 0))}</strong></li>
            </ul>
          )}
        </section>
      )}
      </div>

      <SectionTitle>{t('summary.more')}</SectionTitle>
      <nav className="ctiles ctiles--5" aria-label={t('summary.more')}>
        {[
          { to: 'mensajes', color: 'terracotta', icon: 'mail', title: t('messages.title'), count: newMessages(s), text: newMessages(s) ? t('messages.newCount', { n: newMessages(s) }) : t('summary.tiles.messages') },
          { to: 'reportes', color: 'slate', icon: 'chart', title: t('tabs.reports'), text: t('summary.tiles.reports') },
          moduleOn(s, 'moduleProfit') && { to: 'rentabilidad', color: 'mustard', icon: 'trophy', title: t('profit.title'), text: t('summary.tiles.profit') },
          moduleOn(s, 'modulePayroll') && { to: 'nomina', color: 'plum', icon: 'users', title: t('payroll.title'), text: t('summary.tiles.payroll') },
          { to: 'ajustes', color: 'sage', icon: 'plan', title: t('modules.title'), text: t('summary.tiles.settings') },
        ].filter(Boolean).map((x) => (
          <Link key={x.to} to={`${base}/direccion/${x.to}`} className={`ctile c-${x.color}`}>
            <span className="ctile__icon"><Icon name={x.icon} size={22} /></span>
            {x.count > 0 && <span className="ctile__count">{x.count}</span>}
            <span className="ctile__title">{x.title}</span>
            <span className="ctile__text">{x.text}</span>
          </Link>
        ))}
      </nav>
      <BackToSite className="link backsite backsite--phone" />
    </div>
  )
}

/** A header tile that opens its source, already filtered: the number, what it counts, and "Ver →" on hover. */
function Stat({ to, n, label, hint, children }) {
  const { t } = useI18n()
  return (
    <Link to={to} className="stat stat--link" title={t('summary.see')}>
      <strong>{n}</strong><span>{label}</span><small>{hint}</small>{children}
      <span className="stat__go">{t('summary.see')} <Icon name="arrowRight" size={12} /></span>
    </Link>
  )
}

/** "Actualizado hace 1 min" with a refresh icon, so the numbers read as live. */
function Updated({ at }) {
  const { t } = useI18n()
  const [, tick] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(id) }, [])
  const mins = at ? Math.floor((Date.now() - at) / 60000) : 0
  const reload = async () => { setBusy(true); await refreshData(); setBusy(false) }
  return (
    <>
      <span className="daylabel__updated">· {mins < 1 ? t('summary.updatedNow') : t('summary.updatedAgo', { n: mins })}</span>
      <button type="button" className={`daylabel__refresh ${busy ? 'is-busy' : ''}`} onClick={reload} aria-label={t('summary.refresh')} title={t('summary.refresh')}><Icon name="refresh" size={14} /></button>
    </>
  )
}
