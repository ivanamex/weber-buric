import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import {
  useStore, familyRiders, getPlan, createFamily, importFamilies, saveFamily, setFamilyActive, isActiveFamily, LEVELS,
} from '../../data/store.js'
import { PLANS } from '../../data/prices.js'
import { buildImport, CSV_TEMPLATE } from '../../lib/csv.js'
import { todayKey } from '../../lib/time.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, Segmented } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'

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

function ImportPanel({ onDone }) {
  const { t, fmtDate } = useI18n()
  const toast = useToast()
  const s = useStore()
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const existing = useMemo(() => new Set(s.families.map((f) => f.email?.toLowerCase())), [s.families])

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const res = buildImport(text, existing, PLANS.map((p) => p.classes))
    if (res.error) { setResult(null); return toast(t(`admin.import.${res.error}`), 'error') }
    setResult(res)
  }
  const ready = result?.items.filter((i) => i.status === 'new') || []
  const onImport = async () => {
    setBusy(true)
    const res = await importFamilies(ready.map((i) => i.family))
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.imported', { n: res.created, skipped: res.skipped + (result.items.length - ready.length) }))
    onDone()
  }
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`

  return (
    <div className="card">
      <p className="card__title">{t('admin.import.title')}</p>
      <p className="small muted">{t('admin.import.help')}</p>
      <code className="csv-cols">nombre, correo, telefono, jinetes, plan, inicio</code>
      <div className="row gap-sm mt12 wrap">
        <label className="btn btn--sm btn--outline file-btn" htmlFor="csv-file">
          <Icon name="plan" size={16} /> {t('admin.import.choose')}
          <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} />
        </label>
        <a className="link" href={templateHref} download="familias-plantilla.csv">{t('admin.import.template')}</a>
      </div>
      {result && (
        <>
          <div className="table-wrap mt12">
            <table className="preview">
              <thead>
                <tr><th>{t('admin.import.colFamily')}</th><th>{t('admin.families.riders')}</th><th>{t('admin.import.colPlan')}</th><th>{t('admin.import.colStatus')}</th></tr>
              </thead>
              <tbody>
                {result.items.map((i) => (
                  <tr key={i.line} className={`is-${i.status}`}>
                    <td><strong>{i.family.contact || '—'}</strong><br /><span className="small muted">{i.family.email || '—'}</span></td>
                    <td className="small">{i.family.riders.map((r) => `${r.name} · ${r.level ? t(`levels.${r.level}`) : '?'}`).join(', ')}</td>
                    <td className="small">{i.family.plan ? t('plan.classesPlan', { n: i.family.plan }) : t('plan.none')}{i.family.start ? <><br />{fmtDate(i.family.start, { day: 'numeric', month: 'short' })}</> : null}</td>
                    <td>
                      {i.status === 'new' && <Badge tone="success">{t('admin.import.new')}</Badge>}
                      {i.status === 'exists' && <Badge tone="neutral">{t('admin.import.exists')}</Badge>}
                      {i.status === 'error' && <Badge tone="alert">{t(`admin.import.err.${i.error}`, { line: i.line })}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row gap-sm mt12 end">
            <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
            <button type="button" className="btn btn--sm btn--primary" disabled={busy || !ready.length} onClick={onImport}>
              {t('admin.import.save', { n: ready.length })}
            </button>
          </div>
        </>
      )}
      {!result && <div className="row mt12 end"><button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button></div>}
    </div>
  )
}

function FamilyEditor({ family, onDone }) {
  const { t } = useI18n()
  const toast = useToast()
  const s = useStore()
  const [fields, setFields] = useState({ name: family.name, contact: family.contact, email: family.email, phone: family.phone || '' })
  const [riders, setRiders] = useState(() => familyRiders(s, family.id, { includeInactive: true })
    .map((r) => ({ id: r.id, name: r.name, level: r.level, age: r.age, active: r.active !== false, planClasses: r.planClasses || '' })))
  const [busy, setBusy] = useState(false)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const id = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(id)
  }, [armed])

  const onSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await saveFamily({ familyId: family.id, fields, riders: riders.filter((r) => r.id || r.name.trim()) })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.familySaved', { name: fields.contact.trim() }))
    onDone()
  }
  const onDeactivate = async () => {
    if (!armed) return setArmed(true)
    const res = await setFamilyActive(family.id, false)
    toast(res.ok ? t('toasts.familyDeactivated', { name: family.name }) : t(`errors.${res.code}`), res.ok ? 'info' : 'error')
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
      <div className="row between mt12 wrap">
        <button type="button" className={`btn btn--sm ${armed ? 'btn--dangerSolid' : 'btn--danger'}`} onClick={onDeactivate}>
          {armed ? t('admin.families.deactivateSure') : t('admin.families.deactivate')}
        </button>
        <div className="row gap-sm">
          <button type="button" className="btn btn--sm" onClick={onDone}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveChanges')}</button>
        </div>
      </div>
    </form>
  )
}

function FamilyCard({ family }) {
  const { t, fmtDate } = useI18n()
  const s = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const riders = familyRiders(s, family.id)
  const horses = s.horses.filter((h) => h.ownerFamilyId === family.id)
  const active = isActiveFamily(family)

  const onReactivate = async () => {
    const res = await setFamilyActive(family.id, true)
    toast(res.ok ? t('toasts.familyReactivated', { name: family.name }) : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
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
        {!active && <Badge tone="alert">{t('admin.families.inactive')}</Badge>}
        {family.selfSignup && <Badge tone="gold">{t('admin.families.selfSignup')}</Badge>}
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
          {!active && (
            <button type="button" className="btn btn--outline btn--sm btn--block mt8" onClick={onReactivate}>
              <Icon name="refresh" size={16} /> {t('admin.families.reactivate')}
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
  const [panel, setPanel] = useState(null) // 'new' | 'import' | null
  const [view, setView] = useState('active')

  const activeCount = s.families.filter(isActiveFamily).length
  const inactiveCount = s.families.length - activeCount
  const q = query.trim().toLowerCase()
  const shown = inactiveCount ? view : 'active'
  const families = s.families
    .filter((f) => (shown === 'active' ? isActiveFamily(f) : !isActiveFamily(f)))
    .filter((f) => !q || [f.name, f.contact, f.email, ...familyRiders(s, f.id).map((r) => r.name)].some((v) => v?.toLowerCase().includes(q)))

  return (
    <div className="page">
      <div className="row between">
        <h1 className="page__title">{t('admin.families.title')}</h1>
        {!panel && (
          <div className="row gap-sm">
            <button type="button" className="btn btn--sm btn--outline" onClick={() => setPanel('import')}>{t('admin.import.button')}</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setPanel('new')}>
              <Icon name="plus" size={16} /> {t('admin.families.add')}
            </button>
          </div>
        )}
      </div>
      <p className="small muted">{t('admin.families.intro')}</p>

      {panel === 'new' && <NewFamilyForm onDone={() => setPanel(null)} />}
      {panel === 'import' && <ImportPanel onDone={() => setPanel(null)} />}

      {inactiveCount > 0 && (
        <Segmented small value={shown} onChange={setView} options={[
          { value: 'active', label: t('admin.families.activeTab', { n: activeCount }) },
          { value: 'inactive', label: t('admin.families.inactiveTab', { n: inactiveCount }) },
        ]} />
      )}

      <label className="search" htmlFor="fam-search">
        <Icon name="users" size={18} />
        <input id="fam-search" type="search" placeholder={t('admin.families.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {families.length === 0 ? (
        <Empty icon="users" title={t(q ? 'admin.families.noMatch' : 'admin.families.emptyTitle')} text={q ? '' : t('admin.families.emptyText')} />
      ) : families.map((f) => <FamilyCard key={f.id} family={f} />)}
      {families.length > 0 && (
        <p className="small muted center">{t('admin.families.count', { n: activeCount, riders: s.riders.filter((r) => r.active !== false).length })}</p>
      )}
    </div>
  )
}
