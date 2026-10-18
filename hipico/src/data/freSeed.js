// A small piece of FreeRide's catalog for the demo, in the shape fre_catalog keeps (the real one is copied every day
// from shopfre.com). The pieces Mara also has in the club use her photos; the rest show the shop's pictogram.
const S = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS = ['4-5', '6-7', '8-9', '10-11', '12-13']

const WAIST = ['22', '24', '26', '28', '30', '32', '34', '36']
// extras: FreeRide's other options ({ grip: ['Full Seat', 'Knee Patch'] }), one variant per combination; photoOf: color → its first photo.
const row = (handle, title, type, category, colors, sizes, priceUsd, { compareUsd = null, kids = null, audience = kids ? 'kids' : 'women', mapped = true, images = [], missing = [], extras = {}, photoOf = {} } = {}) => {
  const combos = Object.entries(extras).reduce((all, [key, values]) => all.flatMap((e) => values.map((v) => ({ ...e, [key]: v }))), [{}])
  return {
    handle, title, type, category, mapped, kids, audience, audienceOverride: null, colors, sizes, priceUsd, compareUsd, images,
    extras: Object.entries(extras).map(([key, values]) => ({ key, values })),
    variants: colors.flatMap((color) => sizes.flatMap((size) => combos.map((extra) => ({
      color, size, extra, image: photoOf[color] ?? null,
      available: ![`${color}/${size}`, size, ...Object.values(extra).map((x) => `${color}/${x}`), ...Object.values(extra).map((x) => `${color}/${size}/${x}`)].some((k) => missing.includes(k)),
    })))),
    url: `https://shopfre.com/products/${handle}`, hidden: false, active: true,
  }
}

