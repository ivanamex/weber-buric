import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'

const W = 330
const H = 132
const PAD = { top: 10, right: 6, bottom: 22, left: 40 }

/** Rounded top (4 px data-end), square at the baseline. */
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}
const niceMax = (v) => {
  if (v <= 0) return 1000
  const p = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / p) * p
}

/** Daily income over the last 30 days: one series, thin columns, a tooltip per day, and a table for screen readers. */
export default function IncomeChart({ daily }) {
  const { t, fmtMoney, fmtDate } = useI18n()
  const [hover, setHover] = useState(null)
  const max = niceMax(Math.max(...daily.map((d) => d.amount)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const band = plotW / daily.length
  const bw = Math.min(24, band - 2) // 2 px gap between columns
  const y = (v) => PAD.top + plotH - (v / max) * plotH
  const day = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  const h = hover != null ? daily[hover] : null

  return (
    <figure className="ichart">
      <div className="ichart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('summary.chartTitle')} onMouseLeave={() => setHover(null)}>
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="ichart__grid" />
              <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" className="ichart__tick">{fmtMoney(v)}</text>
            </g>
          ))}
          {daily.map((d, i) => {
            const x = PAD.left + i * band + (band - bw) / 2
            const bh = (d.amount / max) * plotH
            return (
              <g key={d.day}>
                {d.amount > 0 && <path d={barPath(x, y(d.amount), bw, bh)} className={`ichart__bar ${hover === i ? 'is-hover' : ''}`} />}
                {/* Hit target: the whole column band, taller than the mark. */}
                <rect x={PAD.left + i * band} y={PAD.top} width={band} height={plotH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              </g>
            )
          })}
          <text x={PAD.left} y={H - 6} className="ichart__tick">{day(daily[0].day)}</text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="ichart__tick">{day(daily[daily.length - 1].day)}</text>
        </svg>
        {h && (
          <div className="ichart__tip" style={{ left: `${((PAD.left + (hover + 0.5) * band) / W) * 100}%` }} role="status">
            <span>{day(h.day)}</span><strong>{fmtMoney(h.amount)}</strong>
          </div>
        )}
      </div>
      <table className="visually-hidden">
        <caption>{t('summary.chartTitle')}</caption>
        <thead><tr><th>{t('summary.day')}</th><th>{t('summary.amount')}</th></tr></thead>
        <tbody>{daily.map((d) => <tr key={d.day}><td>{day(d.day)}</td><td>{fmtMoney(d.amount)}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
