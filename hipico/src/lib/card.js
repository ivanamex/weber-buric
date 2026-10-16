// Card payments through Mercado Pago, for the app and the website: the card form inside the page (`CardForm`, with
// the club's public key) and the payment made on the server (/api/mp-pay); Checkout Pro (a jump to Mercado Pago and
// back) when only the private key is in. GET /api/mp-checkout says what's on; without a database it's all off.
import { useEffect, useState } from 'react'

const LIVE_CONFIGURED = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)
let cache = null

/** { enabled, publicKey } for card payments. Never throws; cached for the page. */
export async function cardInfo() {
  if (!LIVE_CONFIGURED) return { enabled: false, publicKey: null }
  if (cache) return cache
  try {
    const res = await fetch('/api/mp-checkout')
    const d = res.ok ? await res.json() : {}
    cache = { enabled: Boolean(d.enabled), publicKey: d.enabled && typeof d.publicKey === 'string' ? d.publicKey : null }
  } catch { cache = { enabled: false, publicKey: null } }
  return cache
}

/** Whether card payments are on. */
export const cardEnabled = async () => (await cardInfo()).enabled

/** The same, for a screen: { enabled: false } until the answer arrives. */
export function useCardInfo() {
  const [info, setInfo] = useState(cache || { enabled: false, publicKey: null })
  useEffect(() => { let live = true; cardInfo().then((v) => { if (live) setInfo(v) }); return () => { live = false } }, [])
  return info
}
export const useCardEnabled = () => useCardInfo().enabled

const CODES = new Set(['notFound', 'alreadyPaid', 'cardOff', 'cardInvalid', 'network'])

/** Where to send the person to pay a charge by card: { ok, url } or { ok: false, code }. */
export async function cardCheckout(paymentId, lang = 'es') {
  try {
    const res = await fetch('/api/mp-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, lang }) })
    if (!res.ok) return { ok: false, code: 'network' }
    const r = await res.json()
    if (r?.ok && r.url) return { ok: true, url: r.url }
    return { ok: false, code: CODES.has(r?.code) ? r.code : 'network' }
  } catch (err) {
    console.error('[card] checkout failed', err.message)
    return { ok: false, code: 'network' }
  }
}

/** Pay a charge by card: opens Mercado Pago in this tab (it comes back to /pago/…). Returns the failure, if any. */
export async function payByCard(paymentId, lang) {
  const res = await cardCheckout(paymentId, lang)
  if (res.ok) window.location.assign(res.url)
  return res
}

/** Pay a charge with the card form's data: { ok, status: approved | in_process | pending | rejected } or { ok: false, code }. */
export async function payCard(paymentId, card) {
  try {
    const res = await fetch('/api/mp-pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, card }) })
    const r = await res.json().catch(() => null)
    if (r?.ok) return { ok: true, status: r.status }
    return { ok: false, code: CODES.has(r?.code) ? r.code : 'network' }
  } catch (err) {
    console.error('[card] payment failed', err.message)
    return { ok: false, code: 'network' }
  }
}
