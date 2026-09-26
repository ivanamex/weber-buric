// *Precios de ejemplo — placeholder prices in MXN, used by the demo.
// Live mode (Supabase) replaces them at sign-in with the `prices` table, which management edits
// in Supabase → Table Editor. Keep the keys below in sync with that table.
export const CURRENCY = 'MXN'

export const PLANS = [
  { classes: 4, price: 2200 },
  { classes: 8, price: 3900, popular: true },
  { classes: 12, price: 5400 },
]
export const planPrice = (classes) => PLANS.find((p) => p.classes === classes)?.price ?? 0

export let BOARDING_MONTHLY = 9500 // pensión completa por caballo / mes

export let RENTAL_PER_HOUR = 850
export const RENTAL_HOURS = [1, 2]

export const CAMP = { price: 12500, deposit: 3000 }

// "Desde" prices for quote-based services
export const FROM_PRICES = {
  birthday: 8500,
  coaching: 1200,
  earlyStim: 450,
}

/** Apply prices from the database: { plan_4: 2200, boarding_monthly: 9500, … }. */
export function applyPrices(map) {
  for (const p of PLANS) if (map[`plan_${p.classes}`] != null) p.price = map[`plan_${p.classes}`]
  if (map.boarding_monthly != null) BOARDING_MONTHLY = map.boarding_monthly
  if (map.rental_per_hour != null) RENTAL_PER_HOUR = map.rental_per_hour
  for (const k of Object.keys(FROM_PRICES)) if (map[`from_${k}`] != null) FROM_PRICES[k] = map[`from_${k}`]
}

const DEFAULTS = {
  ...Object.fromEntries(PLANS.map((p) => [`plan_${p.classes}`, p.price])),
  boarding_monthly: BOARDING_MONTHLY,
  rental_per_hour: RENTAL_PER_HOUR,
  ...Object.fromEntries(Object.entries(FROM_PRICES).map(([k, v]) => [`from_${k}`, v])),
}
/** Back to the example prices (switching from live to the demo). */
export const resetPrices = () => applyPrices(DEFAULTS)
