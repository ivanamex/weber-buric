import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { BUILD, applyUpdate, checkNow, useShowUpdateBar } from '../lib/update.js'

/** "Hay una versión nueva de la app." + Actualizar, above the tab bar, while a new version waits for a safe moment. */
export function UpdateBar() {
  const { t } = useI18n()
  if (!useShowUpdateBar()) return null
  return (
    <div className="updatebar" role="status">
      <span>{t('update.ready')}</span>
      <button type="button" className="updatebar__btn" onClick={applyUpdate}>{t('update.apply')}</button>
    </div>
  )
}

/** "Versión 17 oct · 10:40" and "Buscar actualizaciones", at the bottom of Ajustes and Más. */
export function VersionLine() {
  const { t } = useI18n()
  const [state, setState] = useState(null) // null | 'checking' | 'latest' | 'updating'
  const run = async () => { setState('checking'); setState(await checkNow()) }
  return (
    <p className="versionline small">
      <span>{t('update.version', { v: BUILD || '—' })}</span>
      {state === 'latest' ? <span>{t('update.latest')}</span>
        : state === 'updating' ? <span>{t('update.updating')}</span>
          : <button type="button" className="tlink" disabled={state === 'checking'} onClick={run}>{t(state === 'checking' ? 'update.checking' : 'update.check')}</button>}
    </p>
  )
}
