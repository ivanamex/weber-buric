import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { waLink } from '../../components/ui.jsx'
import { homePath } from '../routes.js'
import { shopPath } from '../SiteLayout.jsx'
import { SiteDialog } from '../ServiceSheet.jsx'
import { ContactForm } from '../ContactForm.jsx'
import { BIG } from '../content.js'
import { FRE_CATALOG, unitPrice, shopPhoto } from '../../data/shop.js'
import { ShopBtn, ShopCatalog, CartDrawer } from './ShopParts.jsx'
import { ShopCheckout } from './Checkout.jsx'
import { openCart, useShop } from './shopApi.js'

// FreeRide's lifestyle photo goes in public/img/shop/hero.webp; until it's there, a club photo of a rider.
const HERO = '/img/shop/hero.webp'
const HERO_FALLBACK = '/img/club/girl-riding-flamboyan.webp'

/** A Product entry per product (MXN) while the shop is open (the title and description come from the layout). */
function useShopHead(products) {
  const { lang } = useI18n()
  useEffect(() => {
    const origin = window.location.origin
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'shop-ld'
    ld.textContent = JSON.stringify((products || []).map((p) => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `${p.name} ${p.colorName}`.trim(),
      brand: { '@type': 'Brand', name: 'FreeRide Equestrian' },
      description: lang === 'en' ? p.descriptionEn || p.descriptionEs : p.descriptionEs,
      ...(p.photos?.[0] ? { image: new URL(shopPhoto(p.photos[0]), origin).href } : {}),
      url: `${origin}${shopPath(lang)}?p=${p.slug}`,
      offers: { '@type': 'Offer', priceCurrency: 'MXN', price: unitPrice(p), availability: 'https://schema.org/InStock' },
    })))
    document.head.appendChild(ld)
    return () => ld.remove()
  }, [products, lang])
}

/** /tienda and /en/shop: FreeRide Equestrian sold by the club. */
export default function ShopPage() {
  const { t, lang } = useI18n()
  const data = useShop()
  const [params, setParams] = useSearchParams()
  const [asking, setAsking] = useState(null) // the contact form, prefilled
  const [hero, setHero] = useState(HERO)
  const main = useRef(null)
  useShopHead(data?.products)
  // "Ver carrito" from another page of the website lands here with ?carrito=1.
  useEffect(() => {
    if (!data || params.get('carrito') == null) return
    openCart()
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('carrito'); return next }, { replace: true })
  }, [data, params, setParams])
  const toGrid = useCallback(() => main.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), [])
  const ask = useCallback((product) => setAsking(product ? t('site.contact.prefill', { service: product }) : t('site.contact.prefill', { service: t('shop.nav') })), [t])

  if (data && data.on === false) return <Navigate to={homePath(lang)} replace />
  const products = data?.products || []
  return (
    <div className="shoppage">
      <section className="shophero" data-tone="dark">
        <img className="shophero__img" src={hero} alt="" onError={() => setHero(HERO_FALLBACK)} />
        <div className="scontainer">
          <div className="shophero__in">
            <p className="shophero__eyebrow">{t('shop.eyebrow')}</p>
            <h1>{t('shop.title')}</h1>
            <p>{t('shop.heroLine')}</p>
            <ShopBtn onClick={toGrid}>{t('shop.heroBtn')}</ShopBtn>
          </div>
        </div>
      </section>
      <section className="scontainer shopmain" ref={main} data-tone="light" aria-label={t('shop.nav')}>
        {data ? <ShopCatalog products={products} onAsk={ask} /> : <div className="shopempty"><span className="sspin" aria-hidden="true" /></div>}
        <SpecialOrder />
      </section>
      <CartDrawer products={products} onBrowse={toGrid} checkout={(props) => <ShopCheckout {...props} />} />
      {asking && (
        <SiteDialog photo={{ src: BIG.nose.small, w: 800, h: 1067 }} alt={t('site.alt.nose')} position={BIG.nose.position} labelledBy="ssheet2-title" onClose={() => setAsking(null)}>
          <div className="ssheet2__body"><ContactForm titleId="ssheet2-title" service="shop" prefill={asking} /></div>
        </SiteDialog>
      )}
    </div>
  )
}

/** "¿Quieres otro modelo, color o talla?": anything from FreeRide's catalog, by sending a screenshot of the cart. */
function SpecialOrder() {
  const { t } = useI18n()
  return (
    <section className="shopspecial" aria-labelledby="special-title">
      <h2 id="special-title">{t('shop.special.title')}</h2>
      <p>{t('shop.special.text')}</p>
      <ol className="shopsteps">
        <li>{t('shop.special.step1')}</li>
        <li>{t('shop.special.step2')}</li>
        <li>{t('shop.special.step3')}</li>
      </ol>
      <div className="shopspecial__ctas">
        <ShopBtn kind="line" as="a" href={FRE_CATALOG} target="_blank" rel="noopener noreferrer">{t('shop.special.catalog')}</ShopBtn>
        <ShopBtn kind="sage" as="a" href={waLink(t('shop.special.waText'))} target="_blank" rel="noopener noreferrer"><SiteIcon name="whatsapp" size={20} /> {t('shop.special.wa')}</ShopBtn>
      </div>
    </section>
  )
}
