import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, byId, isActiveBooking, isDeletedFamily, LEVELS, saveSlot, saveInstructor, saveHorse, cancelClassDate, reopenClassDate,
} from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { todayKey, addDays, weekStart } from '../../lib/time.js'
import { useSave } from './useSave.js'
import HorsesView from './Horses.jsx'

const DISCIPLINES = ['basics', 'dressage', 'jumping', 'ponies']
const ARENAS = ['main', 'covered', 'jumping']
const WEEK = [1, 2, 3, 4, 5, 6, 0] // Monday … Sunday


function SlotForm({ slot, onDone }) {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const instructors = s.instructors.filter((i) => i.active !== false || i.id === slot?.instructorId)
  const [f, setF] = useState(() => slot ? { ...slot } : {
    weekday: 1, time: '16:00', duration: 60, discipline: 'basics', level: 'beginner',
    instructorId: instructors[0]?.id, arena: 'main', capacity: 4, active: true,
  })
  const id = slot?.id || 'new'
  const set = (patch) => setF({ ...f, ...patch })
  const onSubmit = (e) => {
    e.preventDefault()
    run(() => saveSlot(f), t(slot ? 'schedule.saved' : 'schedule.created'), onDone)
  }
  return (
    <form className="card slot-form" onSubmit={onSubmit}>
      {!slot && <p className="card__title">{t('schedule.newClass')}</p>}
      <div className="grid3">
        <label className="field" htmlFor={`sf-day-${id}`}><span>{t('schedule.day')}</span>
          <select id={`sf-day-${id}`} className="input" value={f.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })}>
            {WEEK.map((d) => <option key={d} value={d}>{t(`schedule.weekdays.${d}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`sf-time-${id}`}><span>{t('schedule.time')}</span>
          <input id={`sf-time-${id}`} className="input" type="time" step="900" value={f.time} onChange={(e) => set({ time: e.target.value })} required />
        </label>
        <label className="field" htmlFor={`sf-dur-${id}`}><span>{t('schedule.duration')}</span>
          <input id={`sf-dur-${id}`} className="input" type="number" min="15" max="240" step="15" inputMode="numeric" value={f.duration} onChange={(e) => set({ duration: e.target.value })} required />
        </label>
      </div>
      <div className="grid2">
        <label className="field" htmlFor={`sf-disc-${id}`}><span>{t('schedule.discipline')}</span>
          <select id={`sf-disc-${id}`} className="input" value={f.discipline} onChange={(e) => set({ discipline: e.target.value })}>
            {DISCIPLINES.map((d) => <option key={d} value={d}>{t(`disciplines.${d}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`sf-level-${id}`}><span>{t('admin.families.level')}</span>
          <select id={`sf-level-${id}`} className="input" value={f.level} onChange={(e) => set({ level: e.target.value })}>
            {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`sf-inst-${id}`}><span>{t('schedule.instructor')}</span>
          <select id={`sf-inst-${id}`} className="input" value={f.instructorId || ''} onChange={(e) => set({ instructorId: e.target.value })} required>
            {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`sf-arena-${id}`}><span>{t('schedule.arena')}</span>
          <select id={`sf-arena-${id}`} className="input" value={f.arena} onChange={(e) => set({ arena: e.target.value })}>
            {ARENAS.map((a) => <option key={a} value={a}>{t(`arenas.${a}`)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`sf-cap-${id}`}><span>{t('schedule.capacity')}</span>
          <input id={`sf-cap-${id}`} className="input" type="number" min="1" max="30" inputMode="numeric" value={f.capacity} onChange={(e) => set({ capacity: e.target.value })} required />
        </label>
        <label className="field check" htmlFor={`sf-on-${id}`}>
          <input id={`sf-on-${id}`} type="checkbox" checked={f.active !== false} onChange={(e) => set({ active: e.target.checked })} />
          <span>{t('schedule.activeClass')}</span>
        </label>
      </div>
      <div className="row gap-sm mt12 end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
}

function ClassRow({ slot, date }) {
  const { t, fmtTime } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const [mode, setMode] = useState(null) // 'edit' | 'cancel'
  const [reason, setReason] = useState('')
  const booked = s.bookings.filter((b) => b.slotId === slot.id && b.date === date && isActiveBooking(b)).length
  const taken = Math.max(booked, s.slotCounts?.[`${slot.id}|${date}`] ?? 0)
  const cancellation = (s.cancellations || []).find((c) => c.slotId === slot.id && c.date === date)
  const upcoming = date >= todayKey()
  const off = slot.active === false

  if (mode === 'edit') return <SlotForm slot={slot} onDone={() => setMode(null)} />
  return (
    <li className={`sched-row ${off ? 'is-off' : ''} ${cancellation ? 'is-cancelled' : ''}`}>
      <div className="sched-row__time"><strong>{fmtTime(slot.time)}</strong><span>{slot.duration} min</span></div>
      <div className="grow">
        <p className="list__title">{t(`disciplines.${slot.discipline}`)} <Badge tone="neutral">{t(`levels.${slot.level}`)}</Badge></p>
        <p className="small muted">{byId(s.instructors, slot.instructorId)?.name} · {t(`arenas.${slot.arena}`)}</p>
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
              <button type="button" className="btn btn--sm" onClick={() => setMode(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn btn--sm btn--dangerSolid" disabled={busy}
                onClick={() => run(() => cancelClassDate(slot.id, date, reason), t('schedule.cancelDone'), () => setMode(null))}>{t('schedule.cancelDate')}</button>
            </div>
          </div>
        )}
      </div>
      {mode !== 'cancel' && (
        <div className="sched-row__actions">
          <button type="button" className="link" onClick={() => setMode('edit')}>{t('more.profile.edit')}</button>
          {upcoming && !off && (cancellation
            ? <button type="button" className="link" disabled={busy} onClick={() => run(() => reopenClassDate(slot.id, date), t('schedule.reopened'))}>{t('schedule.reopen')}</button>
            : <button type="button" className="link link--danger" onClick={() => setMode('cancel')}>{t('schedule.cancelShort')}</button>)}
        </div>
      )}
    </li>
  )
}

function ClassesView() {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const [week, setWeek] = useState(0)
  const [adding, setAdding] = useState(false)
  const start = addDays(weekStart(todayKey()), week * 7)
  const days = WEEK.map((wd, i) => ({ wd, date: addDays(start, i) }))
    .filter(({ wd }) => s.slots.some((sl) => sl.weekday === wd))
  return (
    <>
      <div className="row between">
        <button type="button" className="iconbtn iconbtn--card" onClick={() => setWeek(week - 1)} aria-label={t('common.prev')}><Icon name="chevronLeft" size={20} /></button>
        <p className="card__title center grow">{t('schedule.weekOf', { from: fmtDate(start, { day: 'numeric', month: 'short' }), to: fmtDate(addDays(start, 6), { day: 'numeric', month: 'short' }) })}</p>
        <button type="button" className="iconbtn iconbtn--card" onClick={() => setWeek(week + 1)} aria-label={t('common.next')}><Icon name="chevronRight" size={20} /></button>
      </div>
      {adding ? <SlotForm onDone={() => setAdding(false)} /> : (
        <button type="button" className="btn btn--primary btn--sm btn--block" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> {t('schedule.newClass')}</button>
      )}
      {days.length === 0 && !adding && <Empty icon="calendar" title={t('schedule.emptyTitle')} />}
      {days.map(({ wd, date }) => (
        <section key={wd} className="card sched-day">
          <p className="sched-day__title">{fmtDate(date, { weekday: 'long', day: 'numeric', month: 'short' })}{date === todayKey() ? ` · ${t('common.today')}` : ''}</p>
          <ul className="list">
            {s.slots.filter((sl) => sl.weekday === wd).sort((a, b) => a.time.localeCompare(b.time))
              .map((sl) => <ClassRow key={sl.id} slot={sl} date={date} />)}
          </ul>
        </section>
      ))}
    </>
  )
}

function InstructorsView() {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const [editing, setEditing] = useState(null) // id | 'new'
  const [f, setF] = useState({})
  const open = (i) => { setEditing(i?.id || 'new'); setF(i ? { ...i } : { name: '', specialty: 'basics', active: true }) }
  const form = (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveInstructor(f), t('schedule.saved'), () => setEditing(null)) }}>
      <input className="input" aria-label={t('schedule.name')} placeholder={t('schedule.name')} value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <select className="input" aria-label={t('schedule.discipline')} value={f.specialty || 'basics'} onChange={(e) => setF({ ...f, specialty: e.target.value })}>
        {DISCIPLINES.map((d) => <option key={d} value={d}>{t(`disciplines.${d}`)}</option>)}
      </select>
      <label className="check"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} /> <span>{t('schedule.activeLabel')}</span></label>
      <div className="row gap-sm end">
        <button type="button" className="btn btn--sm" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
    </form>
  )
  return (
    <div className="card">
      <ul className="list">
        {s.instructors.map((i) => (
          <li key={i.id} className="list__row list__row--stack">
            {editing === i.id ? form : (
              <div className="row gap">
                <span className="chip__avatar chip__avatar--lg">{i.name[0]}</span>
                <div className="grow">
                  <p className="list__title">{i.name} {i.active === false && <Badge tone="neutral">{t('schedule.off')}</Badge>}</p>
                  <p className="small muted">{i.specialty ? t(`disciplines.${i.specialty}`) : ''} · {t('schedule.classesCount', { n: s.slots.filter((sl) => sl.instructorId === i.id && sl.active !== false).length })}</p>
                </div>
                <button type="button" className="link" onClick={() => open(i)}>{t('more.profile.edit')}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === 'new' ? <div className="mt12">{form}</div> : (
        <button type="button" className="btn btn--outline btn--sm btn--block mt12" onClick={() => open(null)}><Icon name="plus" size={16} /> {t('schedule.addInstructor')}</button>
      )}
    </div>
  )
}


export default function AdminSchedule() {
  const { t } = useI18n()
  const [view, setView] = useState('classes')
  return (
    <div className="page">
      <h1 className="page__title">{t('schedule.title')}</h1>
      <Segmented value={view} onChange={setView} options={[
        { value: 'classes', label: t('schedule.classes') },
        { value: 'instructors', label: t('schedule.instructors') },
        { value: 'horses', label: t('schedule.horses') },
      ]} />
      {view === 'classes' && <ClassesView />}
      {view === 'instructors' && <InstructorsView />}
      {view === 'horses' && <HorsesView />}
    </div>
  )
}
