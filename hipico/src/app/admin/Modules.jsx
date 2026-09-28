import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, saveModules, closedWeekdays, saveClosedWeekdays, addClosedDates, deleteClosedDate } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { SaveBar, useFormState } from '../../components/EditKit.jsx'
import { useToast } from '../../components/Toast.jsx'
import { todayKey } from '../../lib/time.js'
import { useSave } from './useSave.js'

const WEEK = [1, 2, 3, 4, 5, 6, 0]

function ClosedWeekdays() {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy, error] = useSave()
  const [days, setDays, dirty] = useFormState(() => [...closedWeekdays(s)].sort())
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveClosedWeekdays(days), t('closed.saved'), null, { inline: true }) }}>
      <div className="field"><span>{t('closed.weekdays')}</span>
        <div className="daychips daychips--closed" role="group" aria-label={t('closed.weekdays')}>
          {WEEK.map((d) => (
            <button key={d} type="button" className={`daychip ${days.includes(d) ? 'is-active' : ''}`} aria-pressed={days.includes(d)}
              aria-label={t(`schedule.weekdays.${d}`)} title={t(`schedule.weekdays.${d}`)} onClick={() => toggle(d)}>{t(`schedule.dayShort.${d}`)}</button>
          ))}
        </div>
      </div>
      {dirty && <SaveBar busy={busy} dirty={dirty} error={error} />}
    </form>
  )
}

function ClosedDates() {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const [run, busy, error] = useSave()
  const today = todayKey()
  const [f, setF, dirty] = useFormState({ from: today, to: today, note: '' })
  const [key, setKey] = useState(0)
  const list = (s.closedDates || []).filter((c) => c.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const range = (c) => (c.startsOn === c.endsOn ? fmtDate(c.startsOn, { weekday: 'short', day: 'numeric', month: 'short' })
    : `${fmtDate(c.startsOn, { day: 'numeric', month: 'short' })} – ${fmtDate(c.endsOn, { day: 'numeric', month: 'short' })}`)
  const onAdd = (e) => {
    e.preventDefault()
    run(() => addClosedDates(f), null, (res) => {
      toast(res.classes ? t('closed.addedCancelled', { n: res.classes }) : t('closed.added'))
      setF({ from: today, to: today, note: '' })
      setKey(key + 1)
    }, { inline: true })
  }
  return (
    <>
      <p className="card__label mt16">{t('closed.dates')}</p>
      {list.length === 0 ? <p className="small muted">{t('closed.none')}</p> : (
        <ul className="list">
          {list.map((c) => (
            <li key={c.id} className="list__row">
              <Icon name="calendar" size={18} />
              <div className="grow">
                <p className="list__title">{range(c)}</p>
                {c.note && <p className="small muted">{c.note}</p>}
              </div>
              <button type="button" className="iconbtn" aria-label={t('closed.remove', { date: range(c) })} onClick={() => run(() => deleteClosedDate(c.id), t('closed.removed'))}><Icon name="x" size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <form key={key} className="inline-form mt12" onSubmit={onAdd}>
        <div className="grid2">
          <label className="field" htmlFor="cd-from"><span>{t('schedule.from')}</span>
            <input id="cd-from" className="input" type="date" min={today} required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} />
          </label>
          <label className="field" htmlFor="cd-to"><span>{t('schedule.until')}</span>
            <input id="cd-to" className="input" type="date" min={f.from} required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </label>
        </div>
        <label className="field" htmlFor="cd-note"><span>{t('closed.note')}</span>
          <input id="cd-note" className="input" maxLength={120} placeholder={t('closed.notePh')} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </label>
        <p className="small muted">{t('closed.hint')}</p>
        <SaveBar busy={busy} dirty={dirty && Boolean(f.note)} error={error} label={t('closed.add')} />
      </form>
    </>
  )
}

const MODULES = [
  { key: 'modulePayroll', icon: 'users', name: 'payroll' },
  { key: 'moduleProfit', icon: 'trophy', name: 'profit' },
  { key: 'moduleSales', icon: 'horseHead', name: 'sales' },
]

/** Ajustes: closed days, and the owner's modules on or off. */
export default function AdminModules() {
  const { t } = useI18n()
  const s = useStore()
  const [run, busy] = useSave()
  const current = Object.fromEntries(MODULES.map((m) => [m.key, Boolean(s.settings?.[m.key])]))
  const toggle = (key) => {
    const next = { ...current, [key]: !current[key] }
    run(() => saveModules(next), t(next[key] ? 'modules.turnedOn' : 'modules.turnedOff', { name: t(`modules.${MODULES.find((m) => m.key === key).name}.title`) }))
  }
  return (
    <div className="page">
      <h1 className="page__title">{t('modules.title')}</h1>
      <p className="small muted">{t('modules.intro')}</p>
      <ul className="list card">
        {MODULES.map((m) => (
          <li key={m.key} className="list__row">
            <span className="tile-icon"><Icon name={m.icon} size={20} /></span>
            <div className="grow">
              <p className="list__title">{t(`modules.${m.name}.title`)}</p>
              <p className="small muted">{t(`modules.${m.name}.text`)}</p>
            </div>
            <label className="switch">
              <input type="checkbox" role="switch" checked={current[m.key]} disabled={busy} onChange={() => toggle(m.key)}
                aria-label={t(`modules.${m.name}.title`)} />
              <span aria-hidden="true" />
            </label>
          </li>
        ))}
      </ul>

      <SectionTitle icon="calendar">{t('closed.title')}</SectionTitle>
      <div className="card" id="cerrados">
        <p className="small muted">{t('closed.intro')}</p>
        <ClosedWeekdays />
        <ClosedDates />
      </div>
    </div>
  )
}
