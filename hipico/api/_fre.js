// FreeRide's catalog, shared by the daily function (api/fre-sync.js) and the production build (scripts/fre-sync.mjs).
// Their store runs on Shopify, so the catalog is public JSON (shopfre.com/products.json, 250 a page). A copy upserts
// every product into fre_catalog; products that disappear are marked inactive, never deleted.
import { sizeKey, sortSizes, colorHexFor, EXTRA_KEYS } from '../src/data/shop.js'

const STORE = 'https://shopfre.com'
const MAX_PAGES = 20
// Raise it when the rules below change: the next deploy copies the catalog again with them.
export const FRE_RULES = 5

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

// Who a product is for: women | men | kids | all. Kids' words win (a "Boy's" shirt filed under Men is for kids), then
// men's, then women's; belts, socks, gloves, hats and the horse's things are for everyone; nothing said = women.
const KIDS_RE = /\b(girl'?s?|girls'|boy'?s?|boys'|young riders?|kids?|kid's|children'?s?|child|youth|junior|toddler)\b/
const MEN_RE = /\b(men'?s?|mens'|man's|gentleman)\b/
const WOMEN_RE = /\b(women'?s?|womens'|ladies|lady's)\b/
const ALL_RE = /\b(belts?|socks?|gloves?|hats?|caps?|beanies?|neck (cover|gaiter)s?|gift ?cards?|bags?|stickers?|bridles?|saddle ?pads?|saddles?|bonnets?)\b/
export function audienceOf(p, category) {
  if (category === 'horse') return 'all'
  const both = [p.product_type, p.title].map((x) => String(x || '').toLowerCase())
  if (both.some((x) => KIDS_RE.test(x))) return 'kids'
  if (both.some((x) => MEN_RE.test(x))) return 'men'
  if (both.some((x) => WOMEN_RE.test(x))) return 'women'
  if (ALL_RE.test(both.join(' '))) return 'all'
  const tags = tagText(p).toLowerCase()
  if (KIDS_RE.test(tags)) return 'kids'
  if (MEN_RE.test(tags)) return 'men'
  return 'women'
}

const uniq = (list) => [...new Set(list.filter(Boolean))]
const image = (src) => (src ? `${src}${src.includes('?') ? '&' : '?'}width=800` : null)
const MAX_IMAGES = 40

// A product's options (up to 3: Color, Size and e.g. Grip / Length / Sleeve) are read by what each value looks like, not
// by its position: FreeRide's variants don't always keep them in the same slot, and some pack two in one value
// ("Full Seat / 26", "26 Petite"). The option's name only decides what can't be told from the value.
const LETTER = 'XXXXL|XXXL|XXL|XL|XXS|XS|S|M|L|[2-5]XL?'
const SIZE_RE = new RegExp(`^(?:(?:${LETTER})(?:\\s*/\\s*(?:${LETTER}))?|\\d{1,2}T|\\d{1,2}\\s*-\\s*\\d{1,2}|\\d{1,2}(?:\\.5)?|one ?size|os|o/s|pony|cob|full|oversized?|warmblood|small|medium|large|x-?large)(?:\\s*\\([^)]*\\))?$`, 'i')
const GRIP_RE = /^(full[ -]?seat|knee[ -]?patch|knee[ -]?grip|full[ -]?grip|knee|seat)( grip)?$/i
const SLEEVE_RE = /^((long|short|3\/4|cap)[ -]?sleeves?|sleeveless)$/i
const LENGTH_RE = /^(petite|regular|tall|standard)( length| inseam)?$/i
const LONG_SHORT_RE = /^(long|short)$/i

const titleCase = (v) => v.replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (c) => c.toUpperCase())
const LETTERS_RE = new RegExp(`^(?:${LETTER})(?:\\s*/\\s*(?:${LETTER}))?$`, 'i')
const cleanSize = (v) => {
  const x = v.replace(/\s+/g, ' ').trim()
  if (/^(one ?size|os|o\/s)$/i.test(x)) return 'One Size'
  if (LETTERS_RE.test(x)) return x.toUpperCase().replace(/\s+/g, '')
  return titleCase(x).replace(/^(\d+)t$/i, '$1T').replace(/\(([^)]*)\)/, (_, a) => `(${a.toUpperCase()})`)
}
const canonical = (key, v) => {
  const x = v.toLowerCase()
  if (key === 'grip') return /knee/.test(x) ? 'Knee Patch' : /full|seat/.test(x) ? 'Full Seat' : titleCase(v)
  if (key === 'length') return /petite/.test(x) ? 'Petite' : /tall/.test(x) ? 'Tall' : 'Regular'
  if (key === 'sleeve') return /sleeveless/.test(x) ? 'Sleeveless' : /long/.test(x) ? 'Long' : /short/.test(x) ? 'Short' : titleCase(v)
  if (key === 'size') return cleanSize(v)
  return titleCase(v)
}

