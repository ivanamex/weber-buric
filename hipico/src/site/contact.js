// Sending the website's contact form. Live: the serverless function saves it and emails the club; if that
// function is unreachable the message still goes straight to the database. Without a database (local demo)
// it goes into the demo's own data, so /demo → Dirección → Mensajes shows it.
const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
const LIVE_CONFIGURED = Boolean(URL && KEY)

const CODES = new Set(['missing', 'contactRequired', 'badEmail', 'badPhone', 'tooMany', 'network'])
const clean = (r) => (r && typeof r === 'object' && typeof r.ok === 'boolean' ? (r.ok ? { ok: true } : { ok: false, code: CODES.has(r.code) ? r.code : 'network' }) : null)

async function viaFunction(fields) {
  const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
  if (!res.ok) throw new Error(String(res.status))
  return clean(await res.json())
}

async function viaDatabase(fields) {
  const res = await fetch(`${URL}/rest/v1/rpc/send_contact_message`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p: fields }),
  })
  if (!res.ok) throw new Error(String(res.status))
  return clean(await res.json())
}

/** fields: { name, phone, email, channel, service, message, page, lang, website } → { ok } or { ok: false, code }. */
export async function sendContactMessage(fields) {
  if (!LIVE_CONFIGURED) {
    const { addContactMessage } = await import('../data/demo.js')
    return addContactMessage(fields)
  }
  try {
    const r = await viaFunction(fields)
    if (r) return r
  } catch (err) {
    console.error('[contact] function unavailable', err.message)
  }
  try {
    return (await viaDatabase(fields)) || { ok: false, code: 'network' }
  } catch (err) {
    console.error('[contact] send failed', err.message)
    return { ok: false, code: 'network' }
  }
}
