import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)
  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setToasts((ts) => [...ts.slice(-1), { id, message, type }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2800)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`toast toast--${x.type}`}>
            <Icon name={x.type === 'error' ? 'alert' : x.type === 'info' ? 'info' : 'check'} size={18} />
            <span>{x.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)
