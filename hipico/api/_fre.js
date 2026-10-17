// FreeRide's catalog, shared by the daily function (api/fre-sync.js) and the production build (scripts/fre-sync.mjs).
// Their store runs on Shopify, so the catalog is public JSON (shopfre.com/products.json, 250 a page). A copy upserts
// every product into fre_catalog; products that disappear are marked inactive, never deleted.

const STORE = 'https://shopfre.com'
const MAX_PAGES = 20
// Raise it when the rules below change: the next deploy copies the catalog again with them.
export const FRE_RULES = 3

// FreeRide's product types, titles and tags → the shop's categories. The product type decides first, then the title,
// then the tags; within each, the first rule that matches wins. "horse" = things for the horse (a "Para tu caballo"
// tab when there are 4 or more, otherwise shown under Accesorios).
const RULES = [
  ['horse', /\b(saddle ?pads?|half ?pads?|dressage pads?|jump(ing)? pads?|all ?purpose pads?|bonnets?|ear ?nets?|fly (veil|mask|bonnet|sheet)s?|ear (bonnet|hood)s?|bell boots?|polo wraps?|polos for horses|girths?|halters?|bridles?|saddles?|reins|nosebands?|martingales?|breastplates?|lead ropes?|horse boots?|tendon boots?|fleece wraps?|standing wraps?|coolers?|quarter sheets?|horse blankets?|saddle covers?|tack|for (your |the )?horses?|equine)\b/],
  ['jackets', /\b(jackets?|vests?|coats?|outerwear|hoodies?|pullovers?|sweaters?|sweatshirts?|parkas?|gilets?|fleece|windbreakers?|rain ?(jacket|shell)|soft ?shells?|quarter ?zips?|1\/4 ?zips?|half ?zips?|zip-?ups?|crewnecks?)\b/],
  ['pants', /\b(breech(es)?|leggings?|tights?|jodhpurs?|pants?|riding pants|shorts?|skorts?|joggers?)\b/],
  ['shirts', /\b(shirts?|tops?|polos?|tees?|t-shirts?|blouses?|base ?layers?|sun ?shirts?|show ?shirts?|tanks?|long ?sleeves?|henleys?|jerseys?|camis?)\b/],
  ['accessories', /\b(belts?|socks?|gloves?|hats?|caps?|visors?|bras?|sports bras?|bags?|totes?|backpacks?|wallets?|headbands?|scrunchies?|accessor(y|ies)|gift ?cards?|stock ties?|hair ?nets?|hair|bows?|earrings?|jewelry|necklaces?|bracelets?|keychains?|stickers?|magnets?|mugs?|tumblers?|bottles?|neck ?gaiters?|bandanas?|scarf|scarves|sunglasses|lanyards?|pins?|patches|charms?|masks?|underwear|thongs?|garment bags?|boot bags?|helmet bags?)\b/],
]
const tagText = (p) => (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).join(' ')

const match = (text) => {
  const s = String(text || '').toLowerCase()
  if (!s.trim()) return null
  for (const [cat, re] of RULES) if (re.test(s)) return cat
  return null
}

export function categoryOf(p) {
  const texts = [p.product_type, p.title, tagText(p)]
  for (let i = 0; i < texts.length; i++) {
    const cat = match(texts[i])
    if (!cat) continue
    // A broad "Accessories" type still sends a saddle pad or a bonnet to the horse's tab.
    if (cat === 'accessories' && texts.slice(i + 1).some((x) => match(x) === 'horse')) return { category: 'horse', mapped: true }
    return { category: cat, mapped: true }
  }
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
export async function fetchCatalog(fetchImpl = fetch, { signal } = {}) {
  const all = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchImpl(`${STORE}/products.json?limit=250&page=${page}`, { headers: { Accept: 'application/json', 'User-Agent': 'HipicoRivieraMaya/1.0' }, signal })
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
    await client.query('update club_settings set fre_last_sync = now(), fre_last_count = $1, fre_last_error = null, fre_rules = $2 where id = 1', [rows.length, FRE_RULES])
    await client.query('commit')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  }
}

/** How many per category (and unclear) in a copy, for the logs. */
export function tally(rows) {
  const out = { total: rows.length, unmapped: 0 }
  for (const r of rows) { out[r.category] = (out[r.category] || 0) + 1; if (!r.mapped) out.unmapped++ }
  return out
}
