import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, familyRiders, getPlan, createFamily, saveFamily, setFamilyActive, deleteFamily, isActiveFamily, isDeletedFamily, LEVELS,
} from '../../data/store.js'
import { PLANS } from '../../data/prices.js'
import { todayKey } from '../../lib/time.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { PaymentHistory, PlanHistory } from '../../components/PaymentHistory.jsx'

const NEW_RIDER = { name: '', level: 'beginner' }
const newFamily = () => ({ contact: '', email: '', phone: '', name: '', plan: '8', start: todayKey(), riders: [{ ...NEW_RIDER }] })

function PlanSelect({ id, value, onChange }) {
  const { t } = useI18n()
  return (
    <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('plan.none')}</option>
      {PLANS.map((p) => <option key={p.classes} value={p.classes}>{t('admin.families.planOption', { n: p.classes })}</option>)}
    </select>
  )
}

function LevelSelect({ id, value, onChange }) {
  const { t } = useI18n()
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
    </select>
  )
}

/** Riders editor shared by "new family" and "edit family". */
function RidersEditor({ idPrefix, riders, setRiders, withPlan }) {
  const { t } = useI18n()
  const update = (i, patch) => setRiders(riders.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="riders-editor">
      {riders.map((r, i) => (
        <div key={r.id || `n${i}`} className={`rider-row ${r.active === false ? 'is-removed' : ''}`}>
          <input id={`${idPrefix}-name-${i}`} className="input" placeholder={t('admin.families.riderName')} aria-label={t('admin.families.riderName')}
            value={r.name} onChange={(e) => update(i, { name: e.target.value })} disabled={r.active === false} />
          <LevelSelect id={`${idPrefix}-level-${i}`} value={r.level} onChange={(level) => update(i, { level })} />
          {withPlan && <PlanSelect id={`${idPrefix}-plan-${i}`} value={r.planClasses} onChange={(v) => update(i, { planClasses: v })} />}
          {r.id ? (
            <button type="button" className="iconbtn" title={t(r.active === false ? 'admin.families.restoreRider' : 'admin.families.removeRider')}
              aria-label={t(r.active === false ? 'admin.families.restoreRider' : 'admin.families.removeRider')}
              onClick={() => update(i, { active: r.active === false })}>
              <Icon name={r.active === false ? 'refresh' : 'x'} size={18} />
            </button>
          ) : riders.length > 1 && (
            <button type="button" className="iconbtn" aria-label={t('admin.families.removeRider')} onClick={() => setRiders(riders.filter((_, j) => j !== i))}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="link" onClick={() => setRiders([...riders, { ...NEW_RIDER, planClasses: '' }])}>
        + {t('more.profile.addRider')}
      </button>
    </div>
  )
}

function NewFamilyForm({ onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const [f, setF] = useState(newFamily)
  const [busy, setBusy] = useState(false)
  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await createFamily({ ...f, riders: f.riders.filter((r) => r.name.trim()) })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.familyAdded', { name: f.contact.trim() }))
    onDone()
  }
  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="card__title">{t('admin.families.newTitle')}</p>
      <label className="field" htmlFor="nf-contact"><span>{t('admin.families.contact')}</span>
        <input id="nf-contact" className="input" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} required />
      </label>
      <div className="grid2 grid2--stack">
        <label className="field" htmlFor="nf-email"><span>{t('admin.families.email')}</span>
          <input id="nf-email" className="input" type="email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </label>
        <label className="field" htmlFor="nf-phone"><span>{t('admin.families.phone')}</span>
          <input id="nf-phone" className="input" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </label>
      </div>
      <div className="field"><span>{t('admin.families.riders')}</span>
        <RidersEditor idPrefix="nf-rider" riders={f.riders} setRiders={(riders) => setF({ ...f, riders })} />
      </div>
      <div className="grid2 grid2--stack">
        <label className="field" htmlFor="nf-plan"><span>{t('admin.families.currentPlan')}</span>
          <PlanSelect id="nf-plan" value={f.plan} onChange={(plan) => setF({ ...f, plan })} />
        </label>
        <label className="field" htmlFor="nf-start"><span>{t('admin.families.planStart')}</span>
          <input id="nf-start" className="input" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required />
        </label>
      </div>
      <label className="field" htmlFor="nf-name"><span>{t('admin.families.nameOptional')}</span>
        <input id="nf-name" className="input" placeholder={t('admin.families.namePh')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <p className="small muted mt8">{t('admin.families.emailHint')}</p>
      <div className="row gap-sm mt12 end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.save')}</button>
      </div>
    </form>
  )
}

function FamilyEditor({ family, onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const s = useStore()
  const [fields, setFields] = useState({ name: family.name, contact: family.contact, email: family.email, phone: family.phone || '' })
  const [riders, setRiders] = useState(() => familyRiders(s, family.id, { includeInactive: true })
    .map((r) => ({ id: r.id, name: r.name, level: r.level, age: r.age, active: r.active !== false, planClasses: r.planClasses || '' })))
  const [planStart, setPlanStart] = useState(todayKey())
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await saveFamily({ familyId: family.id, fields, planStart, riders: riders.filter((r) => r.id || r.name.trim()) })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.familySaved', { name: fields.contact.trim() }))
    onDone()
  }
  const onBlock = async () => {
    const res = await setFamilyActive(family.id, false)
    toast(res.ok ? t('toasts.familyBlocked', { name: family.name }) : t(`errors.${res.code}`), res.ok ? 'info' : 'error')
    if (res.ok) onDone()
  }
  const onDelete = async () => {
    const res = await deleteFamily(family.id)
    toast(res.ok ? t('toasts.familyDeleted', { name: family.name }) : t(`errors.${res.code}`), res.ok ? 'info' : 'error')
    if (res.ok) onDone()
  }
  const id = family.id
  return (
    <form onSubmit={onSave} className="family-editor">
      <div className="grid2 grid2--stack">
        <label className="field" htmlFor={`ef-contact-${id}`}><span>{t('admin.families.contact')}</span>
          <input id={`ef-contact-${id}`} className="input" value={fields.contact} onChange={(e) => setFields({ ...fields, contact: e.target.value })} required />
        </label>
        <label className="field" htmlFor={`ef-name-${id}`}><span>{t('admin.families.name')}</span>
          <input id={`ef-name-${id}`} className="input" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} />
        </label>
        <label className="field" htmlFor={`ef-email-${id}`}><span>{t('admin.families.email')}</span>
          <input id={`ef-email-${id}`} className="input" type="email" value={fields.email} onChange={(e) => setFields({ ...fields, email: e.target.value })} required />
        </label>
        <label className="field" htmlFor={`ef-phone-${id}`}><span>{t('admin.families.phone')}</span>
          <input id={`ef-phone-${id}`} className="input" type="tel" value={fields.phone} onChange={(e) => setFields({ ...fields, phone: e.target.value })} />
        </label>
      </div>
      <div className="field"><span>{t('admin.families.ridersAndPlans')}</span>
        <RidersEditor idPrefix={`ef-rider-${id}`} riders={riders} setRiders={setRiders} withPlan />
      </div>
      <label className="field" htmlFor={`ef-start-${id}`}><span>{t('admin.families.planStart')}</span>
        <input id={`ef-start-${id}`} className="input" type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} required />
      </label>
      <p className="small muted mt8">{t('admin.families.assignHint')}</p>
      <div className="row gap-sm mt12 end">
        <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
        <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
      </div>
      {confirmDelete ? (
        <div className="danger-zone">
          <p className="small"><strong>{t('admin.families.deleteTitle', { name: family.name })}</strong><br />{t('admin.families.deleteText')}</p>
          <div className="row gap-sm end">
            <button type="button" className="btn btn--sm" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn--sm btn--dangerSolid" onClick={onDelete}>{t('admin.families.delete')}</button>
          </div>
        </div>
      ) : (
        <div className="row gap-sm mt16 wrap danger-actions">
          <button type="button" className="btn btn--sm btn--danger" onClick={onBlock}><Icon name="clock" size={15} /> {t('admin.families.block')}</button>
          <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirmDelete(true)}><Icon name="x" size={15} /> {t('admin.families.delete')}</button>
        </div>
      )}
    </form>
  )
}

function FamilyCard({ family }) {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [history, setHistory] = useState(false)
  const riders = familyRiders(s, family.id)
  const horses = s.horses.filter((h) => h.ownerFamilyId === family.id)
  const active = isActiveFamily(family)

  const onReactivate = async () => {
    const res = await setFamilyActive(family.id, true)
    toast(res.ok ? t('toasts.familyUnblocked', { name: family.name }) : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }

  return (
    <section className={`card ${active ? '' : 'card--inactive'}`}>
      <div className="row gap">
        <span className="avatar">{family.contact?.[0] || family.name[0]}</span>
        <div className="grow">
          <p className="card__title">{family.name}</p>
          <p className="small muted">{family.contact}{family.phone ? ` · ${family.phone}` : ''}</p>
          <p className="small muted break">{family.email}</p>
        </div>
        {active && !editing && (
          <button type="button" className="btn btn--sm btn--outline" onClick={() => setEditing(true)}>{t('more.profile.edit')}</button>
        )}
      </div>
      <div className="row gap-sm wrap mt8">
        {!active && <Badge tone="alert">{t('admin.families.blocked')}</Badge>}
        {family.selfSignup && <Badge tone="accent">{t('admin.families.selfSignup')}</Badge>}
        {horses.length > 0 && <Badge tone="neutral"><Icon name="barn" size={12} /> {horses.map((h) => h.name).join(', ')}</Badge>}
      </div>
      {editing ? (
        <FamilyEditor family={family} onDone={() => setEditing(false)} />
      ) : (
        <>
          <ul className="list mt8">
            {riders.map((r) => {
              const plan = getPlan(s, r.id)
              return (
                <li key={r.id} className="list__row">
                  <span className="chip__avatar">{r.name[0]}</span>
                  <div className="grow">
                    <p className="list__title">{r.name}</p>
                    <p className="small muted">
                      {r.age ? `${t('more.profile.age', { n: r.age })} · ` : ''}{t(`levels.${r.level}`)}
                      {r.planClasses ? ` · ${t('admin.families.standing', { n: r.planClasses, date: fmtDate(r.planStart || todayKey(), { day: 'numeric', month: 'short' }) })}` : ''}
                    </p>
                  </div>
                  <Badge tone={plan ? (plan.paid ? 'success' : 'alert') : 'neutral'}>
                    {plan ? t('plan.shortUsed', { used: plan.used, total: plan.total }) : t('plan.none')}
                  </Badge>
                </li>
              )
            })}
            {riders.length === 0 && <li className="list__row small muted">{t('admin.families.noRiders')}</li>}
          </ul>
          <button type="button" className="link mt8" onClick={() => setHistory(!history)} aria-expanded={history}>
            <Icon name="receipt" size={14} /> {t(history ? 'history.hide' : 'history.show')}
          </button>
          {history && (
            <div className="family-history">
              <p className="card__label mt8">{t('history.plans')}</p>
              <PlanHistory familyId={family.id} />
              <p className="card__label mt12">{t('history.title')}</p>
              <PaymentHistory familyId={family.id} />
            </div>
          )}
          {!active && (
            <button type="button" className="btn btn--outline btn--sm btn--block mt8" onClick={onReactivate}>
              <Icon name="refresh" size={16} /> {t('admin.families.unblock')}
            </button>
          )}
        </>
      )}
    </section>
  )
}

export default function AdminFamilies() {
  const { t } = useI18n()
  const s = useStore()
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState(null) // 'new' | null
  const [view, setView] = useState('active')

  const listed = s.families.filter((f) => !isDeletedFamily(f))
  const activeCount = listed.filter(isActiveFamily).length
  const inactiveCount = listed.length - activeCount
  const q = query.trim().toLowerCase()
  const shown = inactiveCount ? view : 'active'
  const families = listed
    .filter((f) => (shown === 'active' ? isActiveFamily(f) : !isActiveFamily(f)))
    .filter((f) => !q || [f.name, f.contact, f.email, ...familyRiders(s, f.id).map((r) => r.name)].some((v) => v?.toLowerCase().includes(q)))

  return (
    <div className="page">
      <div className="row between">
        <h1 className="page__title">{t('admin.families.title')}</h1>
        {!panel && (
          <div className="row gap-sm">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setPanel('new')}>
              <Icon name="plus" size={16} /> {t('admin.families.add')}
            </button>
          </div>
        )}
      </div>
      <p className="small muted">{t('admin.families.intro')}</p>

      {panel === 'new' && <NewFamilyForm onDone={() => setPanel(null)} />}

      {inactiveCount > 0 && (
        <Segmented small value={shown} onChange={setView} options={[
          { value: 'active', label: t('admin.families.activeTab', { n: activeCount }) },
          { value: 'inactive', label: t('admin.families.blockedTab', { n: inactiveCount }) },
        ]} />
      )}

      <label className="search" htmlFor="fam-search">
        <Icon name="users" size={18} />
        <input id="fam-search" type="search" placeholder={t('admin.families.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {families.length === 0 ? (
        <Empty icon="family" title={t(q ? 'admin.families.noMatch' : 'admin.families.emptyTitle')}>
          {!q && !panel && <button type="button" className="btn btn--primary" onClick={() => setPanel('new')}><Icon name="plus" size={16} /> {t('admin.families.add')}</button>}
        </Empty>
      ) : families.map((f) => <FamilyCard key={f.id} family={f} />)}
      {families.length > 0 && (
        <p className="small muted center">{t('admin.families.count', { n: activeCount, riders: s.riders.filter((r) => r.active !== false && listed.some((f) => f.id === r.familyId)).length })}</p>
      )}
    </div>
  )
}
