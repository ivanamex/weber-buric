import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, familyRiders, getPlan, addFamily, addRider, LEVELS } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { Badge, Empty, SectionTitle } from '../../components/ui.jsx'
import { useToast } from '../../components/Toast.jsx'

const NEW_FAMILY = { name: '', contact: '', email: '', phone: '' }
const NEW_RIDER = { name: '', age: '', level: 'beginner' }

export default function AdminFamilies() {
  const { t } = useI18n()
  const s = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [family, setFamily] = useState(NEW_FAMILY)
  const [riderFor, setRiderFor] = useState(null)
  const [rider, setRider] = useState(NEW_RIDER)
  const [busy, setBusy] = useState(false)

  const q = query.trim().toLowerCase()
  const families = s.families.filter((f) =>
    !q || [f.name, f.contact, f.email, ...familyRiders(s, f.id).map((r) => r.name)].some((v) => v?.toLowerCase().includes(q)))

  const onAddFamily = async (e) => {
    e.preventDefault()
    setBusy(true)
    const res = await addFamily(family)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.familyAdded', { name: family.name.trim() }))
    setFamily(NEW_FAMILY)
    setAdding(false)
  }
  const onAddRider = async (e, familyId) => {
    e.preventDefault()
    setBusy(true)
    const res = await addRider({ familyId, ...rider })
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(t('toasts.riderAdded', { name: rider.name.trim() }))
    setRider(NEW_RIDER)
    setRiderFor(null)
  }

  return (
    <div className="page">
      <div className="row between">
        <h1 className="page__title">{t('admin.families.title')}</h1>
        {!adding && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> {t('admin.families.add')}
          </button>
        )}
      </div>
      <p className="small muted">{t('admin.families.intro')}</p>

      {adding && (
        <form className="card" onSubmit={onAddFamily}>
          <p className="card__title">{t('admin.families.newTitle')}</p>
          <label className="field" htmlFor="fam-name"><span>{t('admin.families.name')}</span>
            <input id="fam-name" className="input" placeholder={t('admin.families.namePh')} value={family.name} onChange={(e) => setFamily({ ...family, name: e.target.value })} required />
          </label>
          <label className="field" htmlFor="fam-contact"><span>{t('admin.families.contact')}</span>
            <input id="fam-contact" className="input" value={family.contact} onChange={(e) => setFamily({ ...family, contact: e.target.value })} required />
          </label>
          <label className="field" htmlFor="fam-email"><span>{t('admin.families.email')}</span>
            <input id="fam-email" className="input" type="email" inputMode="email" value={family.email} onChange={(e) => setFamily({ ...family, email: e.target.value })} required />
          </label>
          <label className="field" htmlFor="fam-phone"><span>{t('admin.families.phone')}</span>
            <input id="fam-phone" className="input" type="tel" inputMode="tel" value={family.phone} onChange={(e) => setFamily({ ...family, phone: e.target.value })} />
          </label>
          <p className="small muted mt8">{t('admin.families.emailHint')}</p>
          <div className="row gap-sm mt12" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn--sm" onClick={() => { setAdding(false); setFamily(NEW_FAMILY) }}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.save')}</button>
          </div>
        </form>
      )}

      <label className="search" htmlFor="fam-search">
        <Icon name="users" size={18} />
        <input id="fam-search" type="search" placeholder={t('admin.families.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {families.length === 0 ? (
        <Empty icon="users" title={t(q ? 'admin.families.noMatch' : 'admin.families.emptyTitle')} text={q ? '' : t('admin.families.emptyText')} />
      ) : families.map((f) => {
        const riders = familyRiders(s, f.id)
        const horses = s.horses.filter((h) => h.ownerFamilyId === f.id)
        return (
          <section key={f.id} className="card">
            <div className="row gap">
              <span className="avatar">{f.contact?.[0] || f.name[0]}</span>
              <div className="grow">
                <p className="card__title">{f.name}</p>
                <p className="small muted">{f.contact}{f.phone ? ` · ${f.phone}` : ''}</p>
                <p className="small muted break">{f.email}</p>
              </div>
            </div>
            {horses.length > 0 && (
              <p className="small mt8"><Icon name="barn" size={14} className="inline-icon" /> {t('admin.families.boarded')}: {horses.map((h) => h.name).join(', ')}</p>
            )}
            <ul className="list mt8">
              {riders.map((r) => {
                const plan = getPlan(s, r.id)
                return (
                  <li key={r.id} className="list__row">
                    <span className="chip__avatar">{r.name[0]}</span>
                    <div className="grow">
                      <p className="list__title">{r.name}</p>
                      <p className="small muted">{r.age ? `${t('more.profile.age', { n: r.age })} · ` : ''}{t(`levels.${r.level}`)}</p>
                    </div>
                    <Badge tone={plan ? (plan.paid ? 'success' : 'alert') : 'neutral'}>
                      {plan ? t('plan.shortUsed', { used: plan.used, total: plan.total }) : t('plan.none')}
                    </Badge>
                  </li>
                )
              })}
              {riders.length === 0 && <li className="list__row small muted">{t('admin.families.noRiders')}</li>}
            </ul>
            {riderFor === f.id ? (
              <form className="riderform" onSubmit={(e) => onAddRider(e, f.id)}>
                <div className="grid2">
                  <label className="field" htmlFor={`rider-name-${f.id}`}><span>{t('admin.families.riderName')}</span>
                    <input id={`rider-name-${f.id}`} className="input" value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} required />
                  </label>
                  <label className="field" htmlFor={`rider-age-${f.id}`}><span>{t('admin.families.age')}</span>
                    <input id={`rider-age-${f.id}`} className="input" type="number" min="2" max="99" inputMode="numeric" value={rider.age} onChange={(e) => setRider({ ...rider, age: e.target.value })} />
                  </label>
                </div>
                <label className="field" htmlFor={`rider-level-${f.id}`}><span>{t('admin.families.level')}</span>
                  <select id={`rider-level-${f.id}`} className="input" value={rider.level} onChange={(e) => setRider({ ...rider, level: e.target.value })}>
                    {LEVELS.map((l) => <option key={l} value={l}>{t(`levels.${l}`)}</option>)}
                  </select>
                </label>
                <div className="row gap-sm mt12" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--sm" onClick={() => { setRiderFor(null); setRider(NEW_RIDER) }}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>{t('admin.families.saveRider')}</button>
                </div>
              </form>
            ) : (
              <button type="button" className="btn btn--outline btn--sm btn--block mt8" onClick={() => { setRiderFor(f.id); setRider(NEW_RIDER) }}>
                <Icon name="plus" size={16} /> {t('more.profile.addRider')}
              </button>
            )}
          </section>
        )
      })}
      {families.length > 0 && <SectionTitle>{t('admin.families.count', { n: s.families.length, riders: s.riders.length })}</SectionTitle>}
    </div>
  )
}
