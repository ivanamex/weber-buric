import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, incomeByService, monthCollected, weekOccupancy, activePlansCount, pendingPayments, LEVELS, SERVICES,
} from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { ResetDemoRow } from '../../components/ResetDemoRow.jsx'
import { exportCsv } from '../../components/Desk.jsx'
import { concept } from '../../components/PaymentHistory.jsx'
import { currentMonthKey, todayKey, TZ } from '../../lib/time.js'

const clubDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))

export default function AdminReports() {
  const { t, fmtMoney, fmtDate } = useI18n()
  const s = useStore()
  const income = incomeByService(s)
  const max = Math.max(...Object.values(income), 1)
  const total = monthCollected(s)
  const occ = weekOccupancy(s)
  const pending = pendingPayments(s).reduce((sum, p) => sum + p.amount, 0)
  const boarded = s.horses.filter((h) => h.type === 'boarded').length
  const monthName = fmtDate(`${currentMonthKey()}-01`, { month: 'long', year: 'numeric' })
  // The month's payments, one row each (opens in Excel).
  const onExport = () => {
    const month = currentMonthKey()
    const rows = s.payments.filter((p) => clubDay(p.paidAt || p.createdAt).startsWith(month))
      .sort((a, b) => (a.paidAt || a.createdAt).localeCompare(b.paidAt || b.createdAt))
    const columns = [
      { label: t('admin.reports.csvDate'), value: (p) => clubDay(p.paidAt || p.createdAt) },
      { label: t('admin.reports.csvFamily'), value: (p) => byId(s.families, p.familyId)?.name || '' },
      { label: t('admin.reports.csvConcept'), value: (p) => [concept(t, p), byId(s.riders, p.meta?.riderId)?.name, byId(s.horses, p.meta?.horseId)?.name].filter(Boolean).join(' · ') },
      { label: t('admin.reports.csvAmount'), value: (p) => p.amount },
      { label: t('admin.reports.csvStatus'), value: (p) => t(`admin.reports.csvState.${p.status}`) },
      { label: t('admin.reports.csvMethod'), value: (p) => (p.method ? t(`methods.${p.method}`) : '') },
    ]
    exportCsv(`reportes-${month}-${todayKey()}.csv`, columns, rows)
  }


  return (
    <div className="page">
      <h1 className="page__title">{t('admin.reports.title')}</h1>
      <p className="daylabel">{monthName}</p>

      <div className="stats stats--3">
        <div className="stat"><strong>{occ.pct}%</strong><span>{t('admin.reports.occupancy')}</span></div>
        <div className="stat"><strong>{activePlansCount(s)}</strong><span>{t('admin.reports.activePlans')}</span></div>
        <div className="stat"><strong>{boarded}</strong><span>{t('admin.reports.boarded')}</span></div>
      </div>

      <SectionTitle icon="trophy">{t('admin.reports.income')}</SectionTitle>
      <div className="card">
        <p className="card__label">{t('admin.reports.totalMonth')}</p>
        <p className="bignum">{fmtMoney(total)}</p>
        <div className="bars">
          {SERVICES.map((k) => (
            <div key={k} className="bar">
              <div className="bar__label"><span>{t(`services.${k}`)}</span><strong>{fmtMoney(income[k])}</strong></div>
              <div className="bar__track"><span className={`bar__fill bar__fill--${k}`} style={{ width: `${(income[k] / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="small muted mt12"><Icon name="clock" size={14} /> {t('admin.reports.pending', { amount: fmtMoney(pending) })}</p>
      </div>

      <SectionTitle>{t('admin.reports.occupancyTitle')}</SectionTitle>
      <div className="card">
        <div className="row between">
          <p className="card__label">{t('admin.reports.week', { from: fmtDate(occ.start, { day: 'numeric', month: 'short' }), to: fmtDate(occ.end, { day: 'numeric', month: 'short' }) })}</p>
          <span className="small muted">{t('admin.reports.seats', { taken: occ.taken, seats: occ.seats })}</span>
        </div>
        <div className="donutrow">
          <div className="donut" style={{ '--p': occ.pct }}><span>{occ.pct}%</span></div>
          <div className="bars grow">
            {LEVELS.map((l) => (
              <div key={l} className="bar">
                <div className="bar__label"><span>{t(`levels.${l}`)}</span><strong>{occ.byLevel[l]}%</strong></div>
                <div className="bar__track"><span className="bar__fill" style={{ width: `${occ.byLevel[l]}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionTitle>{t('more.settings')}</SectionTitle>
      <div className="card list">
        <div className="list__row">
          <span className="grow">{t('admin.reports.export')}</span>
          <button type="button" className="link" onClick={onExport}><Icon name="download" size={15} /> {t('desk.export')}</button>
        </div>
        <ResetDemoRow />
      </div>
      <p className="sample-note">{t('common.samplePrices')}</p>
    </div>
  )
}
