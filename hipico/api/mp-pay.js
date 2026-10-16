// The card form inside the page: POST { paymentId, card } with the one-time token Mercado Pago's form gave the
// browser. The payment is created here with the club's private key, for the charge's own amount, and recorded at once
// (the notification later finds it already done). Answers { ok, status: approved | in_process | pending | rejected }.
import { connect } from './_reminders.js'
import { createPayment, mpEnabled } from './_mp.js'
import { titleFor } from './mp-checkout.js'
import { settle } from './mp-webhook.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STR = (v, n = 120) => (typeof v === 'string' ? v.slice(0, n) : '')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  if (!mpEnabled()) return res.status(200).json({ ok: false, code: 'cardOff' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  const paymentId = String(body?.paymentId || '')
  const card = body?.card || {}
  const token = STR(card.token, 200)
  const method = STR(card.payment_method_id, 40)
  if (!UUID.test(paymentId)) return res.status(400).json({ ok: false, code: 'notFound' })
  if (!token || !method) return res.status(400).json({ ok: false, code: 'cardInvalid' })
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query(
      `select p.id, p.service, p.amount, p.status, p.meta, f.email, r.name as rider_name
         from payments p join families f on f.id = p.family_id
         left join riders r on r.id::text = p.meta ->> 'riderId'
        where p.id = $1`, [paymentId])
    const p = rows[0]
    if (!p) return res.status(404).json({ ok: false, code: 'notFound' })
    if (p.status !== 'pending') return res.status(200).json({ ok: false, code: 'alreadyPaid' })
    if (!(p.amount > 0)) return res.status(200).json({ ok: false, code: 'notFound' })
    const id = card.payer?.identification
    const payer = {
      email: STR(card.payer?.email, 160) || p.email,
      ...(id?.type && id?.number ? { identification: { type: STR(id.type, 20), number: STR(id.number, 30) } } : {}),
    }
    const mp = await createPayment({
      paymentId, title: titleFor({ ...p, riderName: p.rider_name }), amount: Number(p.amount), token,
      installments: card.installments, paymentMethodId: method, issuerId: card.issuer_id ? String(card.issuer_id) : null, payer,
    })
    if (mp.id) await settle(client, paymentId, mp)
    const status = ['approved', 'in_process', 'pending', 'authorized'].includes(mp.status) ? (mp.status === 'authorized' ? 'in_process' : mp.status) : 'rejected'
    return res.status(200).json({ ok: true, status, detail: STR(mp.status_detail, 80) })
  } catch (err) {
    console.error('[mp-pay] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
