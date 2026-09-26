import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { resetDemo, useStore } from '../data/store.js'
import { useToast } from './Toast.jsx'
import { Icon } from './Icon.jsx'

/** "Reset demo" settings row with a two-tap confirmation. Hidden in live mode. */
export function ResetDemoRow() {
  const { t } = useI18n()
  const toast = useToast()
  const { mode } = useStore()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const id = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(id)
  }, [armed])
  if (mode !== 'demo') return null

  const onClick = async () => {
    if (!armed) return setArmed(true)
    setArmed(false)
    await resetDemo()
    toast(t('toasts.reset'), 'info')
  }
  return (
    <div className="list__row">
      <span className="grow">{t('more.reset')}<br /><span className="small muted">{armed ? t('more.resetConfirm') : t('more.resetHint')}</span></span>
      <button type="button" className={`btn btn--sm ${armed ? 'btn--dangerSolid' : 'btn--danger'}`} onClick={onClick}>
        <Icon name="refresh" size={16} /> {armed ? t('more.resetSure') : t('more.resetBtn')}
      </button>
    </div>
  )
}
