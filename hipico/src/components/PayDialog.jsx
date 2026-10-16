import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { useStore, byId, uploadReceipt, payAtClub, simulateCardPayment, dueOf, dueState } from '../data/store.js'
import { Icon } from './Icon.jsx'
import { useToast } from './Toast.jsx'
import { StatusPill, HorseAvatar } from './Colors.jsx'
import { BankDetails, RECEIPT_ACCEPT, fmtClabe, hasBank } from './Transfer.jsx'
import { concept } from './PaymentHistory.jsx'
import { payByCard, payCard, useCardInfo } from '../lib/card.js'
import { CardForm, cardMode } from './CardForm.jsx'
import { DropZone, MethodCards } from './PayOptions.jsx'

const METHOD_KEY = 'hipico.payMethod'
const RESULT = { paid: 'Paid', club: 'Club', review: 'Review', pending: 'Pending' }
const MAX_BYTES = 10 * 1024 * 1024
const readMethod = () => { try { return localStorage.getItem(METHOD_KEY) } catch { return null } }
const keepMethod = (m) => { try { localStorage.setItem(METHOD_KEY, m) } catch { /* private mode */ } }

/** "Pensión de octubre · Relámpago", "Plan 8 clases · Regina", "Clase suelta · Mateo". */
export function paymentTitle(t, s, p, fmtDate) {
  const who = p.meta?.riderId ? byId(s.riders, p.meta.riderId)?.name : p.meta?.horseId ? byId(s.horses, p.meta.horseId)?.name : null
  const what = p.service === 'boarding' && p.meta?.month
    ? t('boarding.monthOf', { month: fmtDate(`${p.meta.month}-01`, { month: 'long' }) })
    : p.service === 'plan' && p.meta?.classes && p.meta?.kind !== 'upgrade' ? t('plan.classesPlan', { n: p.meta.classes }) : concept(t, p)
  return who ? `${what} · ${who}` : what
}

/**
 * One payment lightbox for every "Pagar" in the family app: what you're paying, then how (Tarjeta · Transferencia ·
 * En el club, the same cards as the website; the chosen one opens its part under them), then the result. A centered dialog on a computer, a bottom sheet on phones; focus stays inside, Esc closes.
 */
