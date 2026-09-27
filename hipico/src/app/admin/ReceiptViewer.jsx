import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { receiptUrl, reviewReceipt } from '../../data/store.js'
import { Icon } from '../../components/Icon.jsx'
import { useToast } from '../../components/Toast.jsx'

/** Full-screen viewer for a transfer receipt, with Aprobar / Rechazar (with a short note) unless read-only. */
export default function ReceiptViewer({ payment, title, onClose, readOnly = false }) {
  const { t, fmtMoney } = useI18n()
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    receiptUrl(payment).then((res) => { if (alive) setFile(res.ok ? res : { error: true }) })
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { alive = false; window.removeEventListener('keydown', onKey) }
  }, [payment, onClose])

  const decide = async (approve) => {
    if (!approve && !note.trim()) return toast(t('errors.noteRequired'), 'error')
    setBusy(true)
    const res = await reviewReceipt(payment.id, approve, note)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    toast(approve ? t('toasts.receiptApproved', { amount: fmtMoney(payment.amount) }) : t('toasts.receiptRejected'), approve ? 'success' : 'info')
    onClose()
  }

  const isPdf = file?.type === 'application/pdf'
  const isHeic = /hei[cf]/.test(file?.type || '')
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={t('receipt.viewerTitle')}>
      <div className="viewer__bar">
        <div className="grow">
          <p className="viewer__title">{title}</p>
          <p className="small">{fmtMoney(payment.amount)}</p>
        </div>
        {file?.url && <a className="iconbtn iconbtn--light" href={file.url} target="_blank" rel="noopener noreferrer" aria-label={t('receipt.openNew')}><Icon name="share" size={20} /></a>}
        <button type="button" className="iconbtn iconbtn--light" onClick={onClose} aria-label={t('common.close')}><Icon name="x" size={22} /></button>
      </div>
      <div className="viewer__body">
        {!file && <p className="viewer__msg">{t('live.loading')}</p>}
        {file?.error && <p className="viewer__msg">{t('errors.network')}</p>}
        {file?.url && isPdf && <iframe className="viewer__pdf" src={file.url} title={t('receipt.viewerTitle')} />}
        {file?.url && isHeic && (
          <p className="viewer__msg">{t('receipt.heic')}<br /><a className="btn btn--accent mt12" href={file.url} target="_blank" rel="noopener noreferrer">{t('receipt.openNew')}</a></p>
        )}
        {file?.url && !isPdf && !isHeic && <img className="viewer__img" src={file.url} alt={t('receipt.viewerTitle')} />}
      </div>
      {!readOnly && <div className="viewer__actions">
        {rejecting ? (
          <>
            <label className="field" htmlFor="reject-note"><span>{t('receipt.rejectNote')}</span>
              <input id="reject-note" className="input" maxLength={280} placeholder={t('receipt.rejectPh')} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            </label>
            <div className="row gap-sm end">
              <button type="button" className="btn btn--sm" onClick={() => setRejecting(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn btn--sm btn--dangerSolid" disabled={busy} onClick={() => decide(false)}>{t('receipt.reject')}</button>
            </div>
          </>
        ) : (
          <div className="grid2">
            <button type="button" className="btn btn--danger" onClick={() => setRejecting(true)}><Icon name="x" size={18} /> {t('receipt.reject')}</button>
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => decide(true)}><Icon name="check" size={18} /> {t('receipt.approve')}</button>
          </div>
        )}
      </div>}
    </div>
  )
}
