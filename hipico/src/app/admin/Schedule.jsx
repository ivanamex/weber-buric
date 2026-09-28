import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, byId, saveInstructor } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Segmented } from '../../components/ui.jsx'
import { todayKey } from '../../lib/time.js'
import { useSave } from './useSave.js'
import { SaveBar, useFormState } from '../../components/EditKit.jsx'
import HorsesView from './Horses.jsx'
import ClassesView from './ClassesView.jsx'

const DISCIPLINES = ['basics', 'dressage', 'jumping', 'ponies']

function InstructorForm({ instructor, onDone }) {
  const { t } = useI18n()
  const [run, busy, error] = useSave()
  const [f, setF, dirty] = useFormState(instructor ? { ...instructor } : { name: '', specialty: 'basics', active: true })
  return (
    <form className="inline-form" onSubmit={(e) => { e.preventDefault(); run(() => saveInstructor(f), t('schedule.saved'), onDone, { inline: true }) }}>
      <input className="input" aria-label={t('schedule.name')} placeholder={t('schedule.name')} value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <select className="input" aria-label={t('schedule.discipline')} value={f.specialty || 'basics'} onChange={(e) => setF({ ...f, specialty: e.target.value })}>
        {DISCIPLINES.map((d) => <option key={d} value={d}>{t(`disciplines.${d}`)}</option>)}
      </select>
      <label className="check"><input type="checkbox" checked={f.active !== false} onChange={(e) => setF({ ...f, active: e.target.checked })} /> <span>{t('schedule.activeLabel')}</span></label>
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onDone} />
    </form>
  )
}

function InstructorsView() {
  const { t } = useI18n()
  const s = useStore()
  const [editing, setEditing] = useState(null) // id | 'new'
  const open = (i) => setEditing(i?.id || 'new')
  const form = <InstructorForm key={editing} instructor={byId(s.instructors, editing)} onDone={() => setEditing(null)} />
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
                  <p className="small muted">{i.specialty ? t(`disciplines.${i.specialty}`) : ''} · {t('schedule.classesCount', { n: s.slots.filter((sl) => sl.instructorId === i.id && sl.active !== false && (!sl.endsOn || sl.endsOn >= todayKey())).length })}</p>
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
  // The view lives in the address (?vista=caballos | instructores), so the sidebar and back links can open it.
  const [params, setParams] = useSearchParams()
  const view = { caballos: 'horses', instructores: 'instructors' }[params.get('vista')] || 'classes'
  const setView = (v) => setParams(v === 'classes' ? {} : { vista: v === 'horses' ? 'caballos' : 'instructores' }, { replace: true })
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