export function PayDialog({ paymentId, onClose }) {
  const { t, fmtMoney, fmtDate, lang } = useI18n()
  const s = useStore()
  const toast = useToast()
  const demo = s.mode === 'demo'
  const cardInfo = useCardInfo()
  const mode = cardMode({ demo, ...cardInfo })
  const cardApi = useRef(null)
  const p = byId(s.payments, paymentId)
  const family = byId(s.families, s.session?.familyId)
  const horse = p?.service === 'boarding' && p.meta?.horseId ? byId(s.horses, p.meta.horseId) : null
  // Tarjeta always shows; before the club's Mercado Pago keys are in it says "muy pronto" (the demo simulates it).
  const methods = ['card', 'transfer', 'club']
  const [method, setMethod] = useState(() => { const m = readMethod(); return methods.includes(m) ? m : 'transfer' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(null)
  const [result, setResult] = useState(null) // 'review' | 'paid' | 'club' | 'pending'
  const panel = useRef(null)
  const closeRef = useRef(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { close.current(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll('button:not(:disabled), a[href], input:not([type=file]), select, [tabindex="0"]')].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])

  if (!p) return null
  const pick = (m) => { setMethod(m); keepMethod(m) }
  const due = dueOf(s, p)
  const state = dueState(due)
  const copy = async (key, value) => {
    try { await navigator.clipboard.writeText(String(value)); setCopied(key); setTimeout(() => setCopied(null), 1800) } catch { toast(String(value), 'info') }
  }
  const onFile = (f) => {
    if (f.size > MAX_BYTES) return toast(t('errors.fileTooBig'), 'error')
    setFile(f)
  }
  const send = async () => {
    if (!file) return
    setBusy(true)
    const res = await uploadReceipt(p.id, file)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    setResult('review')
  }
  const onCard = async () => {
    setBusy(true)
    if (demo) {
      await new Promise((r) => setTimeout(r, 1200))
      const res = await simulateCardPayment(p.id)
      setBusy(false)
      if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
      return setResult('paid')
    }
    const data = await cardApi.current?.getData()
    if (!data) { setBusy(false); return toast(t('errors.cardInvalid'), 'error') }
    if (data.redirect) {
      const res = await payByCard(p.id, lang)
      if (!res.ok) { setBusy(false); toast(t(`errors.${res.code}`), 'error') }
      return
    }
    const res = await payCard(p.id, data)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    if (res.status === 'rejected') return toast(t('errors.cardRejected'), 'error', { sticky: true })
    setResult(res.status === 'approved' ? 'paid' : 'pending')
  }
  const onClub = async () => {
    setBusy(true)
    const res = await payAtClub(p.id)
    setBusy(false)
    if (!res.ok) return toast(t(`errors.${res.code}`), 'error')
    setResult('club')
  }
  const paid = p.status === 'paid'
  const waiting = p.receiptStatus === 'review'
  const statusPill = paid ? <StatusPill status="paid">{t('plan.paid')}</StatusPill>
    : waiting ? <StatusPill status="review">{t('receipt.status.review')}</StatusPill>
      : <StatusPill status={state === 'overdue' ? 'overdue' : state === 'today' ? 'pending' : 'neutral'}>{t(`familyDue.${state === 'later' ? 'soon' : state}`, { date: fmtDate(due, { day: 'numeric', month: 'short' }) })}</StatusPill>
  const cards = [
    { key: 'card', title: t('pay.card'), text: t('pay.optCard'), icon: <Icon name="card" size={22} /> },
    { key: 'transfer', title: t('pay.transfer'), text: t('pay.optTransfer'), icon: <Icon name="bank" size={22} /> },
    { key: 'club', title: t('pay.club'), text: t('pay.optClub'), icon: <Icon name="home" size={22} /> },
  ]
  const shownResult = result || (paid ? 'paid' : null)

  return (
    <div className="paydlg" role="dialog" aria-modal="true" aria-label={t('pay.title')}>
      <button type="button" className="paydlg__scrim" aria-label={t('common.close')} tabIndex={-1} onClick={() => onClose()} />
      <div className="paydlg__panel" ref={panel}>
        <div className="paydlg__head">
          <div className="paydlg__what">
            {horse && <HorseAvatar horse={horse} size={48} />}
            <div className="grow">
              <p className="card__label">{t('pay.title')}</p>
              <p className="paydlg__title">{paymentTitle(t, s, p, fmtDate)}</p>
            </div>
          </div>
          <button ref={closeRef} type="button" className="iconbtn" onClick={() => onClose()} aria-label={t('common.close')}><Icon name="x" size={20} /></button>
        </div>
        <div className="paydlg__amount">
          <strong>{fmtMoney(p.amount)}</strong>
          {statusPill}
        </div>

        {shownResult ? (
          <div className="paydlg__result" role="status">
            <span className="paydlg__resicon"><Icon name={shownResult === 'paid' ? 'check' : shownResult === 'club' ? 'home' : shownResult === 'pending' ? 'clock' : 'receipt'} size={28} /></span>
            <p className="paydlg__restitle">{t(`pay.result${RESULT[shownResult]}`)}</p>
            <p className="small muted">{t(`pay.result${RESULT[shownResult]}Text`)}</p>
            {shownResult === 'paid' && p.meta?.demoCard && <span className="paydlg__demo">{t('pay.cardDemo')}</span>}
            <button type="button" className="btn btn--primary" onClick={() => onClose()}>{t('pay.done')}</button>
          </div>
        ) : (
          <>
            <p className="paydlg__how">{t('pay.how')}</p>
            <MethodCards methods={cards} value={method} onChange={pick} label={t('pay.how')} check={<Icon name="check" size={14} />} />

            {method === 'transfer' && (
              <div className="paydlg__body paydlg__acc" key="transfer">
                {hasBank(s.settings) ? (
                  <>
                    <BankDetails />
                    <div className="bank">
                      <div className="bank__row"><span className="bank__label">{t('pay.amount')}</span><span className="bank__value">{fmtMoney(p.amount)}<CopyBtn label={t('pay.copyAmount')} done={copied === 'amount'} onClick={() => copy('amount', p.amount)} /></span></div>
                      <div className="bank__row"><span className="bank__label">{t('pay.reference')}</span><span className="bank__value">{family?.name}<CopyBtn label={t('pay.copyRef')} done={copied === 'ref'} onClick={() => copy('ref', family?.name || '')} /></span></div>
                    </div>
                    {copied === 'clabe' && <span className="visually-hidden" role="status">{t('pay.copied')}</span>}
                  </>
                ) : <p className="bank__none">{t('receipt.noBank')}</p>}
                {waiting ? (
                  <p className="small transfer__wait"><Icon name="clock" size={16} /> {t('pay.waiting')}</p>
                ) : (
                  <>
                    {p.receiptStatus === 'rejected' && <p className="transfer__note"><Icon name="alert" size={16} /> {p.receiptNote || t('pay.rejected')}</p>}
                    <DropZone file={file} onFile={onFile} accept={RECEIPT_ACCEPT} disabled={busy} title={t('pay.uploadTitle')} hint={t('pay.dropHint')} changeLabel={t('pay.change')}
                      icon={<Icon name="upload" size={26} />} fileIcon={<Icon name="file" size={22} />} />
                    <button type="button" className="btn btn--primary btn--block" onClick={send} disabled={busy || !file}>
                      <Icon name="check" size={18} /> {busy ? t('pay.sending') : t('pay.send')}
                    </button>
                  </>
                )}
              </div>
            )}

            {method === 'card' && (
              <div className="paydlg__body paydlg__acc" key="card">
                <CardForm mode={mode} amount={p.amount} email={family?.email} publicKey={cardInfo.publicKey} api={cardApi} />
                {mode !== 'off' && (
                  <button type="button" className="btn btn--primary btn--block" onClick={onCard} disabled={busy}>
                    <Icon name={busy ? 'refresh' : 'card'} size={18} /> {busy ? t('pay.cardProcessing') : t('pay.cardBtn', { amount: fmtMoney(p.amount) })}
                  </button>
                )}
              </div>
            )}

            {method === 'club' && (
              <div className="paydlg__body paydlg__acc" key="club">
                <p>{t('pay.clubText')}</p>
                {p.meta?.payAtClub ? (
                  <p className="small transfer__wait"><Icon name="check" size={16} /> {t('pay.clubSaid', { date: fmtDate(p.meta.payAtClub, { day: 'numeric', month: 'short' }) })}</p>
                ) : (
                  <button type="button" className="btn btn--primary btn--block" onClick={onClub} disabled={busy}>
                    <Icon name="home" size={18} /> {t('pay.clubBtn')}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CopyBtn({ label, done, onClick }) {
  return (
    <button type="button" className="iconbtn iconbtn--card bank__copy" onClick={onClick} aria-label={label} title={label}>
      <Icon name={done ? 'check' : 'copy'} size={16} />
    </button>
  )
}

/** The CLABE line's copy button lives in BankDetails; this re-export keeps the dialog's imports in one place. */
export { fmtClabe }
