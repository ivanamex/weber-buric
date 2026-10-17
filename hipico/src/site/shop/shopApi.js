// The shop on the website: the catalog from the database's public_shop() (nothing personal), orders through the
// serverless function (it adds the visitor's address for the rate limit and sends the emails) or straight to the
// database function if that's unreachable. Without a database (a local build) everything lands in the demo's data,
// so /demo → Dirección → Tienda shows it.
import { useEffect, useState } from 'react'

const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
const LIVE_CONFIGURED = Boolean(URL && KEY)
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const CODES = new Set(['missing', 'badEmail', 'badPhone', 'tooMany', 'network', 'accountBlocked', 'notFound', 'emptyCart', 'out_of_stock'])

let cache = null
let pending = null
const listeners = new Set()

async function fromDatabase() {
  const res = await fetch(`${URL}/rest/v1/rpc/public_shop`, { method: 'POST', headers, body: '{}' })
  if (!res.ok) throw new Error(String(res.status))
  const d = await res.json()
  return { on: d?.on !== false, products: d?.products || [] }
}
async function fromDemo() {
  const { demoShop } = await import('../../data/demo.js')
  return demoShop()
}

export function loadShop(force = false) {
  if (cache && !force) return Promise.resolve(cache)
  if (!pending || force) {
    pending = (LIVE_CONFIGURED ? fromDatabase() : fromDemo())
      .then((d) => { cache = d; listeners.forEach((l) => l(d)); return d })
      .catch((err) => { console.error('[shop] catalog failed', err.message); pending = null; return cache || { on: true, products: [], failed: true } })
  }
  return pending
}

/** The catalog: null while loading, then { on, products }. Reloads after an order (stock changed). */
export function useShop() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    let on = true
    const l = (d) => { if (on) setData(d) }
    listeners.add(l)
    if (!cache) loadShop().then(l)
    return () => { on = false; listeners.delete(l) }
  }, [])
  return data
}

const clean = (r) => (r && typeof r === 'object' && typeof r.ok === 'boolean' ? (r.ok ? { ...r } : { ok: false, code: CODES.has(r.code) ? r.code : 'network', line: r.line }) : null)
async function post(url, body, extra = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(String(res.status))
  return clean(await res.json())
}

/** fields: { items: [{ product, size, qty }], name, phone, email, lang, website } → { ok, order, number, payment_id, amount } */
export async function placeOrder(fields) {
  let r
  if (!LIVE_CONFIGURED) {
    const { webShopOrder } = await import('../../data/demo.js')
    r = webShopOrder(fields)
  } else {
    try { r = await post('/api/shop-order', fields) } catch (err) { console.error('[shop] function unavailable', err.message) }
    if (!r) {
      try { r = (await post(`${URL}/rest/v1/rpc/shop_order`, { p: fields }, headers)) || { ok: false, code: 'network' } } catch (err) {
        console.error('[shop] order failed', err.message)
        r = { ok: false, code: 'network' }
      }
    }
  }
  if (r.ok || r.code === 'out_of_stock') loadShop(true)
  return r
}

/* ───────── The cart: kept in this browser (works without storage too) ───────── */
const CART_KEY = 'hipico.cart'
let cart = (() => { try { const v = JSON.parse(localStorage.getItem(CART_KEY)); return Array.isArray(v) ? v.filter((l) => l?.slug && l?.size) : [] } catch { return [] } })()
const cartListeners = new Set()
const saveCart = (next) => {
  cart = next
  try { localStorage.setItem(CART_KEY, JSON.stringify(next)) } catch { /* private mode: keep in memory */ }
  cartListeners.forEach((l) => l(next))
}
// A line is one product, size and color (FreeRide items have several colors under one product).
const same = (l, slug, size, color) => l.slug === slug && l.size === size && (l.color || '') === (color || '')
export const cartApi = {
  /** extra: { color, snap } — a FreeRide line keeps what it showed (name, photo, price) for the cart. */
  add(slug, size, qty, max, extra = {}) {
    const at = cart.findIndex((l) => same(l, slug, size, extra.color))
    if (at >= 0) saveCart(cart.map((l, i) => (i === at ? { ...l, ...extra, qty: Math.min(max || 10, l.qty + qty) } : l)))
    else saveCart([...cart, { slug, size, qty, ...extra }])
  },
  set(slug, size, qty, color) { saveCart(cart.map((l) => (same(l, slug, size, color) ? { ...l, qty } : l))) },
  remove(slug, size, color) { saveCart(cart.filter((l) => !same(l, slug, size, color))) },
  clear() { saveCart([]) },
}
/** The cart's lines as the order takes them. */
export const orderItems = (lines) => lines.map((l) => (l.fre
  ? { fre: l.slug.slice(4), color: l.color || '', size: l.size, qty: l.qty, unit: l.unit, list: l.list, name: l.product?.name, photo: l.snap?.photo || null, url: l.snap?.url || null }
  : { product: l.slug, size: l.size, qty: l.qty }))

/* ───────── FreeRide's whole catalog (a daily copy kept by the club's server), a page at a time ───────── */
/** params: { offset, limit, category, size, color, kids, handle } → { total, items, categories, colors, kids, factor, discount } */
export async function fetchFre(params = {}) {
  if (!LIVE_CONFIGURED) { const { demoFre } = await import('../../data/demo.js'); return demoFre(params) }
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/public_fre_catalog`, { method: 'POST', headers, body: JSON.stringify({ p: params }) })
    if (!res.ok) throw new Error(String(res.status))
    const d = await res.json()
    return { total: d?.total || 0, items: d?.items || [], categories: d?.categories || {}, colors: d?.colors || [], kids: d?.kids || [], factor: d?.factor, discount: d?.discount }
  } catch (err) {
    console.error('[shop] FreeRide catalog failed', err.message)
    return { total: 0, items: [], categories: {}, colors: [], kids: [], failed: true }
  }
}
export function useCart() {
  const [c, setC] = useState(cart)
  useEffect(() => { cartListeners.add(setC); setC(cart); return () => cartListeners.delete(setC) }, [])
  return c
}
/** The cart drawer opens from anywhere (the bag in the bar, "Agregar al carrito"). */
const openListeners = new Set()
export const openCart = () => openListeners.forEach((l) => l())
export function useCartOpener(fn) {
  useEffect(() => { openListeners.add(fn); return () => openListeners.delete(fn) }, [fn])
}

export const SHOP_DEMO = !LIVE_CONFIGURED