/** What one option value is (color | size | grip | length | sleeve | style), or null when it can't be told. */
function kindOf(v, name, category) {
  const n = String(name || '').toLowerCase()
  if (SIZE_RE.test(v)) return 'size'
  if (GRIP_RE.test(v)) return 'grip'
  if (SLEEVE_RE.test(v)) return 'sleeve'
  if (LENGTH_RE.test(v)) return 'length'
  if (LONG_SHORT_RE.test(v)) return /sleeve/.test(n) || (!/length|inseam/.test(n) && ['shirts', 'jackets'].includes(category)) ? 'sleeve' : 'length'
  if (/colou?r/.test(n)) return 'color'
  if (/grip|seat/.test(n)) return 'grip'
  if (/length|inseam/.test(n)) return 'length'
  if (/sleeve/.test(n)) return 'sleeve'
  if (/style|fit/.test(n)) return 'style'
  return null
}

/** Split a value holding two options ("Full Seat / 26", "26 Petite", "Knee Patch-28") when both halves can be told. */
function partsOf(v, name, category) {
  if (kindOf(v, '', category)) return [v]
  const tries = [/^(.+?)\s+\/\s+(.+)$/, /^(.*[a-z])\s*-\s*(\d.*)$/i, /^(.+?)\s+(-\s+)?(\d{1,2}(?:\s*\([^)]*\))?)$/, /^(\S+)\s+(petite|regular|tall|long|short)$/i]
  for (const re of tries) {
    const m = v.match(re)
    if (!m) continue
    const a = m[1].trim(); const b = m[m.length - 1].trim()
    if (kindOf(a, '', category) && kindOf(b, '', category)) return [a, b]
  }
  return [v]
}

/** One Shopify variant → { color, size, extra: { grip?, length?, sleeve?, style? }, available, image } (image: index in images). */
function variantOf(v, p, category, imageIndex) {
  const out = { color: '', size: '', extra: {}, available: Boolean(v.available), image: null }
  const loose = []
  ;(p.options || []).forEach((o, i) => {
    const raw = String(v[`option${i + 1}`] ?? '').trim()
    if (!raw || /^default title$/i.test(raw)) return
    for (const part of partsOf(raw, o.name, category)) {
      const kind = kindOf(part, o.name, category)
      if (!kind) { loose.push([part, o.name]); continue }
      const val = canonical(kind, part)
      if (kind === 'color') out.color = out.color ? `${out.color} ${val}` : val
      else if (kind === 'size') out.size = !out.size ? val : /^\d/.test(val) && !/^\d/.test(out.size) ? `${val} (${out.size})` : /^\d/.test(out.size) && !/^\d/.test(val) ? `${out.size} (${val})` : `${out.size} ${val}`
      else out.extra[kind] = out.extra[kind] ? `${out.extra[kind]} ${val}` : val
    }
  })
  // Whatever couldn't be told: a color word is the color when there's none yet, anything else is a style.
  for (const [part, name] of loose) {
    if (!out.color && (/size|talla/i.test(String(name || '')) ? colorHexFor(part) !== colorHexFor('') : true)) out.color = titleCase(part)
    else out.extra.style = out.extra.style ? `${out.extra.style} · ${titleCase(part)}` : titleCase(part)
  }
  const src = v.featured_image?.src || (p.images || []).find((im) => (im.variant_ids || []).includes(v.id))?.src
  if (src) { const at = imageIndex.get(image(src)); if (at != null) out.image = at }
  return out
}

