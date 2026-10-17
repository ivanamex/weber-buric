// "Pagar" in the website's shop: the order is placed in the database (the stock taken in one go, the family found by
// email or created), then the buyer gets an email with what they ordered and how to pay, and the club a notice.
// Without an email sender the order still works (it waits in Dirección → Tienda and in Cobros).
import { connect, makeSender } from './_reminders.js'
import { CONTACT } from '../src/site/content.js'

const APP_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')
const CLUB = 'Hípico Riviera Maya'
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || null
const lineText = (l) => `  ${l.name} ${l.color} · talla ${l.size}${l.qty > 1 ? ` ×${l.qty}` : ''} · ${money(l.unit * l.qty)}${l.onOrder ? ' (bajo pedido)' : ''}${l.url ? ` · ${l.url}` : ''}`

/** The buyer's email: the lines, what is paid today and how to pay by transfer. */
export function orderEmail({ name, number, items, total, amount, bank }) {
  const first = String(name || '').split(/\s+/)[0]
  const clabe = bank?.clabe ? String(bank.clabe).replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : null
  const ordered = items.some((l) => l.onOrder)
  return {
    subject: `Tu pedido #${number} de la tienda del ${CLUB}`,
    text: [
      `Hola ${first}:`, '',
      `Apartamos tu pedido #${number}:`,
      ...items.map(lineText),
      `Total: ${money(total)}${ordered ? ` · hoy pagas ${money(amount)} (anticipo del 50% de lo que se pide) y el resto al recogerlo` : ''}.`,
      '',
      bank?.clabe ? 'Para pagar por transferencia:' : null,
      bank?.bankName ? `  Banco: ${bank.bankName}` : null,
      bank?.accountHolder ? `  Titular: ${bank.accountHolder}` : null,
      clabe ? `  CLABE: ${clabe}` : null,
      bank?.clabe ? `  Concepto: Pedido ${number}` : null,
      `Sube tu comprobante o sigue tu pedido en la app con este correo: ${APP_URL}/app/familia/tienda`,
      'Lo recoges en el club, en Paamul. Te avisamos por WhatsApp cuando esté listo.',
      '',
      `Gracias,\n${CLUB}`,
    ].filter((l) => l != null).join('\n'),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) return res.status(400).json({ ok: false, code: 'missing' })
  const fields = Object.fromEntries(['name', 'phone', 'email', 'lang', 'website'].filter((k) => body[k] != null).map((k) => [k, String(body[k]).slice(0, 200)]))
  fields.items = body.items.slice(0, 20).map((l) => (l?.fre
    ? { fre: String(l.fre).slice(0, 120), color: String(l.color || '').slice(0, 60), size: String(l.size || '').slice(0, 20), qty: Number(l.qty) || 1 }
    : { product: String(l?.product || '').slice(0, 80), size: String(l?.size || '').slice(0, 12), qty: Number(l?.qty) || 1 }))
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query('select shop_order($1::jsonb) as r', [JSON.stringify({ ...fields, ip: clientIp(req) })])
    const r = rows[0]?.r || { ok: false, code: 'network' }
    if (!r.ok || r.bot) return res.status(200).json(r)
    const send = await makeSender()
    if (send) {
      const [{ rows: orow }, { rows: brow }] = await Promise.all([
        client.query('select number, items, total from shop_orders where id = $1', [r.order]),
        client.query('select bank_name, account_holder, clabe from club_settings where id = 1'),
      ])
      const o = orow[0]
      const b = brow[0] || {}
      try {
        await send({ to: fields.email, ...orderEmail({ name: fields.name, number: o.number, items: o.items, total: o.total, amount: r.amount,
          bank: { bankName: b.bank_name, accountHolder: b.account_holder, clabe: b.clabe } }) })
        await send({ to: process.env.CONTACT_EMAIL || CONTACT.email, replyTo: fields.email, subject: `Nuevo pedido #${o.number} · ${fields.name}`,
          text: [`${fields.name} · ${fields.phone} · ${fields.email}`, '', ...o.items.map(lineText), `Total: ${money(o.total)} · hoy: ${money(r.amount)}`, '', `${APP_URL}/app/direccion/tienda`].join('\n') })
      } catch (err) {
        console.error('[shop] email failed', err.message)
      }
    }
    return res.status(200).json(r)
  } catch (err) {
    console.error('[shop] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
