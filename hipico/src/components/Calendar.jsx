// Día · Semana · Mes for Clases (families) and Horario (management).
import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Segmented } from './ui.jsx'
import { Icon } from './Icon.jsx'
import { addDays, monthKeyOf, monthEnd, nextMonthKey, todayKey, weekStart, weekdayOf } from '../lib/time.js'

const VIEWS = ['day', 'week', 'month']

/** The view chosen last time on this device (Día by default; a computer can start elsewhere). */
export function useCalView(key, fallback = 'day') {
  const storeKey = `hipico.calview.${key}`
  const [view, setView] = useState(() => {
    try { const v = localStorage.getItem(storeKey); if (VIEWS.includes(v)) return v } catch { /* private mode */ }
    return fallback
  })
  const choose = (v) => {
    setView(v)
    try { localStorage.setItem(storeKey, v) } catch { /* private mode */ }
  }
  return [view, choose]
}

export function ViewToggle({ value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="caltoggle">
      <Segmented small value={value} onChange={onChange} options={VIEWS.map((v) => ({ value: v, label: t(`calendar.${v}`) }))} />
    </div>
  )
}

const prevMonthKey = (m) => monthKeyOf(addDays(`${m}-01`, -1))

/**
 * A month: Monday to Sunday, today highlighted, closed days greyed with their reason.
 * `info(date)` → { closed, note, dots: [{ key, level, mine, color }], disabled }. Tapping a day calls `onPick(date)`.
 */
export function MonthGrid({ month, onMonth, info, onPick, selected }) {
  const { t, fmtDate } = useI18n()
  const today = todayKey()
  const first = `${month}-01`
  const start = weekStart(first)
  const last = monthEnd(month)
  const weeks = Math.ceil((((weekdayOf(first) + 6) % 7) + Number(last.slice(8, 10))) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
  const head = Array.from({ length: 7 }, (_, i) => t(`schedule.dayAbbr.${(i + 1) % 7}`))
  return (
    <section className="mcal" aria-label={fmtDate(first, { month: 'long', year: 'numeric' })}>
      <div className="mcal__bar">
        <button type="button" className="iconbtn iconbtn--card" onClick={() => onMonth(prevMonthKey(month))} aria-label={t('common.prev')}><Icon name="chevronLeft" size={20} /></button>
        <p className="card__title center grow mcal__title">{fmtDate(first, { month: 'long', year: 'numeric' })}</p>
        <button type="button" className="iconbtn iconbtn--card" onClick={() => onMonth(nextMonthKey(month))} aria-label={t('common.next')}><Icon name="chevronRight" size={20} /></button>
      </div>
      <div className="mcal__grid" role="grid">
        {head.map((h) => <span key={h} className="mcal__wd" role="columnheader">{h}</span>)}
        {cells.map((d) => {
          const out = d.slice(0, 7) !== month
          const x = out ? { dots: [] } : info(d)
          const mine = x.dots.filter((o) => o.mine)
          const shown = x.dots.slice(0, 4)
          const label = [fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }),
            x.closed ? `${t('schedule.closedDay')}${x.note ? ` · ${x.note}` : ''}` : t('calendar.classes', { n: x.dots.length }),
            mine.length ? t('calendar.mine', { n: mine.length }) : ''].filter(Boolean).join(' · ')
          return (
            <button key={d} type="button" role="gridcell" disabled={out || x.disabled} aria-label={label} title={x.closed && x.note ? x.note : undefined}
              className={`mcal__day ${out ? 'is-out' : ''} ${d === today ? 'is-today' : ''} ${x.closed ? 'is-closed' : ''} ${d === selected ? 'is-selected' : ''} ${mine.length ? 'has-mine' : ''}`}
              onClick={() => onPick(d)}>
              <span className="mcal__num">{Number(d.slice(8, 10))}</span>
              {!out && x.closed && <span className="mcal__closed">{x.note || t('schedule.closedDay')}</span>}
              {!out && !x.closed && shown.length > 0 && (
                <span className="mcal__dots" aria-hidden="true">
                  {shown.map((o) => <span key={o.key} className={`mcal__dot dot--${o.level} ${o.mine ? 'is-mine' : ''}`} style={o.mine ? { '--rc': o.color } : undefined} />)}
                  {x.dots.length > shown.length && <span className="mcal__more">+{x.dots.length - shown.length}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * A week as columns × hours (3 days at a time on phones, swipe for the rest).
 * `days`: [{ date, closed, note }]; `blocks(date)` → [{ key, time, node }].
 */
export function HourGrid({ days, blocks }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const today = todayKey()
  const byDay = days.map((d) => (d.closed ? [] : blocks(d.date)))
  const hours = byDay.flat().map((b) => Number(b.time.slice(0, 2)))
  const lo = Math.min(9, ...hours)
  const hi = Math.max(18, ...hours)
  const rows = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  return (
    <div className="wscroll">
      <div className="wgrid wgrid--view" role="grid">
        <div className="wgrid__corner" />
        {days.map(({ date, closed, note }) => (
          <div key={date} className={`wgrid__head ${date === today ? 'is-today' : ''} ${closed ? 'is-closed' : ''}`} role="columnheader">
            <span>{t(`schedule.dayAbbr.${weekdayOf(date)}`)}</span> <strong>{fmtDate(date, { day: 'numeric' })}</strong>
            {closed && <small title={note || undefined}>{note || t('schedule.closedDay')}</small>}
          </div>
        ))}
        {rows.map((h) => [
          <div key={`t${h}`} className="wgrid__hour">{fmtTime(`${String(h).padStart(2, '0')}:00`)}</div>,
          ...days.map(({ date, closed }, i) => (
            <div key={`${date}-${h}`} className={`wgrid__cell ${closed ? 'is-closed' : ''} ${date === today ? 'is-today' : ''}`}>
              {byDay[i].filter((b) => Number(b.time.slice(0, 2)) === h).map((b) => <span key={b.key} className="wgrid__slot">{b.node}</span>)}
            </div>
          )),
        ])}
      </div>
    </div>
  )
}
