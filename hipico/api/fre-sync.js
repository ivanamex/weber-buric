// FreeRide's whole catalog in the shop, once a day (Vercel cron) and from Dirección → Tienda → Catálogo FreeRide
// ("Actualizar catálogo"). The copy itself lives in _fre.js (the production build runs it too). If FreeRide answers
// with an error, yesterday's catalog stays and the error is shown in the panel.
import { connect } from './_reminders.js'
import { fetchCatalog, saveCatalog, tally } from './_fre.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

/** The scheduler (CRON_SECRET, or Vercel's cron when no secret is set) or a signed-in management account. */
async function allowed(req, client) {
  const auth = String(req.headers.authorization || '')
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  if (!process.env.CRON_SECRET && /vercel-cron/i.test(String(req.headers['user-agent'] || ''))) return true
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } })
  if (!res.ok) return false
  const email = String((await res.json())?.email || '').toLowerCase()
  if (!email) return false
  const { rows } = await client.query('select exists (select 1 from admins where email = $1) as ok', [email])
  return Boolean(rows[0]?.ok)
}

export default async function handler(req, res) {
  let client
  try {
    client = await connect()
    if (!client) return res.status(503).json({ ok: false, code: 'network' })
    if (!(await allowed(req, client))) return res.status(401).json({ ok: false, code: 'notFound' })
    let rows
    try {
      rows = await fetchCatalog()
    } catch (err) {
      console.error('[fre-sync] FreeRide catalog failed', err.message)
      await client.query('update club_settings set fre_last_error = $1 where id = 1', [String(err.message).slice(0, 200)])
      return res.status(200).json({ ok: false, code: 'freDown', error: err.message })
    }
    await saveCatalog(client, rows)
    const sum = tally(rows)
    console.log('[fre-sync] copied', JSON.stringify(sum))
    return res.status(200).json({ ok: true, count: rows.length, unmapped: sum.unmapped })
  } catch (err) {
    console.error('[fre-sync] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
