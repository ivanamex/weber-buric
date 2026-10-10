// The website's contact form: the message is saved in the database first, then emailed to the club with a
// one-tap WhatsApp reply. Without an email sender in Vercel the message is still saved and shows in Mensajes.
import { connect, makeSender } from './_reminders.js'
import { CONTACT } from '../src/site/content.js'
import { waTo } from '../src/lib/phone.js'
import es from '../src/i18n/es.json' with { type: 'json' }

const APP_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')
const CLUB = 'Hípico Riviera Maya'
const FIELDS = ['name', 'phone', 'email', 'channel', 'service', 'message', 'page', 'lang', 'website']

/** The service in Spanish (the club's language), whatever language the visitor wrote in. */
export const serviceName = (key) => es.site.sheet[key]?.title || es.messages.general

/** Subject and text of the email to the club. */
export function compose(m) {
  const first = String(m.name || '').trim().split(/\s+/)[0]
  const service = serviceName(m.service)
  const wa = waTo(m.phone, `Hola ${first}, gracias por escribirnos. Soy del ${CLUB}. `)
  const lines = [
    `Nombre: ${m.name}`,
    `Teléfono (WhatsApp): ${m.phone || '—'}`,
    `Correo: ${m.email || '—'}`,
    `Prefiere: ${m.channel === 'email' ? 'correo' : 'WhatsApp'}`,
    `Servicio: ${service}`,
    `Página: ${m.page || '/'}${m.lang === 'en' ? ' (en inglés)' : ''}`,
    '',
    'Mensaje:',
    m.message || '—',
    '',
    wa ? `Responder por WhatsApp: ${wa}` : null,
    m.email ? `Responder por correo: mailto:${m.email}` : null,
    `Ver en la app: ${APP_URL}/app/direccion/mensajes`,
  ].filter((l) => l != null)
  return { subject: `Nuevo mensaje · ${service} · ${m.name}`, text: lines.join('\n') }
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || null

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, code: 'missing' })
  const fields = Object.fromEntries(FIELDS.filter((k) => body[k] != null).map((k) => [k, String(body[k]).slice(0, 2000)]))
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query('select send_contact_message($1::jsonb) as r', [JSON.stringify({ ...fields, ip: clientIp(req) })])
    const r = rows[0]?.r || { ok: false, code: 'network' }
    if (!r.ok) return res.status(200).json(r)
    let emailed = false
    if (r.id) { // a saved message (not the honeypot) goes to the club's inbox
      const send = await makeSender()
      if (send) {
        try {
          await send({ to: process.env.CONTACT_EMAIL || CONTACT.email, replyTo: fields.email || undefined, ...compose(fields) })
          emailed = true
        } catch (err) {
          console.error('[contact] email failed', err.message)
        }
      }
    }
    return res.status(200).json({ ok: true, emailed })
  } catch (err) {
    console.error('[contact] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
