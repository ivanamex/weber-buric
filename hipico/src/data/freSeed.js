// A small piece of FreeRide's catalog for the demo, in the shape fre_catalog keeps (the real one is copied every day
// from shopfre.com). The pieces Mara also has in the club use her photos; the rest show the shop's pictogram.
const S = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const KIDS = ['4-5', '6-7', '8-9', '10-11', '12-13']

const row = (handle, title, type, category, colors, sizes, priceUsd, { compareUsd = null, kids = null, mapped = true, images = [], missing = [] } = {}) => ({
  handle, title, type, category, mapped, kids, colors, sizes, priceUsd, compareUsd, images,
  variants: colors.flatMap((color) => sizes.map((size) => ({ color, size, available: !missing.includes(`${color}/${size}`) && !missing.includes(size) }))),
  url: `https://shopfre.com/products/${handle}`, hidden: false, active: true,
})

export function freCatalogSeed() {
  return [
    row('celestial-lux-breeches-sand', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Sand'], S, 95, { images: ['/img/shop/celestial-lux-arena-1.webp', '/img/shop/celestial-lux-arena-2.webp'] }),
    row('celestial-lux-breeches-forest', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Forest'], S, 95, { images: ['/img/shop/celestial-lux-verde-bosque-1.webp', '/img/shop/celestial-lux-verde-bosque-2.webp'], missing: ['XXL'] }),
    row('celestial-lux-breeches-navy', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Navy'], S, 95, { images: ['/img/shop/celestial-lux-azul-marino-1.webp', '/img/shop/celestial-lux-azul-marino-2.webp'] }),
    row('celestial-lux-breeches-merlot', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Merlot'], S, 95, { images: ['/img/shop/celestial-lux-merlot-1.webp', '/img/shop/celestial-lux-merlot-2.webp'], missing: ['XXS', 'XL'] }),
    row('celestial-lux-breeches-white', 'Celestial Lux Breeches', 'Breeches', 'pants', ['White'], S, 95, { images: ['/img/shop/celestial-lux-blanco-1.webp'] }),
    row('celestial-lux-breeches-steel-blue', 'Celestial Lux Breeches', 'Breeches', 'pants', ['Steel Blue'], S, 95, { compareUsd: 110, images: ['/img/shop/celestial-lux-azul-acero-1.webp', '/img/shop/celestial-lux-azul-acero-2.webp'] }),
    row('childrens-lux-breeches', "Children's Lux Breeches", 'Breeches', 'pants', ['Navy', 'Raspberry'], KIDS, 65, { kids: 'girl' }),
    row('cassidy-show-shirt-raspberry', 'Cassidy Show Shirt', 'Show Shirts', 'shirts', ['Raspberry', 'White'], S, 72, { images: ['/img/shop/cassidy-frambuesa-1.webp', '/img/shop/cassidy-frambuesa-2.webp'], missing: ['White/XXS'] }),
    row('childrens-cassidy-show-shirt', "Children's Cassidy Show Shirt", 'Show Shirts', 'shirts', ['Raspberry', 'White'], KIDS, 55, { kids: 'girl' }),
    row('everyday-sun-shirt', 'Everyday Sun Shirt', 'Tops', 'shirts', ['Ocean', 'Sage'], S, 58, { compareUsd: 72 }),
    row('boys-show-polo', "Boy's Show Polo", 'Tops', 'shirts', ['Navy', 'White'], ['8', '10', '12', '14'], 40, { kids: 'boy' }),
    row('quilted-riding-vest', 'Quilted Riding Vest', 'Outerwear', 'jackets', ['Navy', 'Black'], S, 120),
    row('team-quarter-zip', 'Team Quarter Zip', 'Outerwear', 'jackets', ['Heather Grey'], S, 85, { missing: ['XXS', 'XXL'] }),
    row('signature-leather-belt', 'Signature Leather Belt', 'Belts', 'accessories', ['Brown', 'Black'], ['S', 'M', 'L'], 45),
    row('tall-boot-socks', 'Tall Boot Socks', 'Socks', 'accessories', ['Grey', 'Navy'], ['One Size'], 18),
    row('saddle-pad-cover', 'Saddle Pad Cover', 'Tack', 'accessories', ['Navy'], ['One Size'], 40, { mapped: false }),
  ].map((r, i) => ({ ...r, position: i }))
}
