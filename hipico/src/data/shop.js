// The shop's rules, shared by the website, the family app, the panel and the demo (the database applies the same ones
// in shop_order()): prices, stock, "bajo pedido" lines with a 50 % deposit, stickers, colors grouped by model.

export const CATEGORIES = ['pants', 'shirts', 'jackets', 'accessories', 'horse'] // horse: only shown when it has products
/** The category in the address: ?cat=camisas / ?cat=shirts. */
export const CATEGORY_SLUGS = {
  es: { pants: 'pantalones', shirts: 'camisas', jackets: 'chamarras', accessories: 'accesorios', horse: 'caballo' },
  en: { pants: 'breeches', shirts: 'shirts', jackets: 'jackets', accessories: 'accessories', horse: 'horse' },
}
export const categoryFromSlug = (slug) => {
  for (const l of ['es', 'en']) {
    const hit = Object.entries(CATEGORY_SLUGS[l]).find(([, v]) => v === slug)
    if (hit) return hit[0]
  }
  return null
}
export const STICKERS = ['none', 'inauguracion', 'promo', 'nuevo']
export const STICKER_COLOR = { inauguracion: 'mustard', promo: 'terracotta', nuevo: 'slate', ultimas: 'plum', agotado: 'grey' }
export const ORDER_STATUSES = ['nuevo', 'apartado', 'pagado', 'pedido_a_fre', 'listo', 'entregado', 'cancelado']
export const SIZE_CHIPS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
export const KID_SIZES = ['8', '10', '12']
export const ORDER_MAX = 3 // pieces of one size that can be ordered from FreeRide in one go
// FreeRide shows its size chart on each product page, above "Add to cart".
export const SIZE_GUIDE = {
  pants: 'https://shopfre.com/collections/lux-breeches-2/products/celestial-lux-breeches-sand',
  jackets: 'https://shopfre.com',
  shirts: 'https://shopfre.com/collections/competition-tops/products/cassidy-show-shirt-peach',
  accessories: 'https://shopfre.com',
  horse: 'https://shopfre.com',
}
export const FRE_CATALOG = 'https://shopfre.com'

/** Stock as the catalog gives it: a number (3 or fewer) or "ok" (more). */
export const stockNum = (v) => (v?.stock === 'ok' ? 99 : Number(v?.stock) || 0)
export const listPrice = (p, v) => (v?.price ?? p.price)
export const unitPrice = (p, v) => (v?.price ?? p.promoPrice ?? p.price)
export const totalStock = (p) => (p.variants || []).reduce((n, v) => n + stockNum(v), 0)
export const onOrder = (p, v) => stockNum(v) === 0 && Boolean(p.takesOrders)
export const sizeOpen = (p, v) => stockNum(v) > 0 || Boolean(p.takesOrders)
export const maxQty = (p, v) => (stockNum(v) > 0 ? Math.min(stockNum(v), 10) : p.takesOrders ? ORDER_MAX : 0)
export const soldOut = (p) => totalStock(p) === 0 && !p.takesOrders

/** The stickers a card shows: the one Mara chose, then "Últimas piezas" (2 or fewer left); "Agotado" replaces both. */
export function stickersOf(p) {
  if (soldOut(p)) return ['agotado']
  const out = []
  if (p.sticker && p.sticker !== 'none') out.push(p.sticker)
  if (!p.takesOrders && totalStock(p) <= 2) out.push('ultimas')
  return out
}

/** One card per model on "Todo": its colors, the one with the most stock first. */
export function byModel(products) {
  const groups = new Map()
  for (const p of products) {
    const k = p.model || p.slug
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(p)
  }
  return [...groups.values()].map((colors) => {
    const first = [...colors].sort((a, b) => totalStock(b) - totalStock(a) || (a.sort ?? 0) - (b.sort ?? 0))[0]
    return { key: first.model || first.slug, colors, first }
  })
}
export const siblingsOf = (products, p) => products.filter((x) => (x.model || x.slug) === (p.model || p.slug))

