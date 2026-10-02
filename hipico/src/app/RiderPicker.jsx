import { useOutletContext } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { useStore } from '../data/store.js'
import { riderColor } from '../components/Colors.jsx'

export function useFamilyContext() {
  return useOutletContext()
}

export function RiderPicker() {
  const { t } = useI18n()
  const { riders, riderId, setRiderId } = useOutletContext()
  const s = useStore()
  if (riders.length < 2) return null
  return (
    <div className="chips" role="group" aria-label={t('family.rider')}>
      {riders.map((r) => (
        <button key={r.id} type="button" className={`chip ${r.id === riderId ? 'is-active' : ''}`} onClick={() => setRiderId(r.id)}>
          <span className="chip__avatar" style={{ background: riderColor(s, r.id), color: '#fff' }}>{r.name[0]}</span>
          {r.name}
        </button>
      ))}
    </div>
  )
}
