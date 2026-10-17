// FreeRide's whole catalog in the shop. Their store runs on Shopify, so the catalog is public JSON
// (shopfre.com/products.json, 250 a page). Once a day (Vercel cron) and from Dirección → Tienda → Catálogo FreeRide
// ("Actualizar catálogo") it is copied into fre_catalog: products that disappear are marked inactive, never deleted,
// and if FreeRide answers with an error yesterday's catalog stays and the error is shown in the panel.
import { connect } from './_reminders.js'

const STORE = 'https://shopfre.com'
const MAX_PAGES = 20
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// FreeRide's product types and tags → the shop's categories. The first rule that matches wins.
const RULES = [
  ['jackets', /\b(jacket|vest|coat|outerwear|hoodie|pullover|sweater|parka|gilet|quarter zip|1\/4 zip)/],
  ['pants', /\b(breech|legging|tight|jodhpur|pant|riding pants)/],
  ['shirts', /\b(shirt|top|polo|tee|t-shirt|blouse|base ?layer|sun shirt|show shirt|tank)/],
  ['accessories', /\b(belt|sock|glove|hat|cap|visor|bra|bag|headband|scrunchie|accessor|gift card|stock tie|hair)/],
]

export function categoryOf(p) {
  const text = `${p.product_type || ''} ${(Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).join(' ')} ${p.title || ''}`.toLowerCase()
  for (const [cat, re] of RULES) if (re.test(text)) return { category: cat, mapped: true }
  return { category: 'accessories', mapped: false }
}

export function kidsOf(p) {
  const text = `${p.title || ''} ${p.product_type || ''} ${(Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).join(' ')}`.toLowerCase()
  if (/\b(boy'?s?)\b/.test(text)) return 'boy'
  if (/\b(child(ren)?'?s?|kid'?s?|youth|girl'?s?|junior)\b/.test(text)) return 'girl'
  return null
}

const optionIndex = (p, re) => (p.options || []).findIndex((o) => re.test(String(o.name || '').toLowerCase()))
const uniq = (list) => [...new Set(list.filter(Boolean))]
const image = (src) => (src ? `${src}${src.includes('?') ? '&' : '?'}width=800` : null)

/** One Shopify product → one fre_catalog row. */
export function toRow(p, position) {
  const ci = optionIndex(p, /colou?r/)
  const si = optionIndex(p, /size|talla/)
  const opt = (v, i) => (i >= 0 ? String(v[`option${i + 1}`] || '').trim() : '')
  const variants = (p.variants || []).map((v) => ({ color: opt(v, ci), size: opt(v, si), available: Boolean(v.available) }))
  const prices = (p.variants || []).map((v) => Number(v.price)).filter((n) => n > 0)
  const price = prices.length ? Math.min(...prices) : 0
  const cheapest = (p.variants || []).find((v) => Number(v.price) === price)
  const compare = cheapest && Number(cheapest.compare_at_price) > price ? Number(cheapest.compare_at_price) : null
  const { category, mapped } = categoryOf(p)
  return {
    handle: String(p.handle),
    title: String(p.title || '').trim(),
    type: String(p.product_type || '').trim(),
    tags: Array.isArray(p.tags) ? p.tags.map(String) : String(p.tags || '').split(',').map((x) => x.trim()).filter(Boolean),
    category, mapped,
    kids: kidsOf(p),
    colors: uniq(variants.map((v) => v.color)),
    sizes: uniq(variants.map((v) => v.size)),
    variants,
    price_usd: price,
    compare_usd: compare,
    images: (p.images || []).map((im) => image(im.src)).filter(Boolean).slice(0, 8),
    url: `${STORE}/products/${p.handle}`,
    position,
  }
}

/** Every page of the catalog; throws when FreeRide doesn't answer properly (the old catalog then stays). */
export async function fetchCatalog(fetchImpl = fetch) {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchImpl(`${STORE}/products.json?limit=250&page=${page}`, { headers: { Accept: 'application/json', 'User-Agent': 'HipicoRivieraMaya/1.0' } })
    if (!res.ok) throw new Error(`FreeRide answered ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data?.products)) throw new Error('FreeRide sent something unexpected')
    if (!data.products.length) break
    all.push(...data.products.filter((p) => p.handle && p.title))
  }
  if (!all.length) throw new Error('FreeRide sent an empty catalog')
  return all.map((p, i) => toRow(p, i))
}

/** Upsert the rows; whatever wasn't in this copy becomes inactive. */
export async function saveCatalog(client, rows) {
  await client.query('begin')
  try {
    for (const r of rows) {
      await client.query(
        `insert into fre_catalog (handle, title, type, tags, category, mapped, kids, colors, sizes, variants, price_usd, compare_usd, images, url, position, active, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, true, now())
         on conflict (handle) do update set title = excluded.title, type = excluded.type, tags = excluded.tags, category = excluded.category,
           mapped = excluded.mapped, kids = excluded.kids, colors = excluded.colors, sizes = excluded.sizes, variants = excluded.variants,
           price_usd = excluded.price_usd, compare_usd = excluded.compare_usd, images = excluded.images, url = excluded.url,
           position = excluded.position, active = true, updated_at = now()`,
        [r.handle, r.title, r.type, r.tags, r.category, r.mapped, r.kids, r.colors, r.sizes, JSON.stringify(r.variants), r.price_usd, r.compare_usd, r.images, r.url, r.position])
    }
    await client.query('update fre_catalog set active = false, updated_at = now() where active and not (handle = any($1))', [rows.map((r) => r.handle)])
    await client.query('update club_settings set fre_last_sync = now(), fre_last_count = $1, fre_last_error = null where id = 1', [rows.length])
    await client.query('commit')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  }
}

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
    return res.status(200).json({ ok: true, count: rows.length, unmapped: rows.filter((r) => !r.mapped).length })
  } catch (err) {
    console.error('[fre-sync] failed', err)
    return res.status(500).json({ ok: false, code: 'network' })
  } finally {
    await client?.end().catch(() => {})
  }
}
