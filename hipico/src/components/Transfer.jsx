import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { uploadReceipt, useStore } from '../data/store.js'
import { Icon } from './Icon.jsx'
import { Badge } from './ui.jsx'
import { useToast } from './Toast.jsx'
import { StatusPill } from './Colors.jsx'
import { payByCard, useCardEnabled } from '../lib/card.js'

export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,application/pdf,.heic,.heif,.pdf,.jpg,.jpeg,.png'
const MAX_BYTES = 10 * 1024 * 1024

/** Por revisar / Aprobado / Rechazado. */
export function ReceiptBadge({ status }) {
  const { t } = useI18n()
  if (!status) return null
  return <StatusPill status={{ review: 'review', approved: 'paid', rejected: 'overdue' }[status]}>{t(`receipt.status.${status}`)}</StatusPill>
}

/** The CLABE in blocks of four: "0121 8000 1234 5678 90". */
export const fmtClabe = (c) => String(c || '').replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
export const hasBank = (settings) => Boolean(settings?.bankName || settings?.accountHolder || settings?.clabe)

/** The club's bank details as label-over-value rows; one line ("El club te enviará los datos para pagar") until management fills them in. */
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
  if (!hasBank(settings)) return <p className="bank__none">{t('receipt.noBank')}</p>
  const row = (label, value, extra) => value ? (
    <div className="bank__row">
      <span className="bank__label">{label}</span>
      <span className="bank__value">{value}{extra}</span>
    </div>
  ) : null
  return (
    <div className="bank">
      {row(t('receipt.bank'), settings?.bankName)}
      {row(t('receipt.holder'), settings?.accountHolder)}
      {row('CLABE', clabe && <span className="bank__clabe">{fmtClabe(clabe)}</span>, clabe && (
        <button type="button" className="iconbtn iconbtn--card bank__copy" onClick={copy} aria-label={t('receipt.copy')} title={t('receipt.copy')}><Icon name="copy" size={16} /></button>
      ))}
    </div>
  )
}

/** Bank details + receipt upload for one pending payment. */
export function TransferPanel({ payment, family }) {
  const { t, fmtMoney, lang } = useI18n()
  const toast = useToast()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const card = useCardEnabled()
  const [cardBusy, setCardBusy] = useState(false)
  const onCard = async () => {
    setCardBusy(true)
    const res = await payByCard(payment.id, lang)
    if (!res.ok) { setCardBusy(false); toast(t(`errors.${res.code}`), 'error') }
  }

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
      {card && !waiting && (
        <div className="transfer__card">
          <button type="button" className="btn btn--primary btn--block" disabled={cardBusy} onClick={onCard}>
            <Icon name={cardBusy ? 'refresh' : 'card'} size={18} /> {t(cardBusy ? 'plan.cardOpening' : 'plan.payCard')}
          </button>
          <p className="small muted center">{t('plan.cardSecure')} · {t('receipt.orTransfer')}</p>
        </div>
      )}
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
