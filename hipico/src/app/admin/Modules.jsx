import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useStore, saveModules } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { useSave } from './useSave.js'

const MODULES = [
  { key: 'modulePayroll', icon: 'users', name: 'payroll' },
  { key: 'moduleProfit', icon: 'trophy', name: 'profit' },
  { key: 'moduleSales', icon: 'horseHead', name: 'sales' },
]

/** Ajustes: turn the owner's modules on or off. */
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
    </div>
  )
}
