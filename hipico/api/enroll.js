// "Pagar" on the website: the family, the rider, the plan or class and its charge are created in the database,
// then the family gets an email with how to pay and how to enter the app. Without an email sender the
// enrolment still works (the charge waits in Cobros).
import { connect, makeSender } from './_reminders.js'
import es from '../src/i18n/es.json' with { type: 'json' }

const APP_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')
const CLUB = 'Hípico Riviera Maya'
const FIELDS = ['option', 'contact', 'phone', 'email', 'start', 'lang', 'website']
const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const day = (key) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00Z`))

export const optionName = (option) => (option === 'trial' || option === 'single' ? es.classKind[option] : es.plan.classesPlan.replace('{n}', option))

/** The invitation: what was chosen, how to pay, and that the app opens with this email. */
export function invitation({ contact, rider, option, amount, start, bank, familyName }) {
  const first = String(contact || '').split(/\s+/)[0]
  const what = `${optionName(option)} · ${rider}`
  const clabe = bank?.clabe ? String(bank.clabe).replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : null
  return {
    subject: `Tu lugar en el ${CLUB}: ${what}`,
    text: [
      `Hola ${first}:`, '',
      `Apartamos ${what} ${option === 'trial' || option === 'single' ? `para el ${day(start)}` : `a partir del ${day(start)}`} por ${money(amount)}.`,
      '',
      'Para pagar por transferencia:',
      bank?.bankName ? `  Banco: ${bank.bankName}` : null,
      bank?.accountHolder ? `  Titular: ${bank.accountHolder}` : null,
      clabe ? `  CLABE: ${clabe}` : null,
      `  Concepto: ${familyName}`,
      `Sube tu comprobante en la app y el club lo revisa: ${APP_URL}/app/familia/pagos`,
      '',
      `Entra a la app con este mismo correo (te llega un código de 6 dígitos): ${APP_URL}/app`,
      `Instálala en tu celular: ${APP_URL}/descargar`,
      '',
      `Gracias,\n${CLUB}`,
    ].filter((l) => l != null).join('\n'),
  }
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || null

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'network' })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, code: 'missing' })
  const fields = Object.fromEntries(FIELDS.filter((k) => body[k] != null).map((k) => [k, String(body[k]).slice(0, 200)]))
  fields.rider = { name: String(body.rider?.name || '').slice(0, 80), age: body.rider?.age == null || body.rider.age === '' ? null : String(body.rider.age).slice(0, 3) }
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    const { rows } = await client.query('select web_enroll($1::jsonb) as r', [JSON.stringify({ ...fields, ip: clientIp(req) })])
    const r = rows[0]?.r || { ok: false, code: 'network' }
    if (!r.ok || r.bot) return res.status(200).json(r)
    let emailed = false
    const send = await makeSender()
    if (send) {
      const { rows: brow } = await client.query('select bank_name, account_holder, clabe from club_settings where id = 1')
      const b = brow[0] || {}
      try {
        await send({ to: fields.email, ...invitation({ contact: fields.contact, rider: fields.rider.name, option: r.option, amount: r.amount, start: r.start,
          bank: { bankName: b.bank_name, accountHolder: b.account_holder, clabe: b.clabe }, familyName: r.family_name }) })
        emailed = true
      } catch (err) {
        console.error('[enroll] email failed', err.message)
      }
    }
    return res.status(200).json({ ...r, emailed })
  } catch (err) {
    console.error('[enroll] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
