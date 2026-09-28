import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { DateInput } from '../../components/DateInput.jsx'
import {
  useStore, byId, isActiveBooking, LEVELS, cancelClassDate, reopenClassDate, createClasses, editClass, cancelClassRange, copyWeek,
  slotsOn, isClosed, closedDateOn, closedWeekdays, isOneOff,
} from '../../data/store.js'
import { useBase } from '../Backend.jsx'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Segmented } from '../../components/ui.jsx'
import { ConfirmDialog, SaveBar, Sheet, useFormState } from '../../components/EditKit.jsx'
import { useToast } from '../../components/Toast.jsx'
import { todayKey, addDays, weekStart, daysBetween } from '../../lib/time.js'
import { useSave } from './useSave.js'
import { useDeskAction, useDesktop } from '../../components/Desk.jsx'

const DISCIPLINES = ['basics', 'dressage', 'jumping', 'ponies']
const ARENAS = ['main', 'covered', 'jumping']
const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday … Sunday

function useWide(query = '(min-width: 900px)') {
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return undefined
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return wide
}

const listJoin = (t, xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${t('schedule.and')} ${xs[xs.length - 1]}`)

/** "mar–dom", "lun, mié y vie": three or more days in a row become a range. */
function daysLabel(t, days) {
  const runs = []
  let run = []
  for (const d of WEEK) {
    if (days.includes(d)) run.push(d)
    else if (run.length) { runs.push(run); run = [] }
  }
  if (run.length) runs.push(run)
  const abbr = (d) => t(`schedule.dayAbbr.${d}`)
  return listJoin(t, runs.flatMap((r) => (r.length >= 3 ? [`${abbr(r[0])}–${abbr(r[r.length - 1])}`] : r.map(abbr))))
}

/** Bookings that would be touched on a date for a class. */
const bookedOn = (s, slotId, date) => s.bookings.filter((b) => b.slotId === slotId && b.date === date && b.status === 'booked').length
const cancelledOn = (s, slotId, date) => (s.cancellations || []).find((c) => c.slotId === slotId && c.date === date && !c.replacedBy) || null

function ClassFields({ f, set, idPrefix, withTime = false }) {
  const { t } = useI18n()
  const s = useStore()
  const instructors = s.instructors.filter((i) => i.active !== false || i.id === f.instructorId)
  return (
    <>
      <div className={withTime ? 'grid3' : 'grid2'}>
        {withTime && (
          <label className="field" htmlFor={`${idPrefix}-time`}><span>{t('schedule.time')}</span>
            <input id={`${idPrefix}-time`} className="input" type="time" step="900" value={f.time} onChange={(e) => set({ time: e.target.value })} required />
          </label>
        )}
        <label className="field" htmlFor={`${idPrefix}-dur`}><span>{t('schedule.duration')}</span>
          <input id={`${idPrefix}-dur`} className="input" type="number" min="15" max="240" step="15" inputMode="numeric" value={f.duration} onChange={(e) => set({ duration: e.target.value })} required />
        </label>
        <label className="field" htmlFor={`${idPrefix}-cap`}><span>{t('schedule.capacity')}</span>
          <input id={`${idPrefix}-cap`} className="input" type="number" min="1" max="30" inputMode="numeric" value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} required />
        </label>
      </div>
      <div className="grid2">
        <label className="field" htmlFor={`${idPrefix}-disc`}><span>{t('schedule.discipline')}</span>
          <select id={`${idPrefix}-disc`} className="input" value={f.discipline} onChange={(e) => set({ discipline: e.target.value })}>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{t(`disciplines.${d}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-level`}><span>{t('admin.families.level')}</span>
          <select id={`${idPrefix}-level`} className="input" value={f.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-inst`}><span>{t('schedule.instructor')}</span>
          <select id={`${idPrefix}-inst`} className="input" value={f.instructorId || ''} onChange={(e) => set({ instructorId: e.target.value })} required>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-arena`}><span>{t('schedule.arena')}</span>
          <select id={`${idPrefix}-arena`} className="input" value={f.arena} onChange={(e) => set({ arena: e.target.value })}>
            {ARENAS.map((a) => <option key={a} value={a}>{t(`arenas.${a}`)}</option>)}
          </select>
        </label>
      </div>
    </>
  )
}

/** "+ Nueva clase": several days and times in one go, valid from a date (and until one, or with no end). */
function BulkForm({ preset, onDone }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  const [run, busy, error] = useSave()
  const closed = closedWeekdays(s)
  const open = WEEK.filter((d) => !closed.includes(d))
  const [f, setF, dirty] = useFormState(() => ({
    weekdays: preset?.weekday != null && !closed.includes(preset.weekday) ? [preset.weekday] : [],
    times: [preset?.time || '16:00'], duration: preset?.duration || 60, discipline: 'basics', level: 'beginner',
    instructorId: s.instructors.find((i) => i.active !== false)?.id || '', arena: 'main', capacity: 4,
    startsOn: preset?.date && preset.date > todayKey() ? preset.date : todayKey(), endsOn: '', noEnd: true,
  }))
  const [newTime, setNewTime] = useState('')
  const set = (patch) => setF({ ...f, ...patch })
  const toggleDay = (d) => set({ weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] })
  const addTime = () => {
    if (!/^[0-2]\d:[0-5]\d$/.test(newTime) || f.times.includes(newTime)) return
    set({ times: [...f.times, newTime].sort() })
    setNewTime('')
  }
  const n = f.weekdays.length * f.times.length
  const preview = n === 0 ? t('schedule.previewNone')
    : t(n === 1 ? 'schedule.previewOne' : 'schedule.preview', { n, days: daysLabel(t, f.weekdays), times: listJoin(t, f.times.map(fmtTime)) })
      + (!f.noEnd && f.endsOn ? t('schedule.previewUntil', { date: fmtDate(f.endsOn, { day: 'numeric', month: 'short' }) }) : '')
  const onSubmit = (e) => {
    e.preventDefault()
    if (n === 0) return
    run(() => createClasses({ ...f, endsOn: f.noEnd ? null : f.endsOn }), null, (res) => onDone(res.count), { inline: true })
  }
  return (
    <form className="inline-form bulkform" onSubmit={onSubmit}>
      <div className="field"><span>{t('schedule.days')}</span>
        <div className="daychips" role="group" aria-label={t('schedule.days')}>
          {WEEK.map((d) => {
            const off = closed.includes(d)
            return (
              <button key={d} type="button" className={`daychip ${f.weekdays.includes(d) ? 'is-active' : ''}`} disabled={off} aria-pressed={f.weekdays.includes(d)}
                title={off ? t('schedule.closedDay') : t(`schedule.weekdays.${d}`)} aria-label={t(`schedule.weekdays.${d}`)} onClick={() => toggleDay(d)}>
                {t(`schedule.dayShort.${d}`)}
              </button>
            )
          })}
        </div>
        <div className="row gap-sm wrap">
          <button type="button" className="link" onClick={() => set({ weekdays: open })}>{t('schedule.allDays')}</button>
          <button type="button" className="link" onClick={() => set({ weekdays: open.filter((d) => d >= 1 && d <= 5) })}>{t('schedule.weekdaysOnly')}</button>
        </div>
      </div>
      <div className="field"><span>{t('schedule.times')}</span>
        <div className="row gap-sm wrap">
          {f.times.map((x) => (
            <span key={x} className="timechip">{fmtTime(x)}
              {f.times.length > 1 && <button type="button" aria-label={t('schedule.removeTime', { time: fmtTime(x) })} onClick={() => set({ times: f.times.filter((y) => y !== x) })}><Icon name="x" size={14} /></button>}
            </span>
          ))}
        </div>
        <div className="row gap-sm">
          <input className="input grow" type="time" step="900" aria-label={t('schedule.addTime')} value={newTime}
            onChange={(e) => setNewTime(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTime() } }} />
          <button type="button" className="btn btn--sm" disabled={!newTime} onClick={addTime}><Icon name="plus" size={16} /> {t('schedule.addTime')}</button>
        </div>
      </div>
      <ClassFields f={f} set={set} idPrefix="bulk" />
      <div className="grid2">
        <label className="field" htmlFor="bulk-from"><span>{t('schedule.from')}</span>
          <DateInput id="bulk-from" min={todayKey()} required value={f.startsOn} onChange={(e) => set({ startsOn: e.target.value })} />
        </label>
        <label className="field" htmlFor="bulk-until"><span>{t('schedule.until')}</span>
          {f.noEnd
            ? <input id="bulk-until" className="input" value={t('schedule.noEnd')} readOnly onFocus={() => set({ noEnd: false, endsOn: addDays(f.startsOn, 90) })} />
            : <DateInput id="bulk-until" min={f.startsOn} required value={f.endsOn} onChange={(e) => set({ endsOn: e.target.value })} />}
        </label>
      </div>
      <label className="check"><input type="checkbox" checked={f.noEnd} onChange={(e) => set({ noEnd: e.target.checked, endsOn: e.target.checked ? '' : addDays(f.startsOn, 90) })} /> <span>{t('schedule.noEnd')}</span></label>
      <p className={`bulkform__preview ${n ? '' : 'is-empty'}`} aria-live="polite"><Icon name="calendar" size={18} /> {preview}</p>
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={() => onDone(null)} disabled={n === 0} />
    </form>
  )
}

/** "Solo esta clase" / "Esta y las siguientes" / "Toda la serie", like a phone calendar. */
function ScopeSheet({ date, onPick, onClose }) {
  const { t, fmtDate } = useI18n()
  const day = fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
  const options = [
    ['one', t('schedule.scopeOne'), t('schedule.scopeOneHint', { date: day })],
    ['following', t('schedule.scopeFollowing'), t('schedule.scopeFollowingHint', { date: day })],
    ['all', t('schedule.scopeAll'), t('schedule.scopeAllHint')],
  ]
  return (
    <Sheet title={t('schedule.scopeTitle')} onClose={onClose}>
      <div className="scopes">
        {options.map(([key, label, hint]) => (
          <button key={key} type="button" className="scope" onClick={() => onPick(key)}>
            <strong>{label}</strong><span>{hint}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function EditClassForm({ slot, date, scope, onDone }) {
  const { t, fmtDate } = useI18n()
  const toast = useToast()
  const [run, busy, error] = useSave()
  const [ending, setEnding] = useState(false)
  const pick = ({ time, duration, discipline, level, instructorId, arena, capacity, active }) => ({ time, duration, discipline, level, instructorId, arena, capacity, active: active !== false })
  const [f, setF, dirty] = useFormState(() => pick(slot))
  const set = (patch) => setF({ ...f, ...patch })
  const day = fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
  const note = scope === 'one' ? t('schedule.editingOne', { date: day }) : scope === 'following' ? t('schedule.editingFollowing', { date: day }) : t('schedule.editingAll')
  const onSubmit = (e) => {
    e.preventDefault()
    run(() => editClass({ slotId: slot.id, date, scope, fields: { ...f, duration: Number(f.duration), capacity: Number(f.capacity) } }), t('schedule.classSaved'), onDone, { inline: true })
  }
  const onEnd = async () => {
    setEnding(false)
    const res = await editClass({ slotId: slot.id, date, scope: 'following', fields: { end: true } })
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('schedule.ended', { date: day }))
    onDone()
  }
  return (
    <form className="card slot-form" onSubmit={onSubmit}>
      <p className="small scopenote"><Icon name="calendar" size={15} /> {note}</p>
      <ClassFields f={f} set={set} idPrefix={`ef-${slot.id}`} withTime />
      <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} /> <span>{t('schedule.activeClass')}</span></label>
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onDone} />
      {scope === 'following' && <button type="button" className="link link--danger mt8" onClick={() => setEnding(true)}>{t('schedule.endSeries')}</button>}
      {ending && <ConfirmDialog title={t('schedule.endTitle', { date: day })} text={t('schedule.endText')} confirmLabel={t('schedule.endConfirm')} cancelLabel={t('common.cancel')} onConfirm={onEnd} onCancel={() => setEnding(false)} />}
    </form>
  )
}

/** One class on one date: details, Editar (asks one / following / all), cancel or reopen the date. */
function ClassItem({ slot, date }) {
  const { t, fmtTime, fmtDate } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const [mode, setMode] = useState(null) // 'scope' | 'cancel' | { scope }
  const [reason, setReason] = useState('')
  const booked = s.bookings.filter((b) => b.slotId === slot.id && b.date === date && isActiveBooking(b)).length
  const taken = Math.max(booked, s.slotCounts?.[`${slot.id}|${date}`] ?? 0)
  const cancellation = cancelledOn(s, slot.id, date)
  const upcoming = date >= todayKey()
  const off = slot.active === false
  const oneOff = isOneOff(slot)
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })

  if (mode?.scope) return <li className="sched-edit"><EditClassForm slot={slot} date={date} scope={mode.scope} onDone={() => setMode(null)} /></li>
  // A one-off class, or a date already gone, can only change as a whole.
  const edit = () => (oneOff || !upcoming ? setMode({ scope: 'all' }) : setMode('scope'))
  return (
    <li className={`sched-row ${off ? 'is-off' : ''} ${cancellation ? 'is-cancelled' : ''}`}>
      <div className="sched-row__time"><strong>{fmtTime(slot.time)}</strong><span>{slot.duration} min</span></div>
      <div className="grow">
        <p className="list__title">{t(`disciplines.${slot.discipline}`)} <Badge tone="neutral">{t(`levels.${slot.level}`)}</Badge></p>
        <p className="small muted">{byId(s.instructors, slot.instructorId)?.name} · {t(`arenas.${slot.arena}`)}
          {oneOff ? ` · ${t('schedule.oneOff')}` : slot.endsOn ? ` · ${t('schedule.untilDate', { date: short(slot.endsOn) })}` : ''}</p>
        <p className="small">
          {off ? <Badge tone="neutral">{t('schedule.off')}</Badge>
            : cancellation ? <Badge tone="alert">{t('schedule.cancelledBadge')}{cancellation.reason ? ` · ${cancellation.reason}` : ''}</Badge>
              : <span className="muted">{t('schedule.booked', { n: taken, cap: slot.capacity })}</span>}
        </p>
        {mode === 'cancel' && (
          <div className="danger-zone">
            <label className="field" htmlFor={`cx-${slot.id}-${date}`}><span>{t('schedule.cancelReason')}</span>
              <input id={`cx-${slot.id}-${date}`} className="input" maxLength={120} placeholder={t('schedule.cancelPh')} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <p className="small">{t('schedule.cancelHint', { n: booked })}</p>
            <div className="row gap-sm end">
              <button type="button" className="link" onClick={() => setMode(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn btn--sm btn--dangerSolid" disabled={busy}
                onClick={() => run(() => cancelClassDate(slot.id, date, reason), t('schedule.cancelDone'), () => setMode(null))}>{t('schedule.cancelDate')}</button>
            </div>
          </div>
        )}
      </div>
      {mode !== 'cancel' && (
        <div className="sched-row__actions">
          <button type="button" className="link" onClick={edit}>{t('more.profile.edit')}</button>
          {upcoming && !off && (cancellation
            ? <button type="button" className="link" disabled={busy} onClick={() => run(() => reopenClassDate(slot.id, date), t('schedule.reopened'))}>{t('schedule.reopen')}</button>
            : <button type="button" className="link link--danger" onClick={() => setMode('cancel')}>{t('schedule.cancelShort')}</button>)}
        </div>
      )}
      {mode === 'scope' && <ScopeSheet date={date} onClose={() => setMode(null)} onPick={(scope) => setMode({ scope })} />}
    </li>
  )
}

function DateRange({ from, to, onChange, idPrefix, min }) {
  const { t } = useI18n()
  return (
    <div className="grid2">
      <label className="field" htmlFor={`${idPrefix}-from`}><span>{t('schedule.from')}</span>
        <DateInput id={`${idPrefix}-from`} min={min} required value={from} onChange={(e) => onChange({ from: e.target.value, to: e.target.value > to ? e.target.value : to })} />
      </label>
      <label className="field" htmlFor={`${idPrefix}-to`}><span>{t('schedule.until')}</span>
        <DateInput id={`${idPrefix}-to`} min={from} required value={to} onChange={(e) => onChange({ from, to: e.target.value })} />
      </label>
    </div>
  )
}

/** Cancel every class between two dates (vacations, events): families get the class back and see the notice. */
function CancelRangeSheet({ start, onClose }) {
  const { t } = useI18n()
  const s = useStore()
  const toast = useToast()
  const today = todayKey()
  const first = start > today ? start : today
  const [range, setRange] = useState({ from: first, to: first })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  let classes = 0
  let bookings = 0
  if (range.from && range.to && range.to >= range.from && daysBetween(range.from, range.to) <= 366) {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
      if (isClosed(s, d)) continue
      for (const sl of slotsOn(s, d).filter((x) => !cancelledOn(s, x.id, d))) { classes++; bookings += bookedOn(s, sl.id, d) }
    }
  }
  const onConfirm = async () => {
    setBusy(true)
    const res = await cancelClassRange({ ...range, reason })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('schedule.cancelRangeDone', { n: res.classes ?? classes }))
    onClose()
  }
  return (
    <Sheet title={t('schedule.cancelRangeTitle')} onClose={onClose}>
      <DateRange idPrefix="cr" min={today} from={range.from} to={range.to} onChange={setRange} />
      <label className="field" htmlFor="cr-reason"><span>{t('schedule.cancelReason')}</span>
        <input id="cr-reason" className="input" maxLength={120} placeholder={t('schedule.cancelPh')} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <p className="small" aria-live="polite">{classes ? t('schedule.cancelRangePreview', { n: classes, m: bookings }) : t('schedule.cancelRangeNone')}</p>
      <button type="button" className="btn btn--dangerSolid btn--block btn--lg" disabled={busy || !classes} onClick={onConfirm}>
        {busy ? t('edit.saving') : t('schedule.cancelRangeBtn', { n: classes })}
      </button>
    </Sheet>
  )
}

/** Copy the classes of the week on screen to the next week or to a date range (classes already there are skipped). */
function CopyWeekSheet({ start, onClose }) {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const [mode, setMode] = useState('next')
  const [range, setRange] = useState({ from: addDays(start, 7), to: addDays(start, 13) })
  const [busy, setBusy] = useState(false)
  const target = mode === 'next' ? { from: addDays(start, 7), to: addDays(start, 13) } : range
  const source = WEEK.flatMap((_, i) => slotsOn(s, addDays(start, i)))
  const valid = target.from && target.to && target.to >= target.from
  const skipped = valid ? source.filter((sl) => s.slots.some((x) => x.active !== false && x.weekday === sl.weekday && x.time === sl.time && x.arena === sl.arena &&
    (x.startsOn || '0000-00-00') <= target.to && (x.endsOn || '9999-12-31') >= target.from)).length : 0
  const n = valid ? source.length - skipped : 0
  const short = (d) => fmtDate(d, { day: 'numeric', month: 'short' })
  const onConfirm = async () => {
    setBusy(true)
    const res = await copyWeek({ week: start, ...target })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('schedule.copied', { n: res.created ?? n }))
    onClose()
  }
  return (
    <Sheet title={t('schedule.copyTitle', { from: short(start), to: short(addDays(start, 6)) })} onClose={onClose}>
      <Segmented small value={mode} onChange={setMode} options={[{ value: 'next', label: t('schedule.copyNext') }, { value: 'range', label: t('schedule.copyRange') }]} />
      {mode === 'range' && <DateRange idPrefix="cw" min={todayKey()} from={range.from} to={range.to} onChange={setRange} />}
      <p className="small" aria-live="polite">
        {n ? t('schedule.copyPreview', { n }) : t('schedule.copyNone')}
        {n > 0 && skipped > 0 ? ` ${t('schedule.copySkipped', { k: skipped })}` : ''}
      </p>
      <button type="button" className="btn btn--save btn--block btn--lg" disabled={busy || !n} onClick={onConfirm}>
        {busy ? t('edit.saving') : t('schedule.copyBtn', { n })}
      </button>
    </Sheet>
  )
}

function ClosedNote({ date }) {
  const { t } = useI18n()
  const s = useStore()
  const base = useBase()
  const note = closedDateOn(s, date)?.note
  return (
    <div className="closednote">
      <Icon name="sun" size={20} />
      <div className="grow">
        <p className="list__title">{t('schedule.closedTitle')}</p>
        {note && <p className="small muted">{note}</p>}
      </div>
      <Link to={`${base}/direccion/ajustes`} className="link small">{t('schedule.closedDays')}</Link>
    </div>
  )
}

/** Desktop: days × hours. An empty cell starts "+ Nueva clase" on that day and time. */
function WeekGrid({ days, onOpen, onAdd }) {
  const { t, fmtDate, fmtTime } = useI18n()
  const s = useStore()
  const byDay = days.map(({ date }) => slotsOn(s, date, { includeOff: true }))
  const hours = byDay.flat().map((sl) => Number(sl.time.slice(0, 2)))
  const lo = Math.min(8, ...hours)
  const hi = Math.max(18, ...hours)
  const rows = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  const today = todayKey()
  // Drag down a day's empty hours to create a class that long (one click = one hour).
  const [drag, setDrag] = useState(null) // { date, wd, from, to }
  useEffect(() => {
    if (!drag) return undefined
    const up = () => {
      const start = Math.min(drag.from, drag.to)
      const hoursLong = Math.abs(drag.to - drag.from) + 1
      setDrag(null)
      onAdd(drag.wd, `${String(start).padStart(2, '0')}:00`, drag.date, Math.min(hoursLong * 60, 240))
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [drag, onAdd])
  const inDrag = (date, h) => drag && drag.date === date && h >= Math.min(drag.from, drag.to) && h <= Math.max(drag.from, drag.to)
  return (
    <div className={`wgrid ${drag ? 'is-dragging' : ''}`} role="grid">
      <div className="wgrid__corner" />
      {days.map(({ wd, date }) => (
        <div key={date} className={`wgrid__head ${date === today ? 'is-today' : ''} ${isClosed(s, date) ? 'is-closed' : ''}`} role="columnheader">
          <span>{t(`schedule.dayAbbr.${wd}`)}</span> <strong>{fmtDate(date, { day: 'numeric' })}</strong>
          {isClosed(s, date) && <small>{t('schedule.closedDay')}</small>}
        </div>
      ))}
      {rows.map((h) => {
        const hh = `${String(h).padStart(2, '0')}:00`
        return [
          <div key={`t${h}`} className="wgrid__hour">{fmtTime(hh)}</div>,
          ...days.map(({ wd, date }, i) => {
            const closed = isClosed(s, date)
            const here = byDay[i].filter((sl) => Number(sl.time.slice(0, 2)) === h)
            return (
              <div key={`${date}-${h}`} className={`wgrid__cell ${closed ? 'is-closed' : ''} ${inDrag(date, h) ? 'is-drag' : ''}`}>
                {here.map((sl) => {
                  const cx = cancelledOn(s, sl.id, date)
                  const taken = Math.max(s.bookings.filter((b) => b.slotId === sl.id && b.date === date && isActiveBooking(b)).length, s.slotCounts?.[`${sl.id}|${date}`] ?? 0)
                  return (
                    <button key={sl.id} type="button" className={`wgrid__class level--${sl.level} ${cx ? 'is-cancelled' : ''} ${sl.active === false ? 'is-off' : ''}`} onClick={() => onOpen(sl, date)}>
                      <strong>{fmtTime(sl.time)}</strong> {t(`disciplines.${sl.discipline}`)}
                      <span>{cx ? t('schedule.cancelledShort') : `${taken}/${sl.capacity}`}</span>
                    </button>
                  )
                })}
                {!closed && here.length === 0 && date >= today && (
                  <button type="button" className="wgrid__add" aria-label={t('schedule.addAt', { day: fmtDate(date, { weekday: 'long', day: 'numeric' }), time: fmtTime(hh) })}
                    title={t('schedule.dragHint')}
                    onMouseDown={(e) => { if (e.button === 0) { e.preventDefault(); setDrag({ date, wd, from: h, to: h }) } }}
                    onMouseEnter={() => { if (drag && drag.date === date) setDrag({ ...drag, to: h }) }}
                    onClick={(e) => { if (e.detail === 0) onAdd(wd, hh, date) }}>
                    <Icon name="plus" size={14} />
                  </button>
                )}
              </div>
            )
          }),
        ]
      })}
    </div>
  )
}

export default function ClassesView() {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const wide = useWide()
  const desk = useDesktop()
  const today = todayKey()
  const [week, setWeek] = useState(0)
  const [day, setDay] = useState(today)
  const [adding, setAdding] = useState(null) // { weekday, time, date } while the form is open
  const [sheet, setSheet] = useState(null) // 'cancel' | 'copy' | { slot, date }
  const start = addDays(weekStart(today), week * 7)
  const days = WEEK.map((wd, i) => ({ wd, date: addDays(start, i) }))
  const goWeek = (w) => { setWeek(w); setDay(w === 0 ? today : addDays(weekStart(today), w * 7)) }
  const selected = days.find((d) => d.date === day) || days[0]
  const daySlots = slotsOn(s, selected.date, { includeOff: true })
  const openForm = (preset) => { setAdding(preset); if (!window.matchMedia?.('(min-width: 1024px)').matches) window.scrollTo?.({ top: 0, behavior: 'smooth' }) }
  const addAt = useCallback((weekday, time, date, duration) => openForm({ weekday, time, date, duration }), [])
  useDeskAction({ label: t('schedule.newClass'), icon: 'plus', onClick: () => openForm({}) }, [])

  return (
    <>
      <div className="row between">
        <button type="button" className="iconbtn iconbtn--card" onClick={() => goWeek(week - 1)} aria-label={t('common.prev')}><Icon name="chevronLeft" size={20} /></button>
        <p className="card__title center grow">{t('schedule.weekOf', { from: fmtDate(start, { day: 'numeric', month: 'short' }), to: fmtDate(addDays(start, 6), { day: 'numeric', month: 'short' }) })}</p>
        <button type="button" className="iconbtn iconbtn--card" onClick={() => goWeek(week + 1)} aria-label={t('common.next')}><Icon name="chevronRight" size={20} /></button>
      </div>
      {adding && desk && (
        <Sheet title={t('schedule.newClass')} onClose={() => setAdding(null)}>
          <BulkForm key={JSON.stringify(adding)} preset={adding} onDone={(count) => { setAdding(null); if (count) toast(t('schedule.createdMany', { n: count })) }} />
        </Sheet>
      )}
      {adding && !desk ? (
        <section className="card">
          <p className="card__title">{t('schedule.newClass')}</p>
          <BulkForm key={JSON.stringify(adding)} preset={adding} onDone={(count) => { setAdding(null); if (count) toast(t('schedule.createdMany', { n: count })) }} />
        </section>
      ) : (
        <div className="schedtools">
          <button type="button" className="btn btn--primary btn--block" onClick={() => openForm(wide ? {} : { weekday: selected.wd, date: selected.date })}><Icon name="plus" size={18} /> {t('schedule.newClass')}</button>
          <div className="schedtools__more">
            <button type="button" className="btn btn--sm" onClick={() => setSheet('cancel')}><Icon name="x" size={15} /> {t('schedule.cancelRange')}</button>
            <button type="button" className="btn btn--sm" onClick={() => setSheet('copy')}><Icon name="copy" size={15} /> {t('schedule.copyWeek')}</button>
          </div>
        </div>
      )}

      {wide ? (
        <WeekGrid days={days} onOpen={(slot, date) => setSheet({ slot, date })} onAdd={addAt} />
      ) : (
        <>
          <div className="daystrip__days schedstrip">
            {days.map(({ wd, date }) => {
              const closed = isClosed(s, date)
              const count = closed ? 0 : slotsOn(s, date).length
              return (
                <button key={date} type="button" className={`day ${date === selected.date ? 'is-active' : ''} ${count ? '' : 'day--off'} ${closed ? 'day--closed' : ''}`} onClick={() => setDay(date)}>
                  <span className="day__wd">{t(`schedule.dayAbbr.${wd}`)}</span>
                  <span className="day__num">{fmtDate(date, { day: 'numeric' })}</span>
                  <span className="day__dot" aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <section className="card sched-day">
            <p className="sched-day__title">{fmtDate(selected.date, { weekday: 'long', day: 'numeric', month: 'short' })}{selected.date === today ? ` · ${t('common.today')}` : ''}</p>
            {isClosed(s, selected.date) ? <ClosedNote date={selected.date} /> : daySlots.length === 0 ? <Empty icon="calendar" title={t('schedule.emptyTitle')} /> : (
              <ul className="list">{daySlots.map((sl) => <ClassItem key={sl.id} slot={sl} date={selected.date} />)}</ul>
            )}
            {!isClosed(s, selected.date) && selected.date >= today && !adding && (
              <button type="button" className="link mt8" onClick={() => openForm({ weekday: selected.wd, date: selected.date })}>+ {t('schedule.newForDay')}</button>
            )}
          </section>
        </>
      )}

      {sheet === 'cancel' && <CancelRangeSheet start={wide ? start : selected.date} onClose={() => setSheet(null)} />}
      {sheet === 'copy' && <CopyWeekSheet start={start} onClose={() => setSheet(null)} />}
      {sheet?.slot && (
        <Sheet title={fmtDate(sheet.date, { weekday: 'long', day: 'numeric', month: 'short' })} onClose={() => setSheet(null)}>
          <ul className="list">
            {(() => { const sl = byId(s.slots, sheet.slot.id); return sl && slotsOn(s, sheet.date, { includeOff: true }).some((x) => x.id === sl.id)
              ? <ClassItem slot={sl} date={sheet.date} /> : <li className="small muted">{t('schedule.classSaved')}</li> })()}
          </ul>
        </Sheet>
      )}
    </>
  )
}