/* ───────── Who it's for, sizes and colors (the shop's three filter menus) ───────── */
export const AUDIENCES = ['women', 'men', 'kids'] // "all" items (belts, socks, the horse's things) show under each
export const PARA_SLUGS = { es: { women: 'mujer', men: 'hombre', kids: 'ninos' }, en: { women: 'women', men: 'men', kids: 'kids' } }
export const paraFromSlug = (slug) => {
  for (const l of ['es', 'en']) { const hit = Object.entries(PARA_SLUGS[l]).find(([, v]) => v === slug); if (hit) return hit[0] }
  return null
}
export const audienceOfProduct = (p) => p.audience || 'women'
export const forAudience = (aud, para) => !para || aud === para || aud === 'all'
export const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
// Waist sizes (FreeRide's breeches) as letters, for the Talla filter.
const WAIST = { 22: 'XXS', 24: 'XS', 26: 'S', 28: 'M', 30: 'L', 32: 'XL', 34: 'XXL', 36: 'XXXL' }
/** A size as the filter knows it: "34 (S)" → S, "2X" / "2XL" → XXL, "13-14 (24)" → 13-14, waist 26 → S. */
export function sizeKey(size) {
  let x = String(size || '').trim().toUpperCase()
  const paren = x.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (paren) x = /^(\d?X+[SL]?|[SML])$/.test(paren[2].trim()) ? paren[2].trim() : paren[1].trim()
  return ({ '2X': 'XXL', '2XL': 'XXL', '3X': 'XXXL', '3XL': 'XXXL', '4XL': 'XXXXL' })[x] || WAIST[x] || x
}
/** "26 (S)" → "26 · S" on a size pill. */
export const sizeLabel = (size) => String(size || '').replace(/^(\d{2})\s*\(([^)]+)\)$/, '$1 · $2')
const HORSE_SIZES = ['PONY', 'COB', 'FULL', 'WARMBLOOD', 'ONE SIZE']
/** Sizes in order: letters, then kids' 2T, 3T… 2-3, 4-5… 8, 10…, waist 22…36, then the horse's Pony · Cob · Full. */
export const sortSizes = (list) => [...new Set(list)].sort((a, b) => {
  const n = (x) => { const h = HORSE_SIZES.indexOf(String(x).toUpperCase()); if (h >= 0) return 1000 + h; const m = String(x).match(/\d+/); return m ? Number(m[0]) : 999 }
  const li = (x) => LETTER_SIZES.indexOf(x)
  if (li(a) >= 0 || li(b) >= 0) return (li(a) < 0 ? 99 : li(a)) - (li(b) < 0 ? 99 : li(b))
  return n(a) - n(b) || String(a).localeCompare(String(b))
})
// A swatch for a color name FreeRide gives (Mara's products have their own hex).
const COLOR_WORDS = [
  ['navy', '#1F2A44'], ['black', '#222222'], ['white', '#F7F5F0'], ['ivory', '#F1EAD8'], ['cream', '#EFE6D3'], ['charcoal', '#3A3A3A'],
  ['grey', '#9A9A9A'], ['gray', '#9A9A9A'], ['silver', '#C8C8C8'], ['beige', '#D8C3A0'], ['sand', '#D8C3A0'], ['tan', '#C9A57A'],
  ['camel', '#B8865B'], ['brown', '#6B4A2E'], ['chocolate', '#4E3423'], ['tweed', '#7A5E43'], ['pink', '#E8A3B5'], ['blush', '#EBC2C0'],
  ['raspberry', '#B3385E'], ['coral', '#E8826A'], ['peach', '#F2B49B'], ['tangerine', '#F08A4B'], ['orange', '#D9822B'],
  ['red', '#B03A2E'], ['burgundy', '#6B2737'], ['merlot', '#6B2737'], ['wine', '#6B2737'], ['plum', '#6E3A5E'], ['purple', '#6E4A7E'],
  ['lilac', '#C3A8D1'], ['lavender', '#B7A6D3'], ['periwinkle', '#8E9BD6'], ['mauve', '#B08A9E'], ['yellow', '#E8C547'], ['mustard', '#D9A441'],
  ['olive', '#6B6B3A'], ['sage', '#8A8E75'], ['mint', '#A8D5BA'], ['hunter', '#2F4A3A'], ['forest', '#2F4A3A'], ['green', '#3E7A55'],
  ['teal', '#2F6B6B'], ['turquoise', '#3FB0AC'], ['ocean', '#2E6E8E'], ['marine', '#24476B'], ['steel', '#3E5873'], ['blue', '#3E6BA8'],
]
export function colorHexFor(name) {
  const s = String(name || '').toLowerCase()
  return (COLOR_WORDS.find(([w]) => s.includes(w)) || [null, '#D5C7AD'])[1]
}

/* ───────── FreeRide's catalog (always "sobre pedido") ───────── */
export const FRE_PREFIX = 'fre:'
export const isFre = (slug) => String(slug || '').startsWith(FRE_PREFIX)
export const FRE_DEFAULTS = { factor: 23.7, discount: 5 }
const to50 = (n) => Math.round(n / 50) * 50
/** Pesos, as fre_price() in SQL: USD × factor to the nearest $50; Mara's discount on top, except on FreeRide's own sales. */
export function frePrice(usd, compare, factor = FRE_DEFAULTS.factor, discount = FRE_DEFAULTS.discount) {
  const mxn = to50(Number(usd) * Number(factor))
  if (Number(compare) > Number(usd)) return { unit: mxn, list: to50(Number(compare) * Number(factor)), sale: true }
  return { unit: to50(mxn * (1 - Number(discount) / 100)), list: mxn, sale: false }
}
/** A photo shot on white (no blurred backdrop behind it in the shop): the outer 3-pixel frame of a ~48 px copy is at
 *  least 92 % near-white pixels (every channel ≥ 238). data: raw pixels, `channels` per pixel (3 RGB or 4 RGBA, drawn
 *  over white first so transparency counts as white). */
