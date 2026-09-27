import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Icon } from './Icon.jsx'

/** Form state that knows when it differs from where it started. */
export function useFormState(initial) {
  const [f, setF] = useState(initial)
  const start = useRef(null)
  if (start.current === null) start.current = JSON.stringify(f)
  return [f, setF, JSON.stringify(f) !== start.current]
}

/** "¿Descartar cambios?" — Descartar / Seguir editando. */
export function ConfirmDialog({ title, text, confirmLabel, cancelLabel, onConfirm, onCancel, danger = true }) {
  const { t } = useI18n()
  const keep = useRef(null)
  useEffect(() => {
    keep.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" className="confirm__scrim" tabIndex={-1} aria-label={cancelLabel || t('edit.keepEditing')} onClick={onCancel} />
      <div className="confirm__panel">
        <p id="confirm-title" className="confirm__title">{title || t('edit.discardTitle')}</p>
        {(text || !title) && <p className="small muted">{text || t('edit.discardText')}</p>}
        <div className="confirm__actions">
          <button type="button" className={`btn btn--block ${danger ? 'btn--dangerSolid' : 'btn--save'}`} onClick={onConfirm}>{confirmLabel || t('edit.discard')}</button>
          <button ref={keep} type="button" className="btn btn--block" onClick={onCancel}>{cancelLabel || t('edit.keepEditing')}</button>
        </div>
      </div>
    </div>
  )
}

/** Ask before throwing away unsaved changes: `guard(action)` runs it now, or after "Descartar". */
export function useDiscardGuard(dirty) {
  const [pending, setPending] = useState(null)
  useEffect(() => {
    if (!dirty) return undefined
    const onUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])
  const guard = (action) => (dirty ? setPending(() => action) : action())
  const dialog = pending && (
    <ConfirmDialog onConfirm={() => { const a = pending; setPending(null); a() }} onCancel={() => setPending(null)} />
  )
  return [guard, dialog]
}

/** The one obvious Guardar (coral, white text, full width on phones) with Cancelar as a text link, and any error right above it. */
export function SaveBar({ busy, dirty = false, onCancel, label, error, disabled = false }) {
  const { t } = useI18n()
  const [guard, dialog] = useDiscardGuard(dirty)
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="savebar">
        <button type="submit" className="btn btn--save" disabled={busy || disabled}>{busy ? t('edit.saving') : label || t('edit.save')}</button>
        {onCancel && <button type="button" className="link savebar__cancel" onClick={() => guard(onCancel)}>{t('common.cancel')}</button>}
      </div>
      {dialog}
    </>
  )
}

/** A bottom sheet with a title and a close button. */
export function Sheet({ title, onClose, children }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.confirm')) close.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="isheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="isheet__scrim" aria-label={t('common.close')} tabIndex={-1} onClick={() => onClose()} />
      <div className="isheet__panel">
        <div className="isheet__head">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="iconbtn" onClick={() => onClose()} aria-label={t('common.close')}><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
