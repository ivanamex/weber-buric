// *Precios de ejemplo — placeholder prices in MXN. Edit here; the whole app reads from this file.
export const CURRENCY = 'MXN'

export const PLANS = [
  { classes: 4, price: 2200 },
  { classes: 8, price: 3900, popular: true },
  { classes: 12, price: 5400 },
]
export const planPrice = (classes) => PLANS.find((p) => p.classes === classes)?.price ?? 0

export const BOARDING_MONTHLY = 9500 // pensión completa por caballo / mes

export const RENTAL_PER_HOUR = 850
export const RENTAL_HOURS = [1, 2]

export const CAMP = { price: 12500, deposit: 3000 }

// "Desde" prices for quote-based services
export const FROM_PRICES = {
  birthday: 8500,
  coaching: 1200,
  earlyStim: 450,
}
