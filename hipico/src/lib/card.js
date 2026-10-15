// Card payments through Mercado Pago (Checkout Pro), for the app and the website. "Pagar con tarjeta" shows only
// when GET /api/mp-checkout says the club's keys are in Vercel; the demo (no database) never shows it.
import { useEffect, useState } from 'react'

const LIVE_CONFIGURED = Boolean(__SUPABASE_URL__ && __SUPABASE_KEY__)
let cache = null

/** Whether card payments are on. Never throws; cached for the page. */
export async function cardEnabled() {
  if (!LIVE_CONFIGURED) return false
  if (cache != null) return cache
  try {
    const res = await fetch('/api/mp-checkout')
    cache = res.ok ? Boolean((await res.json()).enabled) : false
  } catch { cache = false }
  return cache
}

/** The same, for a screen: false until the answer arrives. */
export function useCardEnabled() {
  const [on, setOn] = useState(cache === true)
  useEffect(() => { let live = true; cardEnabled().then((v) => { if (live) setOn(v) }); return () => { live = false } }, [])
  return on
}

const CODES = new Set(['notFound', 'alreadyPaid', 'cardOff', 'network'])

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
