// A FreeRide wish list from the website: saved first (send_wishlist() with the visitor's address for the rate limit),
// then emailed to the club with a one-tap WhatsApp reply. Without an email sender in Vercel it's still saved and shows
// in Dirección → Tienda → Listas.
import { connect, makeSender } from './_reminders.js'
import { CONTACT } from '../src/site/content.js'
import { waTo } from '../src/lib/phone.js'

const APP_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')
const money = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || null

/** One line of the list, as Mara reads it. */
export const wishLine = (l) => `${l.qty} × ${l.name}${l.color ? ` ${l.color}` : ''}${l.size ? `, talla ${l.size}` : ''} · ${money(l.unit * l.qty)}`

/** Subject and text of the email to the club. */
export function compose(f, r) {
  const first = String(f.name || '').trim().split(/\s+/)[0]
  const wa = waTo(f.phone, `Hola ${first}, te escribo por tu lista L-${r.number} de FreeRide. `)
  const lines = [
    `Lista L-${r.number}`,
    `Nombre: ${f.name}`,
    `WhatsApp: ${f.phone || '—'}`,
    `Correo: ${f.email || '—'}`,
    f.note ? `Nota: ${f.note}` : null,
    '',
    ...(r.items || []).map((l) => `${wishLine(l)}${l.url ? `\n   ${l.url}` : ''}`),
    '',
    `Total aproximado: ${money(r.total)}`,
    '',
    wa ? `Responder por WhatsApp: ${wa}` : null,
    `Ver en la app: ${APP_URL}/app/direccion/tienda?vista=listas`,
  ].filter((l) => l != null)
  return { subject: `Lista de deseos L-${r.number} · ${f.name}`, text: lines.join('\n') }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) return res.status(400).json({ ok: false, code: 'missing' })
  const str = (k, max) => String(body[k] ?? '').slice(0, max)
  const fields = {
    items: body.items.slice(0, 30).map((l) => ({ fre: String(l?.fre || ''), color: String(l?.color || ''), size: String(l?.size || ''), qty: Number(l?.qty) || 1 })),
    name: str('name', 120), phone: str('phone', 40), email: str('email', 160), note: str('note', 1000), lang: str('lang', 2), website: str('website', 200),
  }
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query('select send_wishlist($1::jsonb) as r', [JSON.stringify({ ...fields, ip: clientIp(req) })])
    const r = rows[0]?.r || { ok: false, code: 'network' }
    if (!r.ok || r.bot) return res.status(200).json(r.bot ? { ok: true, bot: true } : r)
    let emailed = false
    const send = await makeSender()
    if (send) {
      try {
        await send({ to: process.env.CONTACT_EMAIL || CONTACT.email, replyTo: fields.email || undefined, ...compose(fields, r) })
        emailed = true
      } catch (err) {
        console.error('[wishlist] email failed', err.message)
      }
    }
    return res.status(200).json({ ok: true, id: r.id, number: r.number, total: r.total, items: r.items, emailed })
  } catch (err) {
    console.error('[wishlist] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
