// Mercado Pago (Checkout Pro) shared bits: the keys in Vercel, the API calls and the notification signature.
import crypto from 'node:crypto'

const API = 'https://api.mercadopago.com'
export const SITE_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')

/** Card payments are on only when the club's credentials are in Vercel. */
export const mpEnabled = (env = process.env) => Boolean(env.MP_ACCESS_TOKEN)

/** Create a Checkout Pro preference for one charge; returns { id, url }. */
export async function createPreference({ paymentId, title, amount, email, lang = 'es' }, env = process.env, fetchFn = fetch) {
  const prefix = lang === 'en' ? '/en/payment' : '/pago'
  const back = (k) => `${SITE_URL}${prefix}/${k}?p=${paymentId}`
  const res = await fetchFn(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `pref-${paymentId}` },
    body: JSON.stringify({
      items: [{ id: paymentId, title, quantity: 1, unit_price: amount, currency_id: 'MXN' }],
      payer: email ? { email } : undefined,
      external_reference: paymentId,
      metadata: { payment_id: paymentId },
      back_urls: { success: back(lang === 'en' ? 'received' : 'recibido'), pending: back(lang === 'en' ? 'pending' : 'pendiente'), failure: back(lang === 'en' ? 'rejected' : 'rechazado') },
      auto_return: 'approved',
      notification_url: `${SITE_URL}/api/mp-webhook`,
      statement_descriptor: 'HIPICO RIVIERA MAYA',
      binary_mode: false,
    }),
  })
  if (!res.ok) throw new Error(`mercadopago ${res.status}`)
  const d = await res.json()
  return { id: d.id, url: d.init_point || d.sandbox_init_point }
}

/** A payment as Mercado Pago sees it: { id, status, external_reference, transaction_amount }. */
export async function fetchPayment(id, env = process.env, fetchFn = fetch) {
  const res = await fetchFn(`${API}/v1/payments/${id}`, { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } })
  if (!res.ok) throw new Error(`mercadopago ${res.status}`)
  return res.json()
}

/**
 * The notification's signature: x-signature "ts=…,v1=…" is an HMAC-SHA256 of "id:{data.id};request-id:{x-request-id};ts:{ts};"
 * with the webhook secret from the Mercado Pago panel.
 */
export function verifySignature({ signature, requestId, dataId, secret }) {
  if (!secret || !signature || !dataId) return false
  const parts = Object.fromEntries(String(signature).split(',').map((kv) => kv.trim().split('=').map((s) => s.trim())))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${String(dataId).toLowerCase()};${requestId ? `request-id:${requestId};` : ''}ts:${parts.ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(parts.v1))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** The same manifest, for tests and for the setup check. */
export const signFor = ({ dataId, requestId, ts, secret }) =>
  crypto.createHmac('sha256', secret).update(`id:${String(dataId).toLowerCase()};${requestId ? `request-id:${requestId};` : ''}ts:${ts};`).digest('hex')
