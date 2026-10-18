// The shop's sample data: what Mara posted in the WhatsApp group (the same rows the database starts with), plus two
// earlier orders so the panel isn't empty in the demo.
const PANTS_ES = ['Tela de cuatro vías, no transparente', 'Agarre de silicón (asiento completo)', 'Tiro medio con presillas para cinturón', 'Dos bolsas para celular', '72% poliéster, 28% spandex']
const PANTS_EN = ['Four-way stretch fabric, not see-through', 'Full-seat silicone grip', 'Mid rise with belt loops', 'Two phone pockets', '72% polyester, 28% spandex']
const DESC_ES = 'Pantalón de montar Celestial Lux de FreeRide Equestrian: ajuste cómodo, agarre de silicón en todo el asiento y una tela que no se transparenta.'
const DESC_EN = 'FreeRide Equestrian Celestial Lux breeches: a comfortable fit, full-seat silicone grip and fabric that is not see-through.'

// The products' own photos (cut out on white, 960×1200) in public/img/shop/.
export const SHOP_PHOTOS = {
  'cassidy-frambuesa': 2, 'celestial-lux-arena': 2, 'celestial-lux-blanco': 1, 'celestial-lux-azul-acero': 2,
  'celestial-lux-azul-marino': 2, 'celestial-lux-verde-bosque': 2, 'celestial-lux-merlot': 2,
}
export const photosOf = (slug) => Array.from({ length: SHOP_PHOTOS[slug] || 0 }, (_, i) => `/img/shop/${slug}-${i + 1}.webp`)
/** The background of each of Mara's sample photos (as whiteFrame() reads them): the breeches cut out on white, the
 *  Cassidy shirt photographed. Anything else is not known ('', shown as a photo). */
export const bgOf = (photos) => (photos || []).map((p) => (/^\/img\/shop\/cassidy-/.test(p) ? 'photo' : /^\/img\/shop\/celestial-lux-/.test(p) ? 'white' : ''))

const LUX = [
  ['arena', 'Arena', '#D8C3A0', ['XS', 'S', 'M'], ' Tela muy fresca; color permitido los sábados en los concursos de CESQROO.', ' A very cool fabric; a color allowed on Saturdays at CESQROO shows.'],
  ['verde-bosque', 'Verde bosque', '#2F4A3A', ['XXS', 'XS', 'S', 'M']],
  ['azul-marino', 'Azul marino', '#1F2A44', ['XS', 'M']],
  ['blanco', 'Blanco', '#F4F1EA', ['XXS', 'XS', 'M']],
  ['azul-acero', 'Azul acero', '#3E5873', ['XXS', 'XS', 'M']],
  ['merlot', 'Merlot', '#6B2737', ['XS', 'M']],
]

export function shopProductsSeed() {
  const pants = LUX.map(([slug, color, hex, sizes, extraEs = '', extraEn = ''], i) => ({
    id: `sp${i + 2}`, slug: `celestial-lux-${slug}`, model: 'celestial-lux', category: 'pants', name: 'Pantalón Celestial Lux',
    colorName: color, colorHex: hex, descriptionEs: DESC_ES + extraEs, descriptionEn: DESC_EN + extraEn,
    features: { es: PANTS_ES, en: PANTS_EN }, price: 2250, promoPrice: 1950, sticker: 'inauguracion', photos: photosOf(`celestial-lux-${slug}`), photosBg: bgOf(photosOf(`celestial-lux-${slug}`)),
    takesOrders: false, active: true, sort: 11 + i,
    variants: sizes.map((size) => ({ size, stock: 1, price: null })),
  }))
  return [
    {
      id: 'sp1', slug: 'cassidy-frambuesa', model: 'cassidy', category: 'shirts', name: 'Camisa Cassidy manga larga',
      colorName: 'Frambuesa', colorHex: '#B3385E',
      descriptionEs: 'Camisa de concurso Cassidy de FreeRide Equestrian, de manga larga. También en tallas de niña (hasta 12–13) con precio menor: pídela y te confirmamos el precio.',
      descriptionEn: "FreeRide Equestrian Cassidy long-sleeve show shirt. Also in girls' sizes (up to 12–13) at a lower price: order it and we confirm the price.",
      features: {
        es: ['Tela técnica que seca rápido', 'Cuello blanco en contraste', 'Media cremallera al frente', 'Puños con broche de perla', '83% nylon, 17% spandex'],
        en: ['Quick-dry technical fabric', 'Contrast white collar', 'Front half zip', 'Pearl snap cuffs', '83% nylon, 17% spandex'],
      },
      price: 1700, promoPrice: 1450, sticker: 'inauguracion', photos: photosOf('cassidy-frambuesa'), photosBg: bgOf(photosOf('cassidy-frambuesa')), takesOrders: true, active: true, sort: 1,
      variants: [['XXS', 0], ['XS', 1], ['S', 1], ['M', 1], ['L', 0], ['XL', 0], ['XXL', 0]].map(([size, stock]) => ({ size, stock, price: null })),
    },
    ...pants,
  ]
}

/** Two orders from before the stock count above: one delivered (Fam. Torres), one paid and waiting (the demo family). */
export function shopOrdersSeed(families, at) {
  const f2 = families.find((f) => f.id === 'f2')
  const f1 = families.find((f) => f.id === 'f1')
  return {
    orders: [
      { id: 'so1', number: 1022, familyId: 'f2', name: f2?.contact || 'Laura Torres', phone: f2?.phone || '', email: f2?.email || '',
        items: [{ productId: 'sp5', slug: 'celestial-lux-blanco', name: 'Pantalón Celestial Lux', color: 'Blanco', size: 'XS', qty: 1, unit: 1950, list: 2250, onOrder: false }],
        total: 1950, status: 'entregado', note: null, createdAt: at(-9) },
      { id: 'so2', number: 1023, familyId: 'f1', name: f1?.contact || '', phone: f1?.phone || '', email: f1?.email || '',
        items: [{ productId: 'sp1', slug: 'cassidy-frambuesa', name: 'Camisa Cassidy manga larga', color: 'Frambuesa', size: 'XS', qty: 1, unit: 1450, list: 1700, onOrder: false }],
        total: 1450, status: 'pagado', note: null, createdAt: at(-2) },
    ],
    payments: [
      { id: 'payshop1', familyId: 'f2', service: 'shop', amount: 1950, status: 'paid', method: 'cash', createdAt: at(-9), paidAt: at(-8), meta: { order: 'so1', number: 1022, kind: 'shop' } },
      { id: 'payshop2', familyId: 'f1', service: 'shop', amount: 1450, status: 'paid', method: 'transfer', createdAt: at(-2), paidAt: at(-1), meta: { order: 'so2', number: 1023, kind: 'shop' } },
    ],
  }
}
