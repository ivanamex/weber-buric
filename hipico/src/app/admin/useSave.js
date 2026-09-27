import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { useToast } from '../../components/Toast.jsx'

/**
 * Run a save action: busy while it runs, then `okMsg` as a toast and `after()` on success.
 * Errors show as a toast, or with `{ inline: true }` as `error` (shown next to the form by SaveBar).
 */
export function useSave() {
  const { t } = useI18n()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const run = async (fn, okMsg, after, { inline = false } = {}) => {
    setBusy(true)
    setError(null)
    const res = await fn()
    setBusy(false)
    if (!res.ok) {
      const msg = t(`errors.${res.code}`)
      return inline ? setError(msg) : toast(msg, 'error')
    }
    if (okMsg) toast(okMsg)
    after?.(res)
  }
  return [run, busy, error]
}
