// Choosing and paying on the website. Live: the serverless function creates the family, the rider, the plan or class
// and the charge (and emails the family); if it's unreachable the browser calls the database function itself. The
// receipt goes to the receipts bucket under web/<charge>/ and is attached with submit_web_receipt(). Card payments
// go through /api/mp-checkout (`lib/card.js`; hidden while the club's Mercado Pago keys aren't in Vercel). Without a database
// (local build) everything lands in the demo's data, so /demo → Dirección → Cobros shows it.
const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
const LIVE_CONFIGURED = Boolean(URL && KEY)

const CODES = new Set(['missing', 'badEmail', 'badPhone', 'badPlan', 'tooMany', 'network', 'pendingExists', 'accountBlocked', 'notFound', 'fileTooBig', 'fileType', 'uploadFailed', 'alreadyPaid', 'cardOff'])
const clean = (r) => (r && typeof r === 'object' && typeof r.ok === 'boolean' ? (r.ok ? { ...r } : { ok: false, code: CODES.has(r.code) ? r.code : 'network' }) : null)
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function post(url, body, extra = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(String(res.status))
  return clean(await res.json())
}

/** fields: { option, rider: { name, age }, contact, phone, email, start, lang, website } → { ok, payment_id, amount, family_name, … }. */
export async function enroll(fields) {
  if (!LIVE_CONFIGURED) {
    const { webEnroll } = await import('../data/demo.js')
    return webEnroll(fields)
  }
  try {
    const r = await post('/api/enroll', fields)
    if (r) return r
  } catch (err) {
    console.error('[enroll] function unavailable', err.message)
  }
  try {
    return (await post(`${URL}/rest/v1/rpc/web_enroll`, { p: fields }, headers)) || { ok: false, code: 'network' }
  } catch (err) {
    console.error('[enroll] failed', err.message)
    return { ok: false, code: 'network' }
  }
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' }
export const RECEIPT_MAX = 10 * 1024 * 1024
const typeOf = (file) => file.type || ({ heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[file.name.split('.').pop().toLowerCase()] || '')

/** The transfer receipt for a website charge → "Por revisar" in Cobros. */
export async function sendReceipt(paymentId, file) {
  if (!file || file.size > RECEIPT_MAX) return { ok: false, code: 'fileTooBig' }
  const type = typeOf(file)
  if (!EXT[type]) return { ok: false, code: 'fileType' }
  if (!LIVE_CONFIGURED) {
    const { webReceipt } = await import('../data/demo.js')
    return webReceipt(paymentId, file)
  }
  const path = `web/${paymentId}/${Date.now()}.${EXT[type]}`
  try {
    const up = await fetch(`${URL}/storage/v1/object/receipts/${path}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': type, 'x-upsert': 'false' }, body: file })
    if (!up.ok) { console.error('[enroll] upload failed', up.status); return { ok: false, code: 'uploadFailed' } }
    return (await post(`${URL}/rest/v1/rpc/submit_web_receipt`, { p_payment: paymentId, p_path: path }, headers)) || { ok: false, code: 'network' }
  } catch (err) {
    console.error('[enroll] receipt failed', err.message)
    return { ok: false, code: 'uploadFailed' }
  }
}

/** "Apartar mi lugar": the visitor will pay at the club; the charge shows "Paga en el club" in Cobros. */
export async function payAtClubWeb(paymentId) {
  if (!LIVE_CONFIGURED) {
    const { webPayAtClub } = await import('../data/demo.js')
    return webPayAtClub(paymentId)
  }
  try {
    return (await post(`${URL}/rest/v1/rpc/web_pay_at_club`, { p_payment: paymentId }, headers)) || { ok: false, code: 'network' }
  } catch (err) {
    console.error('[enroll] pay at club failed', err.message)
    return { ok: false, code: 'network' }
  }
}

export { cardEnabled, cardCheckout } from '../lib/card.js'
