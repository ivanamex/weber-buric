// The shop on the website: the catalog from the database's public_shop() (nothing personal), orders through the
// serverless function (it adds the visitor's address for the rate limit and sends the emails) or straight to the
// database function if that's unreachable. Without a database (a local build) everything lands in the demo's data,
// so /demo → Dirección → Tienda shows it.
import { useEffect, useState } from 'react'

const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
const LIVE_CONFIGURED = Boolean(URL && KEY)
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const CODES = new Set(['missing', 'badEmail', 'badPhone', 'tooMany', 'network', 'accountBlocked', 'notFound', 'emptyCart', 'out_of_stock', 'wishOnly'])

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

/* ───────── The cart (Mara's own pieces) and the wish list (FreeRide's), kept in this browser ───────── */
const CART_KEY = 'hipico.cart'
const WISH_KEY = 'hipico.wish'
const read = (key) => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : [] } catch { return [] } }
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* private mode: keep in memory */ } }
let cart = read(CART_KEY).filter((l) => l?.slug && l?.size)
let wish = read(WISH_KEY).filter((l) => l?.handle)
// Carts from before the wish list: their FreeRide lines move into the list.
if (cart.some((l) => String(l.slug).startsWith('fre:'))) {
  const moved = cart.filter((l) => String(l.slug).startsWith('fre:'))
    .map((l) => ({ handle: l.slug.slice(4), color: l.color || '', size: l.size, qty: l.qty, snap: { name: l.snap?.name, photo: l.snap?.photo, unit: l.snap?.unit, url: l.snap?.url, category: l.snap?.category } }))
  wish = [...wish, ...moved.filter((m) => !wish.some((w) => w.handle === m.handle && w.color === m.color && w.size === m.size))]
  cart = cart.filter((l) => !String(l.slug).startsWith('fre:'))
  write(CART_KEY, cart)
  write(WISH_KEY, wish)
}
const cartListeners = new Set()
const saveCart = (next) => { cart = next; write(CART_KEY, next); cartListeners.forEach((l) => l(next)) }
const same = (l, slug, size) => l.slug === slug && l.size === size
export const cartApi = {
  add(slug, size, qty, max) {
    const at = cart.findIndex((l) => same(l, slug, size))
    if (at >= 0) saveCart(cart.map((l, i) => (i === at ? { ...l, qty: Math.min(max || 10, l.qty + qty) } : l)))
    else saveCart([...cart, { slug, size, qty }])
  },
  set(slug, size, qty) { saveCart(cart.map((l) => (same(l, slug, size) ? { ...l, qty } : l))) },
  remove(slug, size) { saveCart(cart.filter((l) => !same(l, slug, size))) },
  clear() { saveCart([]) },
}
/** The cart's lines as the order takes them. */
export const orderItems = (lines) => lines.map((l) => ({ product: l.slug, size: l.size, qty: l.qty }))

const wishListeners = new Set()
const saveWish = (next) => { wish = next; write(WISH_KEY, next); wishListeners.forEach((l) => l(next)) }
const sameW = (l, handle, color, size) => l.handle === handle && (l.color || '') === (color || '') && (l.size || '') === (size || '')
export const wishApi = {
  /** snap: what the window showed (name, photo, approximate price, link): the list shows it without asking again. */
  add(handle, color, size, qty, snap) {
    const at = wish.findIndex((l) => sameW(l, handle, color, size))
    if (at >= 0) saveWish(wish.map((l, i) => (i === at ? { ...l, snap, qty: Math.min(3, l.qty + qty) } : l)))
    else saveWish([...wish, { handle, color: color || '', size: size || '', qty, snap }])
  },
  set(l, qty) { saveWish(wish.map((x) => (sameW(x, l.handle, l.color, l.size) ? { ...x, qty } : x))) },
  remove(l) { saveWish(wish.filter((x) => !sameW(x, l.handle, l.color, l.size))) },
  clear() { saveWish([]) },
}
/** The list's lines as send_wishlist() takes them. */
export const wishItems = (lines) => lines.map((l) => ({ fre: l.handle, color: l.color || '', size: l.size || '', qty: l.qty }))
/** A list line with what it shows: name, photo, approximate price. */
export const wishView = (l) => ({ ...l, name: l.snap?.name || l.handle, photo: l.snap?.photo || null, unit: Number(l.snap?.unit) || 0, url: l.snap?.url || null, category: l.snap?.category })

/** fields: { items, name, phone, email, note, lang, website } → { ok, number, total } (website: the function, the RPC, or the demo) */
export async function sendWishlist(fields) {
  if (!LIVE_CONFIGURED) {
    const { webWishlist } = await import('../../data/demo.js')
    return webWishlist(fields)
  }
  let r
  try { r = await post('/api/wishlist', fields) } catch (err) { console.error('[shop] function unavailable', err.message) }
  if (!r) {
    try { r = (await post(`${URL}/rest/v1/rpc/send_wishlist`, { p: fields }, headers)) || { ok: false, code: 'network' } } catch (err) {
      console.error('[shop] list failed', err.message)
      r = { ok: false, code: 'network' }
    }
  }
  return r
}

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
export function useWish() {
  const [w, setW] = useState(wish)
  useEffect(() => { wishListeners.add(setW); setW(wish); return () => wishListeners.delete(setW) }, [])
  return w
}
/** One sheet at a time: opening the cart closes the list and the other way round. */
const sheetListeners = new Set()
const showSheet = (name) => sheetListeners.forEach((l) => l(name))
export const openCart = () => showSheet('cart')
export const openWish = () => showSheet('wish')
/** open(): this sheet was asked for; close(): another one was. */
export function useSheet(name, open, close) {
  useEffect(() => {
    const l = (n) => (n === name ? open() : close())
    sheetListeners.add(l)
    return () => sheetListeners.delete(l)
  }, [name, open, close])
}

export const SHOP_DEMO = !LIVE_CONFIGURED