export function whiteFrame(data, width, height, channels = 4, frame = 3) {
  let white = 0
  let all = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= frame && x < width - frame && y >= frame && y < height - frame) continue
      const i = (y * width + x) * channels
      all++
      if (data[i] >= 238 && data[i + 1] >= 238 && data[i + 2] >= 238) white++
    }
  }
  return all > 0 && white / all >= 0.92
}
/** A photo's background as the shop keeps it: 'white' | 'photo' ('' = not known yet, shown as 'photo'). */
export const PHOTO_BG = ['white', 'photo']

/** FreeRide's options besides color and size, in the order the product window shows them (above Talla). */
export const EXTRA_KEYS = ['grip', 'length', 'sleeve', 'pockets', 'style']
const OPT_WORDS = { 'full seat': 'fullSeat', 'knee patch': 'kneePatch', 'cell phone': 'cellPhone', petite: 'petite', regular: 'regular', tall: 'tall', long: 'long', short: 'short', sleeveless: 'sleeveless' }
/** One option value as the shop says it ("Knee Patch" → "Rodilla"); FreeRide's own words otherwise. */
export const optText = (t, v) => { const k = OPT_WORDS[String(v || '').trim().toLowerCase()]; return k && typeof t === 'function' ? t(`shop.optv.${k}`) : String(v || '') }
/** A variant's (or a line's) extra options, in order: { grip: 'Knee Patch', length: 'Regular' } → ['Knee Patch', 'Regular']. */
export const extraList = (extra) => EXTRA_KEYS.filter((k) => extra?.[k]).map((k) => extra[k])
const fits = (v, extra) => Object.entries(extra || {}).every(([k, x]) => !x || !v.extra?.[k] || v.extra[k] === x)
/** The colors of a FreeRide product, and the sizes of one color (and chosen options) with whether FreeRide has them. */
export const freColors = (item) => (item.colors?.length ? item.colors : [''])
export function freSizes(item, color, extra) {
  const out = new Map()
  for (const v of item.variants || []) {
    if ((v.color || '') !== (color || '') || !fits(v, extra)) continue
    out.set(v.size, Boolean(out.get(v.size)) || Boolean(v.available))
  }
  const order = item.sizes || []
  return [...out].map(([size, available]) => ({ size, available }))
    .sort((a, b) => (order.indexOf(a.size) < 0 ? 999 : order.indexOf(a.size)) - (order.indexOf(b.size) < 0 ? 999 : order.indexOf(b.size)))
}
/** The extra options one color has: [{ key, values: [{ value, available }] }], in the window's order. */
export function freExtras(item, color) {
  const vs = (item.variants || []).filter((v) => (v.color || '') === (color || ''))
  const listed = item.extras?.length ? item.extras : EXTRA_KEYS.map((key) => ({ key, values: [...new Set(vs.map((v) => v.extra?.[key]).filter(Boolean))] }))
  return listed.map(({ key, values }) => ({
    key, values: values.filter((x) => vs.some((v) => v.extra?.[key] === x)).map((value) => ({ value, available: vs.some((v) => v.extra?.[key] === value && v.available) })),
  })).filter((x) => x.values.length)
}
/** What's chosen, completed: every option the color has keeps the picked value while FreeRide has it in this color,
 *  else takes the first one FreeRide has. */
export function freChosen(item, color, picked = {}) {
  const vs = (item.variants || []).filter((v) => (v.color || '') === (color || ''))
  const out = {}
  for (const { key, values } of freExtras(item, color)) {
    const ok = (x) => vs.some((v) => v.available && v.extra?.[key] === x && fits(v, out))
    out[key] = values.some((x) => x.value === picked[key] && ok(x.value)) ? picked[key] : (values.find((x) => ok(x.value)) || values[0]).value
  }
  return out
}
/** The photos of a FreeRide product with the chosen color's first: { photos, photosBg, mine } (mine: how many are that
 *  color's; photosBg: each photo's background, in the same order). */
