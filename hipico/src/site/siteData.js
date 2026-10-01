// What the website shows from the club's own data: plan prices, upcoming events and horses for sale.
// The live site asks the database's public_site() (nothing personal); without a database it uses the demo data.
import { useEffect, useState } from 'react'
import { todayKey } from '../lib/time.js'

const URL = __SUPABASE_URL__
const KEY = __SUPABASE_KEY__
const LIVE_CONFIGURED = Boolean(URL && KEY)

let cache = null
let pending = null

async function fromDatabase() {
  const res = await fetch(`${URL}/rest/v1/rpc/public_site`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(String(res.status))
  const d = await res.json()
  const photo = (p) => (p ? `${URL}/storage/v1/object/public/horse-photos/${p.split('/').map(encodeURIComponent).join('/')}` : null)
  return {
    prices: d.prices || {},
    events: d.events || [],
    sales: d.sales ? d.sales.map((h) => ({ ...h, photo: photo(h.photo) })) : null,
  }
}

async function fromDemo() {
  const [{ createSeed }, { PLANS, CLASS_PRICES, BOARDING_MONTHLY }] = await Promise.all([import('../data/seed.js'), import('../data/prices.js')])
  const s = createSeed()
  const today = todayKey()
  return {
    prices: {
      ...Object.fromEntries(PLANS.map((p) => [`plan_${p.classes}`, p.price])),
      class_trial: CLASS_PRICES.trial, class_single: CLASS_PRICES.single, boarding_monthly: BOARDING_MONTHLY,
    },
    events: (s.events || []).filter((e) => e.active !== false && e.endDate >= today),
    sales: s.horses.filter((h) => h.status === 'for_sale').map((h) => ({
      id: h.id, name: h.name, level: h.level, breed: h.breed, sex: h.sex, age: h.age, photo: null,
    })),
  }
}

export function loadSiteData() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = (LIVE_CONFIGURED ? fromDatabase() : fromDemo())
      .then((d) => { cache = d; return d })
      .catch(() => { pending = null; return { prices: {}, events: [], sales: null } })
  }
  return pending
}

/** null while loading. */
export function useSiteData() {
  const [data, setData] = useState(cache)
  useEffect(() => {
    let on = true
    if (!cache) loadSiteData().then((d) => { if (on) setData(d) })
    return () => { on = false }
  }, [])
  return data
}

/** The monthly plans as [{ classes, price }], cheapest first. Empty when the club hasn't set prices. */
export const planList = (prices = {}) => Object.entries(prices)
  .map(([k, v]) => [Number(k.match(/^plan_(\d+)$/)?.[1]), v])
  .filter(([n, v]) => n > 0 && v > 0)
  .sort((a, b) => a[0] - b[0])
  .map(([classes, price]) => ({ classes, price }))
