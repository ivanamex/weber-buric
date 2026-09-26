import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { uploadReceipt, useStore } from '../data/store.js'
import { Icon } from './Icon.jsx'
import { Badge } from './ui.jsx'
import { useToast } from './Toast.jsx'

export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const MAX_BYTES = 10 * 1024 * 1024

/** Por revisar / Aprobado / Rechazado. */
export function ReceiptBadge({ status }) {
  const { t } = useI18n()
  if (!status) return null
  const tone = { review: 'accent', approved: 'success', rejected: 'alert' }[status]
  return <Badge tone={tone}>{t(`receipt.status.${status}`)}</Badge>
}

/** The club's bank details; placeholders until management fills them in. */
export function BankDetails() {
  const { t } = useI18n()
  const toast = useToast()
  const { settings = {} } = useStore()
  const clabe = settings?.clabe
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clabe)
      toast(t('receipt.copied'))
    } catch {
      toast(clabe, 'info')
    }
  }
  const row = (label, value) => (
    <div className="bank__row">
      <span className="small muted">{label}</span>
      <strong className={value ? '' : 'bank__placeholder'}>{value || t('receipt.pending')}</strong>
    </div>
  )
  return (
    <div className="bank">
      {row(t('receipt.bank'), settings?.bankName)}
      {row(t('receipt.holder'), settings?.accountHolder)}
      <div className="bank__row">
        <span className="small muted">CLABE</span>
        <span className="row gap-sm">
          <strong className={`bank__clabe ${clabe ? '' : 'bank__placeholder'}`}>{clabe ? clabe.replace(/(\d{3})(\d{3})(\d{11})(\d)/, '$1 $2 $3 $4') : t('receipt.pending')}</strong>
          {clabe && <button type="button" className="link" onClick={copy}>{t('receipt.copy')}</button>}
        </span>
      </div>
    </div>
  )
}

/** Bank details + receipt upload for one pending payment. */
export function TransferPanel({ payment, family }) {
  const { t, fmtMoney } = useI18n()
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) return toast(t('errors.fileTooBig'), 'error')
    setBusy(true)
    const res = await uploadReceipt(payment.id, file)
    setBusy(false)
    toast(res.ok ? t('toasts.receiptSent') : t(`errors.${res.code}`), res.ok ? 'success' : 'error')
  }
  const waiting = payment.receiptStatus === 'review'
  return (
    <div className="transfer">
      <p className="small">{t('receipt.instructions', { amount: fmtMoney(payment.amount) })}</p>
      <BankDetails />
      <p className="small muted">{t('receipt.reference', { ref: family?.name || '' })}</p>
      {payment.receiptStatus === 'rejected' && (
        <p className="transfer__note"><Icon name="alert" size={16} /> {payment.receiptNote}</p>
      )}
      {waiting ? (
        <p className="small transfer__wait"><Icon name="clock" size={16} /> {t('receipt.waiting')}</p>
      ) : (
        <>
          <input ref={input} id={`receipt-${payment.id}`} type="file" accept={RECEIPT_ACCEPT} className="visually-hidden" onChange={onFile} />
          <button type="button" className="btn btn--primary btn--block" disabled={busy} onClick={() => input.current?.click()}>
            <Icon name="share" size={18} /> {busy ? t('receipt.uploading') : t(payment.receiptStatus === 'rejected' ? 'receipt.uploadAgain' : 'receipt.upload')}
          </button>
          <p className="small muted center">{t('receipt.formats')}</p>
        </>
      )}
    </div>
  )
}
