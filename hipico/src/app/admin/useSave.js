import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useToast } from '../../components/Toast.jsx'

/** Run a save action: busy while it runs, then a toast (the error message or `okMsg`) and `after()` on success. */
export function useSave() {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const run = async (fn, okMsg, after) => {
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    if (okMsg) toast(okMsg)
    after?.()
  }
  return [run, busy]
}