export function freCatalogSeed() {
  return [
    row('celestial-lux-breeches-sand', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Sand'], S, 95, { images: ['/img/shop/celestial-lux-arena-1.webp', '/img/shop/celestial-lux-arena-2.webp'] }),
    row('celestial-lux-breeches-forest', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Forest'], S, 95, { images: ['/img/shop/celestial-lux-verde-bosque-1.webp', '/img/shop/celestial-lux-verde-bosque-2.webp'], missing: ['XXL'] }),
    row('celestial-lux-breeches-navy', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Navy'], S, 95, { images: ['/img/shop/celestial-lux-azul-marino-1.webp', '/img/shop/celestial-lux-azul-marino-2.webp'] }),
    row('celestial-lux-breeches-merlot', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Merlot'], S, 95, { images: ['/img/shop/celestial-lux-merlot-1.webp', '/img/shop/celestial-lux-merlot-2.webp'], missing: ['XXS', 'XL'] }),
    row('celestial-lux-breeches-white', 'Celestial Lux Breeches', 'Breeches', 'pants', ['White'], S, 95, { images: ['/img/shop/celestial-lux-blanco-1.webp'] }),
    row('celestial-lux-breeches-steel-blue', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Steel Blue'], S, 95, { compareUsd: 110, images: ['/img/shop/celestial-lux-azul-acero-1.webp', '/img/shop/celestial-lux-azul-acero-2.webp'] }),
    row('define-breeches', 'Define Breeches', 'Breeches', 'pants', ['Navy', 'Forest', 'Merlot'], WAIST, 99, {
      extras: { grip: ['Full Seat', 'Knee Patch'], length: ['Regular', 'Petite'] }, missing: ['22', 'Merlot/Petite', 'Navy/36/Knee Patch'],
      images: ['/img/shop/celestial-lux-azul-marino-1.webp', '/img/shop/celestial-lux-verde-bosque-1.webp', '/img/shop/celestial-lux-merlot-1.webp', '/img/shop/celestial-lux-azul-marino-2.webp', '/img/shop/celestial-lux-verde-bosque-2.webp', '/img/shop/celestial-lux-merlot-2.webp'],
      photoOf: { Navy: 0, Forest: 1, Merlot: 2 } }),
    row('kate-show-shirt', 'Kate Show Shirt', 'Show Shirts', 'shirts', ['White', 'Grey'], S, 68, { extras: { sleeve: ['Long', 'Short'] }, missing: ['Grey/Long', 'XXS'] }),
    row('childrens-lux-breeches', "Children's Lux Breeches", 'Breeches', 'pants', ['Navy', 'Raspberry'], KIDS, 65, { kids: 'girl' }),
    row('cassidy-show-shirt-raspberry', 'Cassidy Show Shirt', 'Show Shirts', 'shirts', ['Raspberry', 'White'], S, 72, { images: ['/img/shop/cassidy-frambuesa-1.webp', '/img/shop/cassidy-frambuesa-2.webp'], missing: ['White/XXS'] }),
    row('childrens-cassidy-show-shirt', "Children's Cassidy Show Shirt", 'Show Shirts', 'shirts', ['Raspberry', 'White'], KIDS, 55, { kids: 'girl' }),
    row('everyday-sun-shirt', 'Everyday Sun Shirt', 'Tops', 'shirts', ['Ocean', 'Sage'], S, 58, { compareUsd: 72 }),
    row('boys-show-polo', "Boy's Show Polo", 'Tops', 'shirts', ['Navy', 'White'], ['8', '10', '12', '14'], 40, { kids: 'boy' }),
    row('quilted-riding-vest', 'Quilted Riding Vest', 'Outerwear', 'jackets', ['Navy', 'Black'], S, 120),
    row('team-quarter-zip', 'Team Quarter Zip', 'Outerwear', 'jackets', ['Heather Grey'], S, 85, { missing: ['XXS', 'XXL'] }),
    row('signature-leather-belt', 'Signature Leather Belt', 'Belts', 'accessories', ['Brown', 'Black'], ['S', 'M', 'L'], 45, { audience: 'all' }),
    row('tall-boot-socks', 'Tall Boot Socks', 'Socks', 'accessories', ['Grey', 'Navy'], ['One Size'], 18, { audience: 'all' }),
    row('saddle-pad-cover', 'Saddle Pad Cover', 'Tack', 'horse', ['Navy'], ['One Size'], 40, { audience: 'all' }),
    row('mens-pro-breeches', "Men's PRO Breeches", 'Men', 'pants', ['Beige', 'Navy'], ['S', 'M', 'L', 'XL', 'XXL'], 110, { audience: 'men' }),
    row('mens-competition-shirt', "Men's Competition Shirt", 'Men', 'shirts', ['White'], ['S', 'M', 'L', 'XL'], 75, { audience: 'men' }),
    row('logo-gift-tin', 'Logo Gift Tin', 'Misc', 'accessories', ['Assorted'], ['One Size'], 25, { mapped: false, audience: 'all' }),
  ].map((r, i) => ({ ...r, position: i }))
}

/** One list a visitor sent from the website, so Dirección → Tienda → Listas isn't empty in the demo. */
export function wishlistsSeed(at = (h) => new Date(Date.now() - h * 3600000).toISOString()) {
  return [{
    id: 'wl1', number: 101, familyId: null, name: 'Daniela Ruiz', phone: '+52 984 222 3344', email: null, note: 'Es para mi hija de 9 años.',
    items: [
      { handle: 'childrens-lux-breeches', name: "Children's Lux Breeches", color: 'Raspberry', size: '8-9', qty: 1, unit: 1450, photo: null, url: 'https://shopfre.com/products/childrens-lux-breeches' },
      { handle: 'childrens-cassidy-show-shirt', name: "Children's Cassidy Show Shirt", color: 'White', size: '8-9', qty: 1, unit: 1250, photo: null, url: 'https://shopfre.com/products/childrens-cassidy-show-shirt' },
    ],
    totalEstimate: 2700, status: 'nueva', orderId: null, lang: 'es', createdAt: at(5),
  }]
}
