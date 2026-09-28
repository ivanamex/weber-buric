import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { useI18n } from '../i18n/I18nProvider.jsx'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const closeLabel = useI18n()?.t?.('common.close') || 'Cerrar'
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const close = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])
  // { sticky: true } keeps the message until it's closed (errors the family has to read).
  const toast = useCallback((message, type = 'success', { sticky = false } = {}) => {
    const id = ++idRef.current
    setToasts((ts) => [...ts.slice(-1), { id, message, type, sticky }])
    if (!sticky) setTimeout(() => close(id), 2800)
  }, [close])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`toast toast--${x.type} ${x.sticky ? 'toast--sticky' : ''}`} role={x.sticky ? 'alert' : undefined}>
            <Icon name={x.type === 'error' ? 'alert' : x.type === 'info' ? 'info' : 'check'} size={18} />
            <span className="grow">{x.message}</span>
            {x.sticky && <button type="button" className="toast__close" onClick={() => close(x.id)} aria-label={closeLabel}><Icon name="x" size={16} /></button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)
