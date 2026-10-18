// Copies FreeRide's catalog during the production build, right after the database updates, when the copy is empty,
// older than 20 hours or made with older category rules. It never fails a deploy: if FreeRide or the database can't
// be reached, it logs why and the build goes on (the daily copy and the panel's button stay).
import { connect } from '../api/_reminders.js'
import { fetchCatalog, saveCatalog, tally, knownBackgrounds, readBackgrounds, FRE_RULES } from '../api/_fre.js'

const log = (msg) => console.log(`[fre-sync] ${msg}`)
const env = process.env

async function main() {
  if (env.VERCEL_ENV !== 'production' && env.MIGRATE !== '1') { log('skipped (only production builds)'); return }
  const client = await connect().catch((err) => { log(`database not reachable: ${err.message}`); return null })
  if (!client) { log('skipped (no database)'); return }
  try {
    const { rows } = await client.query(`select (select count(*) from fre_catalog where active)::int as n,
      coalesce(extract(epoch from now() - fre_last_sync) / 3600, 1e6) as hours, coalesce(fre_rules, 0) as rules from club_settings where id = 1`)
    const st = rows[0] || { n: 0, hours: 1e6, rules: 0 }
    if (st.n > 0 && st.hours < 20 && st.rules >= FRE_RULES) { log(`fresh (${st.n} products, ${Math.round(st.hours)} h old)`); return }
    const stop = new AbortController()
    const timer = setTimeout(() => stop.abort(), 90000)
    let list
    try {
      list = await fetchCatalog(fetch, { signal: stop.signal })
    } catch (err) {
      log(`FreeRide not reachable, the build goes on: ${err.message}`)
      await client.query('update club_settings set fre_last_error = $1 where id = 1', [String(err.message).slice(0, 200)]).catch(() => {})
      return
    } finally {
      clearTimeout(timer)
    }
    // Which photos are on white: up to 2 minutes here (the daily copy reads whatever is left).
    const bg = await readBackgrounds(list, { known: await knownBackgrounds(client), budgetMs: 120000 })
    await saveCatalog(client, list)
    const sum = tally(list)
    log(`photos: ${JSON.stringify(sum.photos)} · read ${bg.read}, ${bg.left} left for the next copy`)
    log(`copied ${sum.total} products · pants ${sum.pants || 0} · shirts ${sum.shirts || 0} · jackets ${sum.jackets || 0} · accessories ${sum.accessories || 0} · horse ${sum.horse || 0} · unclear ${sum.unmapped} · for ${JSON.stringify(sum.audience)}`)
    const unclear = list.filter((r) => !r.mapped).map((r) => `${r.type || '—'}: ${r.title}`)
    if (unclear.length) log(`unclear: ${unclear.slice(0, 40).join(' | ')}`)
  } finally {
    await client.end().catch(() => {})
  }
}

try { await main() } catch (err) { log(`failed, the build goes on: ${err.message}`) }
