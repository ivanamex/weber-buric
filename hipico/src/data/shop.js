// The shop's rules, shared by the website, the family app, the panel and the demo (the database applies the same ones
// in shop_order()): prices, stock, "bajo pedido" lines with a 50 % deposit, stickers, colors grouped by model.

export const CATEGORIES = ['pants', 'shirts', 'jackets', 'accessories']
/** The category in the address: ?cat=camisas / ?cat=shirts. */
export const CATEGORY_SLUGS = {
  es: { pants: 'pantalones', shirts: 'camisas', jackets: 'chamarras', accessories: 'accesorios' },
  en: { pants: 'breeches', shirts: 'shirts', jackets: 'jackets', accessories: 'accessories' },
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
/** The colors of a FreeRide product, and the sizes of one color with whether FreeRide has them. */
export const freColors = (item) => (item.colors?.length ? item.colors : [''])
export const freSizes = (item, color) => (item.variants || []).filter((v) => (v.color || '') === (color || '')).map((v) => ({ size: v.size, available: Boolean(v.available) }))
/** A FreeRide item as the shop's parts show a product (photo, name, color). */
export const freAsProduct = (item, color) => ({ slug: `${FRE_PREFIX}${item.handle}`, name: item.title, colorName: color || '', colorHex: '#FFFFFF', category: item.category, photos: item.images || [] })

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
export const orderLine = (l) => `${(l.name || '').replace(/^(Pantalón|Camisa) /, '')} ${l.color || ''} · ${l.size}${l.qty > 1 ? ` ×${l.qty}` : ''}`.replace(/\s+/g, ' ').trim()

const URL = typeof __SUPABASE_URL__ === 'undefined' ? '' : __SUPABASE_URL__
/** A product photo: a site file (/img/shop/…), a data URL (demo uploads) or a path in the shop-photos bucket. */
export const shopPhoto = (path) => (!path ? null : /^(\/|https?:|data:|blob:)/.test(path) ? path : `${URL}/storage/v1/object/public/shop-photos/${path.split('/').map(encodeURIComponent).join('/')}`)
