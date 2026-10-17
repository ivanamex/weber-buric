// Mercado Pago tells us what happened to a card payment. The signature is checked, the payment is read back from
// Mercado Pago's own API (never trusted from the notification), and the charge is updated once: the same
// notification twice changes nothing. Approved → paid by card, the plan activates, the family gets a confirmation.
import { connect, makeSender } from './_reminders.js'
import { fetchPayment, mpEnabled, verifySignature, SITE_URL } from './_mp.js'
import { titleFor } from './mp-checkout.js'

const CLUB = 'Hípico Riviera Maya'
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

/** The email to the family once a card payment is approved. */
export function confirmation(p) {
  const first = String(p.contact || '').split(/\s+/)[0]
  return {
    subject: `Pago recibido: ${titleFor(p)}`,
    text: [
      `Hola ${first}:`, '',
      `Recibimos tu pago con tarjeta de ${money(p.amount)} por ${titleFor(p)}. ¡Gracias!`,
      p.service === 'plan' ? 'Tu plan ya está activo: confirma tus clases desde la app.'
        : p.service === 'shop' ? 'Te avisamos por WhatsApp cuando tu pedido esté listo para recoger en el club.' : 'El club te escribe para acordar el día y la hora.',
      `Entra a la app con este correo: ${SITE_URL}/app`, '',
      `Gracias,\n${CLUB}`,
    ].join('\n'),
  }
}

/**
 * Record what Mercado Pago says about a charge (once: the same answer twice changes nothing) and, when it has just
 * become paid, email the family. Shared by the notification and the card form's own payment call.
 */
export async function settle(client, paymentId, mp) {
  const { rows } = await client.query('select card_payment_result($1, $2, $3) as r', [paymentId, String(mp.id), String(mp.status || '')])
  const r = rows[0]?.r || {}
  if (r.ok && r.changed && r.status === 'paid') {
    const send = await makeSender()
    if (send) {
      const { rows: prow } = await client.query(
        `select p.service, p.amount, p.meta, f.email, f.contact, r.name as rider_name from payments p join families f on f.id = p.family_id
           left join riders r on r.id::text = p.meta ->> 'riderId' where p.id = $1`, [paymentId])
      const p = prow[0]
      if (p?.email) {
        try { await send({ to: p.email, ...confirmation({ ...p, riderName: p.rider_name }) }) } catch (err) { console.error('[mp] email failed', err.message) }
      }
    }
  }
  return r
}

const dataIdOf = (req, body) => String(req.query?.['data.id'] || req.query?.id || body?.data?.id || '')
const topicOf = (req, body) => String(req.query?.type || req.query?.topic || body?.type || body?.action || '')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  const dataId = dataIdOf(req, body)
  const topic = topicOf(req, body)
  if (!topic.startsWith('payment')) return res.status(200).json({ ok: true, ignored: true }) // merchant orders etc.
  if (!mpEnabled() || !process.env.MP_WEBHOOK_SECRET) return res.status(503).json({ ok: false })
  if (!verifySignature({ signature: req.headers['x-signature'], requestId: req.headers['x-request-id'], dataId, secret: process.env.MP_WEBHOOK_SECRET })) {
    return res.status(401).json({ ok: false })
  }
  let client
  try {
    const mp = await fetchPayment(dataId)
    const paymentId = String(mp.external_reference || mp.metadata?.payment_id || '')
    if (!paymentId) return res.status(200).json({ ok: true, ignored: true })
    client = await connect()
    if (!client) return res.status(503).json({ ok: false })
    const r = await settle(client, paymentId, mp)
    return res.status(200).json({ ok: true, ...r })
  } catch (err) {
    console.error('[mp-webhook] failed', err)
    return res.status(500).json({ ok: false })
  } finally {
    await client?.end().catch(() => {})
  }
}
