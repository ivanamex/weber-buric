import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { DateInput } from '../../components/DateInput.jsx'
import {
  useStore, familyRiders, getPlan, createFamily, saveFamily, setFamilyActive, deleteFamily, isActiveFamily, isDeletedFamily, LEVELS, planStart,
} from '../../data/store.js'
import { PLANS } from '../../data/prices.js'
import { todayKey } from '../../lib/time.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'
import { PaymentHistory, PlanHistory } from '../../components/PaymentHistory.jsx'
import { SaveBar, useFormState } from '../../components/EditKit.jsx'
import ShareApp from './ShareApp.jsx'
import { DataTable, exportCsv, useDesktop, useDeskAction, useDeskSearch } from '../../components/Desk.jsx'
import { Sheet } from '../../components/EditKit.jsx'
import { dueOf } from '../../data/store.js'
import { LevelPill, StatusPill, riderColor } from '../../components/Colors.jsx'

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
        <div key={r.id || `n${i}`} className="rider-item">
        <div className={`rider-row ${r.active === false ? 'is-removed' : ''}`}>
          <input id={`${idPrefix}-name-${i}`} className="input" placeholder={t('admin.families.riderName')} aria-label={t('admin.families.riderName')}
            value={r.name} onChange={(e) => update(i, { name: e.target.value })} disabled={r.active === false} />
          <LevelSelect id={`${idPrefix}-level-${i}`} value={r.level} onChange={(level) => update(i, { level })} />
          {withPlan && <PlanSelect id={`${idPrefix}-plan-${i}`} value={r.planClasses} onChange={(v) => update(i, { planClasses: v, planStart: r.planStart || todayKey() })} />}
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
        {/* Each rider keeps their own start date; it only changes when it's edited here. */}
        {withPlan && r.planClasses && r.active !== false && (
          <label className="rider-start" htmlFor={`${idPrefix}-start-${i}`}>
            <span>{t('admin.families.planStartOf', { name: r.name || t('admin.families.riderName') })}</span>
            <DateInput id={`${idPrefix}-start-${i}`} value={r.planStart || ''} onChange={(e) => update(i, { planStart: e.target.value })} required />
          </label>
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
  const [f, setF, dirty] = useFormState(newFamily)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await createFamily({ ...f, riders: f.riders.filter((r) => r.name.trim()) })
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
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
          <DateInput id="nf-start" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required />
        </label>
      </div>
      <label className="field" htmlFor="nf-name"><span>{t('admin.families.nameOptional')}</span>
        <input id="nf-name" className="input" placeholder={t('admin.families.namePh')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </label>
      <p className="small muted mt8">{t('admin.families.emailHint')}</p>
      <SaveBar busy={busy} dirty={dirty} error={error} onCancel={onDone} label={t('admin.families.save')} />
    </form>
  )
}

function FamilyEditor({ family, onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const s = useStore()
  const [fields, setFields, fieldsDirty] = useFormState({ name: family.name, contact: family.contact, email: family.email, phone: family.phone || '' })
  const [riders, setRiders, ridersDirty] = useFormState(() => familyRiders(s, family.id, { includeInactive: true })
    .map((r) => {
      const plan = getPlan(s, r.id)
      return { id: r.id, name: r.name, level: r.level, age: r.age, active: r.active !== false, planClasses: r.planClasses || '', planStart: r.planStart || (plan ? planStart(plan) : '') }
    }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirm, setConfirm] = useState(null) // 'block' | 'delete'

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await saveFamily({ familyId: family.id, fields, riders: riders.filter((r) => r.id || r.name.trim()) })
    setBusy(false)
    if (!res.ok) return setError(t(`errors.${res.code}`))
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
      <p className="small muted mt8">{t('admin.families.assignHint')}</p>
      <SaveBar busy={busy} dirty={fieldsDirty || ridersDirty} error={error} onCancel={onDone} />
      {confirm ? (
        <div className="danger-zone" role="alertdialog" aria-label={t(`admin.families.${confirm}Title`, { name: family.name })}>
          <p className="small"><strong>{t(`admin.families.${confirm}Title`, { name: family.name })}</strong><br />{t(`admin.families.${confirm}Text`)}</p>
          <div className="row gap-sm end">
            <button type="button" className="btn btn--sm" onClick={() => setConfirm(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn--sm btn--dangerSolid" onClick={confirm === 'block' ? onBlock : onDelete}>{t(`admin.families.${confirm}`)}</button>
          </div>
        </div>
      ) : (
        <div className="row gap-sm mt16 wrap danger-actions">
          <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirm('block')}><Icon name="clock" size={15} /> {t('admin.families.block')}</button>
          <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirm('delete')}><Icon name="x" size={15} /> {t('admin.families.delete')}</button>
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
                  <span className="chip__avatar" style={{ background: riderColor(s, r.id), color: '#fff' }}>{r.name[0]}</span>
                  <div className="grow">
                    <p className="list__title">{r.name} <LevelPill level={r.level} /></p>
                    <p className="small muted">
                      {r.age ? t('more.profile.age', { n: r.age }) : ''}
                      {r.planClasses ? `${r.age ? ' · ' : ''}${t('admin.families.standing', { n: r.planClasses, date: fmtDate(r.planStart || todayKey(), { day: 'numeric', month: 'short' }) })}` : ''}
                    </p>
                  </div>
                  <StatusPill status={plan ? (plan.paid ? 'paid' : 'pending') : 'neutral'}>
                    {plan ? t('plan.shortUsed', { used: plan.used, total: plan.total }) : t('plan.none')}
                  </StatusPill>
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

/** Familias on a computer: a sortable table with filters, details and editing in a side panel, CSV export. */
function FamiliesDesk() {
  const { t, fmtMoney } = useI18n()
  const s = useStore()
  const q = useDeskSearch(t('admin.families.search'))
  const [status, setStatus] = useState('active')
  const [planFilter, setPlanFilter] = useState('all')
  const [owing, setOwing] = useState(false)
  const [open, setOpen] = useState(null) // family id | 'new' | 'share'
  const today = todayKey()
  const listed = s.families.filter((f) => !isDeletedFamily(f))
  const info = (f) => {
    const riders = familyRiders(s, f.id)
    const pending = s.payments.filter((p) => p.familyId === f.id && p.status === 'pending')
    return {
      riders,
      plans: riders.filter((r) => r.planClasses).map((r) => `${r.name}: ${r.planClasses}`),
      owed: pending.reduce((a, p) => a + p.amount, 0),
      late: pending.some((p) => dueOf(s, p) < today),
    }
  }
  const rows = listed
    .filter((f) => (status === 'all' ? true : status === 'active' ? isActiveFamily(f) : !isActiveFamily(f)))
    .map((f) => ({ ...f, info: info(f) }))
    .filter((f) => planFilter === 'all' || (planFilter === 'with' ? f.info.plans.length > 0 : f.info.plans.length === 0))
    .filter((f) => !owing || f.info.owed > 0)
    .filter((f) => !q || [f.name, f.contact, f.email, f.phone, ...f.info.riders.map((r) => r.name)].some((v) => v?.toLowerCase().includes(q)))
  const columns = [
    { key: 'name', label: t('admin.families.name'), render: (f) => <span className="dtable__strong">{f.name}</span> },
    { key: 'contact', label: t('admin.families.colContact') },
    { key: 'phone', label: t('admin.families.colPhone'), nowrap: true },
    { key: 'email', label: t('admin.families.colEmail'), csvOnly: true },
    { key: 'riders', label: t('admin.families.ridersPlans'), value: (f) => f.info.riders.map((r) => (r.planClasses ? `${r.name} (${r.planClasses})` : r.name)).join(' · ') },
    { key: 'owed', label: t('admin.families.owedCol'), align: 'right', nowrap: true, value: (f) => f.info.owed,
      render: (f) => (f.info.owed ? <strong className={f.info.late ? 'owed__late' : ''}>{fmtMoney(f.info.owed)}</strong> : <span className="muted">—</span>) },
    { key: 'state', label: t('desk.status'), value: (f) => (isActiveFamily(f) ? t('admin.families.activeState') : t('admin.families.blocked')),
      render: (f) => <Badge tone={isActiveFamily(f) ? 'success' : 'alert'}>{isActiveFamily(f) ? t('admin.families.activeState') : t('admin.families.blocked')}</Badge> },
  ]
  useDeskAction({ label: t('admin.families.add'), icon: 'plus', onClick: () => setOpen('new') }, [])
  const selected = open && open !== 'new' && open !== 'share' ? byIdSafe(listed, open) : null
  return (
    <div className="page">
      <p className="small muted">{t('admin.families.intro')}</p>
      <div className="dtoolbar">
        <Segmented small value={status} onChange={setStatus} options={[
          { value: 'active', label: t('admin.families.activeState') }, { value: 'inactive', label: t('admin.families.blocked') }, { value: 'all', label: t('desk.all') },
        ]} />
        <Segmented small value={planFilter} onChange={setPlanFilter} options={[
          { value: 'all', label: t('admin.families.anyPlan') }, { value: 'with', label: t('admin.families.withPlan') }, { value: 'without', label: t('admin.families.withoutPlan') },
        ]} />
        <button type="button" className={`chip ${owing ? 'is-active' : ''}`} aria-pressed={owing} onClick={() => setOwing(!owing)}>{t('admin.families.owingFilter')}</button>
        <span className="grow" />
        <button type="button" className="btn btn--sm" onClick={() => setOpen('share')}><Icon name="qr" size={16} /> {t('share.short')}</button>
        <button type="button" className="btn btn--sm" onClick={() => exportCsv(`familias-${today}.csv`, columns, rows)}><Icon name="download" size={16} /> {t('desk.export')}</button>
      </div>
      <DataTable columns={columns} rows={rows} onRow={(f) => setOpen(f.id)} selected={open} defaultSort={{ key: 'name', dir: 1 }}
        empty={<Empty icon="family" title={t(q ? 'admin.families.noMatch' : 'admin.families.emptyTitle')} />} />
      <p className="small muted">{t('admin.families.count', { n: rows.length, riders: rows.reduce((a, f) => a + f.info.riders.length, 0) })}</p>
      {open === 'new' && <Sheet title={t('admin.families.newTitle')} onClose={() => setOpen(null)}><NewFamilyForm onDone={() => setOpen(null)} /></Sheet>}
      {open === 'share' && <Sheet title={t('share.short')} onClose={() => setOpen(null)}><ShareApp onClose={() => setOpen(null)} /></Sheet>}
      {selected && <Sheet title={selected.name} onClose={() => setOpen(null)}><FamilyCard family={selected} /></Sheet>}
    </div>
  )
}
const byIdSafe = (list, id) => list.find((x) => x.id === id) || null

export default function AdminFamilies() {
  const desk = useDesktop()
  if (desk) return <FamiliesDesk />
  return <AdminFamiliesPhone />
}

function AdminFamiliesPhone() {
  const { t } = useI18n()
  const s = useStore()
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState(null) // 'new' | 'share' | null
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
      {!panel && (
        <button type="button" className="btn btn--sm btn--block" onClick={() => setPanel('share')}>
          <Icon name="qr" size={16} /> {t('share.short')}
        </button>
      )}

      {panel === 'new' && <NewFamilyForm onDone={() => setPanel(null)} />}
      {panel === 'share' && <ShareApp onClose={() => setPanel(null)} />}

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