const EXTRA_ORDER = { grip: ['Full Seat', 'Knee Patch'], length: ['Regular', 'Petite', 'Tall'], sleeve: ['Long', 'Short', 'Sleeveless'] }
const byKnown = (key) => (a, b) => {
  const o = EXTRA_ORDER[key] || []
  const ia = o.indexOf(a); const ib = o.indexOf(b)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
}

/** One Shopify product → one fre_catalog row. */
export function toRow(p, position) {
  const { category, mapped } = categoryOf(p)
  const images = uniq((p.images || []).map((im) => image(im.src))).slice(0, MAX_IMAGES)
  const imageIndex = new Map(images.map((src, i) => [src, i]))
  const variants = (p.variants || []).map((v) => variantOf(v, p, category, imageIndex))
  const extras = EXTRA_KEYS.map((key) => ({ key, values: uniq(variants.map((v) => v.extra[key])).sort(byKnown(key)) })).filter((x) => x.values.length)
  const prices = (p.variants || []).map((v) => Number(v.price)).filter((n) => n > 0)
  const price = prices.length ? Math.min(...prices) : 0
  const cheapest = (p.variants || []).find((v) => Number(v.price) === price)
  const compare = cheapest && Number(cheapest.compare_at_price) > price ? Number(cheapest.compare_at_price) : null
  return {
    handle: String(p.handle),
    title: String(p.title || '').trim(),
    type: String(p.product_type || '').trim(),
    tags: Array.isArray(p.tags) ? p.tags.map(String) : String(p.tags || '').split(',').map((x) => x.trim()).filter(Boolean),
    category, mapped,
    kids: kidsOf(p),
    audience: audienceOf(p, category),
    size_keys: uniq(variants.filter((v) => v.available).map((v) => sizeKey(v.size))),
    colors: uniq(variants.map((v) => v.color)),
    sizes: sortSizes(uniq(variants.map((v) => v.size))),
    extras,
    variants,
    price_usd: price,
    compare_usd: compare,
    images,
    url: `${STORE}/products/${p.handle}`,
    position,
    // FreeRide's own words, a few variants of them, so a product that reads oddly can be checked against the source.
    raw: {
      options: (p.options || []).map((o) => ({ name: o.name, values: (o.values || []).slice(0, 12) })),
      variants: (p.variants || []).slice(0, 3).map((v) => ({ option1: v.option1, option2: v.option2, option3: v.option3, image: Boolean(v.featured_image) })),
    },
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
        `insert into fre_catalog (handle, title, type, tags, category, mapped, kids, colors, sizes, variants, price_usd, compare_usd, images, url, position, audience, size_keys, extras, raw, active, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb, true, now())
         on conflict (handle) do update set title = excluded.title, type = excluded.type, tags = excluded.tags, category = excluded.category,
           mapped = excluded.mapped, kids = excluded.kids, colors = excluded.colors, sizes = excluded.sizes, variants = excluded.variants,
           price_usd = excluded.price_usd, compare_usd = excluded.compare_usd, images = excluded.images, url = excluded.url,
           position = excluded.position, audience = excluded.audience, size_keys = excluded.size_keys, extras = excluded.extras, raw = excluded.raw, active = true, updated_at = now()`,
        [r.handle, r.title, r.type, r.tags, r.category, r.mapped, r.kids, r.colors, r.sizes, JSON.stringify(r.variants), r.price_usd, r.compare_usd, r.images, r.url, r.position, r.audience, r.size_keys, JSON.stringify(r.extras), JSON.stringify(r.raw)])
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
  const out = { total: rows.length, unmapped: 0, audience: {}, extras: {} }
  for (const r of rows) {
    for (const x of r.extras || []) if (x.values.length > 1) out.extras[x.key] = (out.extras[x.key] || 0) + 1
    out[r.category] = (out[r.category] || 0) + 1
    out.audience[r.audience] = (out.audience[r.audience] || 0) + 1
    if (!r.mapped) out.unmapped++
  }
  return out
}