export function frePhotos(item, color) {
  const all = item.images || []
  const bg = item.imagesBg || []
  const own = [...new Set((item.variants || []).filter((v) => (v.color || '') === (color || '') && Number.isInteger(v.image) && all[v.image]).map((v) => v.image))].sort((a, b) => a - b)
  if (!own.length) return { photos: all, photosBg: bg, mine: all.length }
  const order = [...own, ...all.map((_, i) => i).filter((i) => !own.includes(i))]
  return { photos: order.map((i) => all[i]), photosBg: order.map((i) => bg[i] || ''), mine: own.length }
}
/** A FreeRide item as the shop's parts show a product (photo, name, color). */
export const freAsProduct = (item, color) => ({ slug: `${FRE_PREFIX}${item.handle}`, name: item.title, colorName: color || '', colorHex: '#FFFFFF', category: item.category, photos: item.images || [], photosBg: item.imagesBg || [] })

/** A cart line, resolved against the catalog: { slug, size, qty } → with its product, price and whether it's ordered. */
export function resolveLine(products, line) {
  // A FreeRide line carries what it showed when it was added (the order recomputes the price).
  if (isFre(line.slug)) {
    const snap = line.snap || {}
    return { ...line, product: { slug: line.slug, name: snap.name || '', colorName: line.color || '', colorHex: '#FFFFFF', category: snap.category, photos: snap.photo ? [snap.photo] : [] },
      variant: { size: line.size, stock: 0 }, onOrder: true, gone: false, unit: snap.unit || 0, list: snap.list || snap.unit || 0, max: ORDER_MAX, fre: true }
  }
  const product = products.find((p) => p.slug === line.slug)
  const variant = product?.variants?.find((v) => v.size === line.size)
  if (!product || !variant) return { ...line, missing: true }
  const order = onOrder(product, variant)
  const gone = !order && stockNum(variant) < line.qty
  return { ...line, product, variant, onOrder: order, gone, unit: unitPrice(product, variant), list: listPrice(product, variant), max: maxQty(product, variant) }
}

/** What the cart costs: the subtotal, the saving against the list price, and today's part (50 % of ordered lines). */
export function cartTotals(lines) {
  let subtotal = 0; let list = 0; let later = 0; let count = 0
  for (const l of lines) {
    if (l.missing) continue
    subtotal += l.unit * l.qty
    list += l.list * l.qty
    count += l.qty
    if (l.onOrder) later += l.unit * l.qty
  }
  const now = subtotal - later + Math.ceil(later / 2)
  return { subtotal, saving: Math.max(0, list - subtotal), now, rest: subtotal - now, hasOrder: later > 0, count }
}

/* ───────── The wish list (FreeRide pieces: chosen here, priced by Mara) ───────── */
/** A list line → "1 × Define Breeches · Sage · Rodilla · Regular · 26 (S)" (t: the page's translator, for the options). */
export const wishText = (l, t) => `${l.qty} × ${[l.name, l.color, ...extraList(l.extra).map((v) => optText(t, v)), l.size].filter(Boolean).join(' · ')}`
export const wishTotal = (lines) => lines.reduce((a, l) => a + (Number(l.unit) || 0) * (Number(l.qty) || 0), 0)
export const WISH_STATUSES = ['nueva', 'cotizada', 'convertida', 'cerrada']
export const newWishlists = (s) => (s.shopWishlists || []).filter((w) => w.status === 'nueva')

/** How the family reads an order's status. */
export const familyStatus = (st) => ({ nuevo: 'apartado', apartado: 'apartado', pagado: 'pagado' }[st] || st)
/** The panel's filters. */
export const ORDER_FILTERS = {
  nuevos: (o) => ['nuevo', 'apartado', 'pagado'].includes(o.status),
  proceso: (o) => o.status === 'pedido_a_fre',
  listos: (o) => o.status === 'listo',
  entregados: (o) => o.status === 'entregado',
  todos: () => true,
}
export const newOrders = (s) => (s.shopOrders || []).filter(ORDER_FILTERS.nuevos)
/** The step after this one, for the panel's one button. */
export function nextStatus(o) {
  if (['nuevo', 'apartado', 'pagado'].includes(o.status)) return (o.items || []).some((l) => l.onOrder) ? 'pedido_a_fre' : 'listo'
  if (o.status === 'pedido_a_fre') return 'listo'
  if (o.status === 'listo') return 'entregado'
  return null
}
export const orderLine = (l, t) => `${(l.name || '').replace(/^(Pantalón|Camisa) /, '')} ${l.color || ''}${extraList(l.extra).map((v) => ` · ${optText(t, v)}`).join('')} · ${l.size}${l.qty > 1 ? ` ×${l.qty}` : ''}`.replace(/\s+/g, ' ').trim()

const URL = typeof __SUPABASE_URL__ === 'undefined' ? '' : __SUPABASE_URL__
/** A product photo: a site file (/img/shop/…), a data URL (demo uploads) or a path in the shop-photos bucket. */
export const shopPhoto = (path) => (!path ? null : /^(\/|https?:|data:|blob:)/.test(path) ? path : `${URL}/storage/v1/object/public/shop-photos/${path.split('/').map(encodeURIComponent).join('/')}`)
