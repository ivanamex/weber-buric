// Daily payment reminders: the database picks what to send (and logs it), this sends the emails.
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const APP_URL = (process.env.APP_URL || 'https://hipico-riviera-maya.vercel.app').replace(/\/$/, '')
const CLUB = 'Hípico Riviera Maya'

const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
const day = (key) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00Z`))
const monthName = (key) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', month: 'long' }).format(new Date(`${key}-01T12:00:00Z`))
const CLASS_KIND = { trial: 'clase muestra', single: 'clase suelta', extra: 'clase adicional', upgrade: 'cambio de plan' }

/** "tu pensión de Relámpago (noviembre)", "el plan mensual de Nico" … */
export function concept(r) {
  const who = r.detail ? ` de ${r.detail}` : ''
  if (r.service === 'plan') return r.classKind === 'upgrade' ? `el cambio de plan${who}` : `el plan mensual${who}`
  if (r.service === 'boarding') return `la pensión${who}${r.month ? ` (${monthName(r.month)})` : ''}`
  if (r.service === 'class') return `la ${CLASS_KIND[r.classKind] || 'clase'}${who}`
  if (r.service === 'rental') return 'la renta de caballo'
  if (r.service === 'camp') return `el campamento${who}`
  return `el evento${who}`
}

/** Subject and text of one reminder, in Spanish (the club's language). */
export function message(r) {
  const first = String(r.contact || r.family || '').split(' ')[0]
  const what = concept(r)
  const amount = money(r.amount)
  const when = day(String(r.dueOn).slice(0, 10))
  const subject = {
    before: `Recordatorio: ${what} vence el ${when}`,
    due: `Hoy vence ${what}`,
    after: `Pago pendiente: ${what}`,
    weekly: `Pago pendiente: ${what}`,
  }[r.kind]
  const line = {
    before: `Te recordamos que ${what} por ${amount} vence el ${when}.`,
    due: `Hoy vence ${what} por ${amount}.`,
    after: `${what[0].toUpperCase()}${what.slice(1)} por ${amount} venció el ${when} y sigue pendiente.`,
    weekly: `${what[0].toUpperCase()}${what.slice(1)} por ${amount} venció el ${when} y sigue pendiente.`,
  }[r.kind]
  const text = [
    `Hola ${first}:`,
    '',
    line,
    `Puedes pagar por transferencia y subir tu comprobante en la app: ${APP_URL}/app/familia/plan`,
    'O paga en el club en tu próxima visita.',
    r.note ? `\n${r.note}` : '',
    '',
    `Gracias,\n${CLUB}`,
    '',
    'Si ya pagaste, ignora este mensaje.',
  ].join('\n')
  return { subject, text }
}

/** The email sender configured in Vercel: Resend (RESEND_API_KEY + REMINDER_FROM) or SMTP (SMTP_USER + SMTP_PASS, Gmail by default). */
export async function makeSender(env = process.env) {
  if (env.RESEND_API_KEY && env.REMINDER_FROM) {
    return async ({ to, subject, text }) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.REMINDER_FROM, to: [to], subject, text }),
      })
      if (!res.ok) throw new Error(`resend ${res.status}`)
    }
  }
  if (env.SMTP_USER && env.SMTP_PASS) {
    const { default: nodemailer } = await import('nodemailer')
    const port = Number(env.SMTP_PORT || 465)
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
    const from = env.REMINDER_FROM || `"${CLUB}" <${env.SMTP_USER}>`
    return async ({ to, subject, text }) => { await transport.sendMail({ from, to, subject, text }) }
  }
  return null
}

/** Open the database with the same TLS rules as the migrations (Supabase's root certificate). */
export async function connect(env = process.env) {
  const raw = env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL || env.DATABASE_URL
  if (!raw) return null
  const url = new URL(raw)
  url.searchParams.delete('sslmode')
  url.searchParams.delete('supa')
  const ssl = env.MIGRATE_NO_SSL === '1'
    ? false
    : { ca: fs.readFileSync(path.join(process.cwd(), 'scripts', 'supabase-ca.crt'), 'utf8'), rejectUnauthorized: true }
  const client = new pg.Client({ connectionString: url.toString(), ssl, connectionTimeoutMillis: 15000 })
  await client.connect()
  return client
}

/** One run: pick today's reminders, email each one, record what happened. */
export async function runReminders(client, send) {
  const { rows } = await client.query('select reminders_due() as r')
  const summary = { total: rows.length, sent: 0, failed: 0, noEmail: 0, noAddress: 0 }
  for (const { r } of rows) {
    let status
    if (!send) status = 'no_email'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email || '')) status = 'no_address'
    else {
      try {
        await send({ to: r.email, ...message(r) })
        status = 'sent'
      } catch (err) {
        console.error('[reminders] email failed', r.id, err.message)
        status = 'failed'
      }
    }
    await client.query('select reminder_mark($1, $2)', [r.id, status])
    summary[{ sent: 'sent', failed: 'failed', no_email: 'noEmail', no_address: 'noAddress' }[status]]++
  }
  await client.query('select reminders_finish($1)', [Boolean(send)])
  return summary
}
