import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { waLink } from '../../components/ui.jsx'
import {
  CATEGORIES, CATEGORY_SLUGS, categoryFromSlug, byModel, siblingsOf, stickersOf, STICKER_COLOR, stockNum, sizeOpen, onOrder,
  unitPrice, listPrice, maxQty, SIZE_GUIDE, resolveLine, cartTotals, shopPhoto, FRE_PREFIX, isFre, freAsProduct, freColors, freSizes, ORDER_MAX,
} from '../../data/shop.js'
import { cartApi, fetchFre, openCart, useCart, useCartOpener } from './shopApi.js'
import './shop.css'
import { lockScroll } from '../../lib/scrollLock.js'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A button that looks right on the website (glass) and in the app. kind: main | line | sage */
export function ShopBtn({ inApp, kind = 'main', className = '', children, as: As = 'button', ...rest }) {
  const cls = inApp
    ? { main: 'btn btn--primary', line: 'btn btn--outline', sage: 'btn btn--sage' }[kind]
    : { main: 'sbtn sbtn--deep', line: 'sbtn sbtn--line', sage: 'sbtn sbtn--sage' }[kind]
  return (
    <As className={`${cls} shopbtn shopbtn--${kind} ${className}`} {...(As === 'button' ? { type: 'button' } : {})} {...rest}>
      {inApp ? children : <span className="sbtn__in">{children}</span>}
    </As>
  )
}

/** Esc, a focus trap and the page underneath held still, for the product window and the cart. */
function useModal(panel, onClose, first) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const before = document.activeElement
    first?.current?.focus({ preventScroll: true })
    const unlock = lockScroll()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current() }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) return
      const a = items[0]
      const z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); unlock(); before?.focus?.({ preventScroll: true }) }
  }, [panel, first])
}

export const productTitle = (p) => `${p.name} ${p.colorName}`.trim()

/** The photo, or a sand card with the pictogram and the product's color while there's none. */
export function ProductPhoto({ product, index = 0, alt = '' }) {
  const src = shopPhoto(product.photos?.[index])
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  if (!src || broken) {
    return (
      <span className="pph" style={{ '--sw': product.colorHex }} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <SiteIcon name={product.category === 'shirts' ? 'shirt' : product.category === 'pants' ? 'pants' : 'hanger'} size={72} />
        <span className="pph__dot" aria-hidden="true" />
      </span>
    )
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
}

export function Stickers({ product, className = '' }) {
  const { t } = useI18n()
  const list = stickersOf(product)
  if (!list.length) return null
  return (
    <span className={className}>
      {list.map((k) => <span key={k} className={`sticker sticker--${STICKER_COLOR[k]}`}>{t(`shop.sticker.${k}`)}</span>)}
    </span>
  )
}

export function Price({ product, variant, big }) {
  const { fmtMoney } = useI18n()
  const now = unitPrice(product, variant)
  const list = listPrice(product, variant)
  return (
    <span className={`pprice ${big ? 'pprice--big' : ''}`}>
      <b>{fmtMoney(now)}</b>
      {list > now && <s>{fmtMoney(list)}</s>}
    </span>
  )
}

function Swatches({ colors, current, onPick, big, label }) {
  if (colors.length < 2) return null
  return (
    <span className={`swatches ${big ? 'swatches--big' : ''}`} role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c.slug} type="button" className={`swatch ${c.slug === current.slug ? 'is-on' : ''}`} style={{ '--sw': c.colorHex }}
          aria-pressed={c.slug === current.slug} aria-label={c.colorName} title={c.colorName} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(c) }} />
      ))}
    </span>
  )
}

/** "Tallas: XS · S · M" with the sizes that can't be had struck. */
function SizeLine({ product }) {
  const { t } = useI18n()
  const vs = product.variants || []
  if (!vs.length) return null
  return (
    <p className="psizes">{t('shop.sizes')}{' '}
      {vs.map((v, i) => <span key={v.size}>{i ? ' · ' : ''}{sizeOpen(product, v) ? v.size : <s>{v.size}</s>}</span>)}
    </p>
  )
}

/** One card per model (its colors as swatches); a swatch swaps the card to that color. */
function ProductCard({ group, hrefFor }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(group.first)
  useEffect(() => setCurrent(group.first), [group.first])
  const title = productTitle(current)
  return (
    <li>
      <article className="pcard">
        <Link to={hrefFor(current)} className="pcard__photo" aria-label={title}>
          <ProductPhoto product={current} alt={title} />
          {current.photos?.[1] && <ProductPhoto product={current} index={1} />}
          <Stickers product={current} className="pcard__stickers" />
        </Link>
        <div className="pcard__body">
          <h3 className="pcard__name"><Link to={hrefFor(current)}>{current.name}</Link></h3>
          <div className="pcard__color">
            <span>{current.colorName}</span>
            <Swatches colors={group.colors} current={current} onPick={setCurrent} label={t('shop.colors')} />
          </div>
          <Price product={current} />
          <SizeLine product={current} />
        </div>
      </article>
    </li>
  )
}

/** The card as it will look in the shop (the panel's editor), not clickable. */
export function ProductCardPreview({ product }) {
  return (
    <div className="pcard-preview" aria-hidden="true" inert="">
      <ul className="shopgrid"><ProductCard group={{ key: 'preview', colors: [product], first: product }} hrefFor={() => '#'} /></ul>
    </div>
  )
}

/** FreeRide's catalog a page at a time (24), with the same filters; "Ver más" and reaching the bottom load the next. */
export function useFreList(filters) {
  const key = JSON.stringify(filters)
  const [state, setState] = useState({ key: null, items: [], total: 0, loading: true, facets: null })
  const busy = useRef(false)
  const load = useCallback(async (offset, reset) => {
    if (busy.current && !reset) return
    busy.current = true
    setState((st) => ({ ...st, loading: true }))
    const r = await fetchFre({ ...JSON.parse(key), offset, limit: 24 })
    busy.current = false
    setState((st) => ({
      key, loading: false, total: r.total,
      items: reset ? r.items : [...st.items, ...r.items.filter((x) => !st.items.some((y) => y.handle === x.handle))],
      facets: { categories: r.categories, colors: r.colors, kids: r.kids, discount: r.discount },
    }))
  }, [key])
  useEffect(() => { load(0, true) }, [load])
  const more = useCallback(() => { if (state.items.length < state.total) load(state.items.length) }, [load, state.items.length, state.total])
  return { ...state, more, hasMore: state.items.length < state.total }
}

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

/**
 * The shop itself: category tabs (in the address, ?cat=camisas), a filter row (Talla · Color · Niña / Niño), Mara's own
 * stock first ("Entrega inmediata en el club"), then the whole FreeRide catalog ("sobre pedido", 24 at a time), and the
 * product window (?p=<slug> or ?p=fre:<handle>, so a product can be shared on WhatsApp). Used by /tienda and the app.
 */
export function ShopCatalog({ products, inApp, onAsk, gridRef }) {
  const { t, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const cat = categoryFromSlug(params.get('cat')) || 'all'
  const open = params.get('p')
  const [size, setSize] = useState(null)
  const [color, setColor] = useState('')
  const [kids, setKids] = useState(null)
  const fre = useFreList({ category: cat === 'all' ? null : cat, size, color: color || null, kids })
  const freFacets = fre.facets || {}
  const freCats = freFacets.categories || {}
  const freOn = Object.values(freCats).some((n) => n > 0)
  // Mara's own pieces with the same filters (her products are never "Niña" / "Niño").
  const mine = products.filter((p) => (cat === 'all' || p.category === cat) && !kids
    && (!size || (p.variants || []).some((v) => v.size === size && sizeOpen(p, v)))
    && (!color || (p.colorName || '').toLowerCase() === color.toLowerCase()))
  const filtered = Boolean(size || color || kids)
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length + (freCats[c] || 0)]))
  const allCount = products.length + Object.values(freCats).reduce((a, n) => a + n, 0)
  // "Todo" without filters: one card per model (its colors as swatches); otherwise one card per color.
  const groups = useMemo(() => (cat === 'all' && !filtered
    ? byModel(mine)
    : mine.map((p) => ({ key: p.slug, first: p, colors: siblingsOf(products, p) }))), [mine, products, cat, filtered])
  const colorOptions = [...new Set([...products.map((p) => p.colorName).filter(Boolean), ...(freFacets.colors || [])])]
  const setCat = (c) => {
    const next = new URLSearchParams(params)
    if (c === 'all') next.delete('cat'); else next.set('cat', CATEGORY_SLUGS[lang][c])
    next.delete('p')
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const hrefFor = (slug) => { const next = new URLSearchParams(params); next.set('p', slug); return `?${next}` }
  const closeSheet = useCallback(() => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('p'); return next }, { replace: true, preventScrollReset: true })
  }, [setParams])
  const switchTo = (p) => setParams((prev) => { const next = new URLSearchParams(prev); next.set('p', p.slug); return next }, { replace: true, preventScrollReset: true })
  const product = open && !isFre(open) ? products.find((p) => p.slug === open) : null
  // Reaching the bottom of FreeRide's list loads the next 24 by itself.
  const sentinel = useRef(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || !fre.hasMore || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) fre.more() }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [fre.hasMore, fre.more])
  const empty = !groups.length && !(fre.items.length || fre.loading)
  return (
    <>
      <div className="shoptabs" role="tablist" aria-label={t('shop.catLabel')}>
        {['all', ...CATEGORIES].map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} className={`shoptab ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>
            {t(`shop.cat.${c}`)} <span className="shoptab__n">{c === 'all' ? allCount : counts[c]}</span>
          </button>
        ))}
      </div>
      <div className="shopfilters" role="group" aria-label={t('shop.filters.label')}>
        <span className="shopfilters__label">{t('shop.size')}</span>
        <span className="shopfilters__chips">
          {SIZES.map((x) => (
            <button key={x} type="button" className={`chip ${size === x ? 'is-active' : ''}`} aria-pressed={size === x} onClick={() => setSize(size === x ? null : x)}>{x}</button>
          ))}
        </span>
        {colorOptions.length > 1 && (
          <label className="shopfilters__color">
            <span className="shopfilters__label">{t('shop.colorLabel')}</span>
            <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">{t('shop.filters.anyColor')}</option>
              {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}
        {(freFacets.kids || []).length > 0 && (
          <span className="shopfilters__chips">
            {['girl', 'boy'].filter((k) => freFacets.kids.includes(k)).map((k) => (
              <button key={k} type="button" className={`chip ${kids === k ? 'is-active' : ''}`} aria-pressed={kids === k} onClick={() => setKids(kids === k ? null : k)}>{t(`shop.filters.${k}`)}</button>
            ))}
          </span>
        )}
        {filtered && <button type="button" className="tlink" onClick={() => { setSize(null); setColor(''); setKids(null) }}>{t('shop.filters.clear')}</button>}
      </div>
      {groups.length > 0 && (
        <section className="shopsect" aria-labelledby="shop-mine">
          {freOn && <h2 id="shop-mine" className="shopsect__title">{t('shop.mine.title')} <span>{t('shop.mine.line')}</span></h2>}
          <ul className="shopgrid" ref={gridRef}>
            {groups.map((g) => <ProductCard key={`${cat}:${g.key}`} group={g} hrefFor={(p) => hrefFor(p.slug)} />)}
          </ul>
        </section>
      )}
      {(freOn || fre.items.length > 0) && (
        <section className="shopsect" aria-labelledby="shop-fre">
          <h2 id="shop-fre" className="shopsect__title">{t('shop.fre.title')} <span>{t('shop.fre.line')}</span></h2>
          {fre.items.length > 0 ? (
            <ul className="shopgrid" ref={groups.length ? undefined : gridRef}>
              {fre.items.map((item) => <FreCard key={item.handle} item={item} discount={freFacets.discount} href={hrefFor(`${FRE_PREFIX}${item.handle}`)} />)}
            </ul>
          ) : !fre.loading && <p className="shopsect__none">{t('shop.fre.none')}</p>}
          {fre.hasMore && (
            <div className="shopmore" ref={sentinel}>
              <ShopBtn inApp={inApp} kind="line" onClick={fre.more} disabled={fre.loading}>{fre.loading ? t('shop.fre.loading') : t('shop.fre.more', { n: fre.total - fre.items.length })}</ShopBtn>
            </div>
          )}
        </section>
      )}
      {empty && (
        <div className="shopempty" ref={gridRef}>
          <SiteIcon name="hanger" size={40} />
          <p>{filtered ? t('shop.filters.none') : t('shop.emptyCat', { cat: t(`shop.cat.${cat}`).toLowerCase() })}</p>
          {onAsk && <button type="button" className="tlink" onClick={onAsk}>{t('shop.emptyAsk')}</button>}
        </div>
      )}
      {product && <ProductSheet key={product.model || product.slug} product={product} siblings={siblingsOf(products, product)} inApp={inApp} onClose={closeSheet} onSwitch={switchTo} onAsk={onAsk} />}
      {open && isFre(open) && <FreSheet handle={open.slice(FRE_PREFIX.length)} known={fre.items} discount={freFacets.discount} inApp={inApp} onClose={closeSheet} onAsk={onAsk} />}
    </>
  )
}

/** A FreeRide product: its photo on white, "−5 %" (or Promo when FreeRide has it on sale), the price in pesos, sizes. */
function FreCard({ item, href, discount }) {
  const { t, fmtMoney } = useI18n()
  const p = freAsProduct(item)
  const colors = freColors(item).filter(Boolean)
  const sizes = item.sizes || []
  const avail = (sz) => (item.variants || []).some((v) => v.size === sz && v.available)
  return (
    <li>
      <article className="pcard pcard--fre">
        <Link to={href} className="pcard__photo" aria-label={item.title}>
          <ProductPhoto product={p} alt={item.title} />
          {item.images?.[1] && <ProductPhoto product={p} index={1} />}
          <span className="pcard__stickers">
            {item.onSale ? <span className="sticker sticker--terracotta">{t('shop.sticker.promo')}</span>
              : Number(discount) > 0 && <span className="sticker sticker--mustard">{t('shop.sticker.off', { pct: Number(discount) })}</span>}
          </span>
        </Link>
        <div className="pcard__body">
          <h3 className="pcard__name"><Link to={href}>{item.title}</Link></h3>
          <div className="pcard__color"><span>{colors.length > 1 ? t('shop.fre.colors', { n: colors.length }) : colors[0] || ''}</span></div>
          <span className="pprice"><b>{fmtMoney(item.unit)}</b>{item.list > item.unit && <s>{fmtMoney(item.list)}</s>}</span>
          {sizes.length > 0 && (
            <p className="psizes">{t('shop.sizes')}{' '}{sizes.map((sz, i) => <span key={sz}>{i ? ' · ' : ''}{avail(sz) ? sz : <s>{sz}</s>}</span>)}</p>
          )}
        </div>
      </article>
    </li>
  )
}

/** A FreeRide product in full: its photos, colors, sizes (struck when FreeRide has none), always "sobre pedido". */
function FreSheet({ handle, known, discount, inApp, onClose, onAsk }) {
  const { t, fmtMoney } = useI18n()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useModal(panel, onClose, closeBtn)
  const [item, setItem] = useState(() => known.find((x) => x.handle === handle) || null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (item) return
    fetchFre({ handle, limit: 1 }).then((r) => { if (r.items[0]) setItem(r.items[0]); else setMissing(true) })
  }, [handle, item])
  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [pulse, setPulse] = useState(0)
  const [added, setAdded] = useState(false)
  const colors = item ? freColors(item) : []
  const current = color ?? colors.find((c) => freSizes(item, c).some((v) => v.available)) ?? colors[0] ?? ''
  const sizes = item ? freSizes(item, current) : []
  const p = item ? freAsProduct(item, current) : null
  const add = () => {
    if (!size) { setPulse((n) => n + 1); return }
    cartApi.add(p.slug, size, qty, ORDER_MAX, { color: current, snap: { name: item.title, photo: item.images?.[0] || null, unit: item.unit, list: item.list, category: item.category, url: item.url } })
    setAdded(true)
    setTimeout(() => { setAdded(false); onClose(); setTimeout(openCart, 80) }, 900)
  }
  return createPortal(
    <div className={`shopdlg ${inApp ? 'shopdlg--app' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pinfo-title">
      <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="shopdlg__panel" ref={panel}>
        <button ref={closeBtn} type="button" className="shopdlg__close" aria-label={t('common.close')} onClick={onClose}><SiteIcon name="x" size={22} /></button>
        {!item ? (
          <div className="pinfo pinfo--wait"><p>{missing ? t('shop.fre.gone') : t('shop.fre.loading')}</p></div>
        ) : (
          <>
            <Gallery key={item.handle} product={p} title={item.title} />
            <div className="pinfo">
              <span className="pinfo__stickers">
                {item.onSale ? <span className="sticker sticker--terracotta">{t('shop.sticker.promo')}</span>
                  : Number(discount) > 0 && <span className="sticker sticker--mustard">{t('shop.sticker.off', { pct: Number(discount) })}</span>}
              </span>
              <h2 id="pinfo-title">{item.title}</h2>
              {colors.filter(Boolean).length > 0 && (
                <div>
                  <p className="pinfo__label" id="fre-color"><span>{t('shop.color')} {current}</span></p>
                  <div className="sizes" role="radiogroup" aria-labelledby="fre-color">
                    {colors.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={c === current} className={`sizepill sizepill--wide ${c === current ? 'is-on' : ''}`}
                        onClick={() => { setColor(c); setSize(null) }}>{c}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pinfo__pricerow">
                <span className="pprice pprice--big"><b>{fmtMoney(item.unit)}</b>{item.list > item.unit && <s>{fmtMoney(item.list)}</s>}</span>
                {item.list > item.unit && <span className="psave">{t('shop.save', { amount: fmtMoney((item.list - item.unit) * qty) })}</span>}
              </div>
              <div>
                <p className="pinfo__label" id="fre-size"><span>{t('shop.size')}</span>
                  {item.url && <a className="tlink" href={item.url} target="_blank" rel="noopener noreferrer">{t('shop.sizeGuide')}</a>}
                </p>
                <div className={`sizes ${pulse ? 'is-pulse' : ''}`} key={`p${pulse}`} role="radiogroup" aria-labelledby="fre-size">
                  {sizes.map((v) => (
                    <span key={v.size || 'u'} className="sizeopt">
                      <button type="button" role="radio" aria-checked={size === v.size} disabled={!v.available}
                        className={`sizepill is-order ${size === v.size ? 'is-on' : ''}`} onClick={() => { setSize(v.size); setQty(1) }}>{v.size || t('shop.fre.oneSize')}</button>
                    </span>
                  ))}
                </div>
                <p className="pinfo__order">{t('shop.fre.orderLine')}</p>
                {pulse > 0 && !size && <p className="pinfo__ask" role="alert">{t('shop.chooseSize')}</p>}
              </div>
              <div className="pinfo__buy">
                <Qty value={qty} max={ORDER_MAX} onChange={setQty} />
                <ShopBtn inApp={inApp} className="shopbtn--main" onClick={add} aria-live="polite">{added ? t('shop.added') : t('shop.add')}</ShopBtn>
              </div>
              <p className="pinfo__pickup"><SiteIcon name="pin" size={20} /> {t('shop.pickup')}</p>
              <Dudas inApp={inApp} title={item.title} onAsk={onAsk} onClose={onClose} />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** The product in full: gallery left, everything to choose and buy right. */
function ProductSheet({ product, siblings, inApp, onClose, onSwitch, onAsk }) {
  const { t, fmtMoney, lang } = useI18n()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useModal(panel, onClose, closeBtn)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [pulse, setPulse] = useState(0)
  const [added, setAdded] = useState(false)
  useEffect(() => { setSize(null); setQty(1) }, [product.slug])
  const variant = product.variants?.find((v) => v.size === size) || null
  const title = productTitle(product)
  const max = variant ? maxQty(product, variant) : 1
  const saving = listPrice(product, variant) - unitPrice(product, variant)
  const features = product.features?.[lang] || product.features?.es || []
  const desc = lang === 'en' ? product.descriptionEn || product.descriptionEs : product.descriptionEs
  const add = () => {
    if (!variant) { setPulse((n) => n + 1); return }
    cartApi.add(product.slug, variant.size, qty, max)
    setAdded(true)
    // The product window closes first; the cart opens once it's gone (never two sheets on top of each other).
    setTimeout(() => { setAdded(false); onClose(); setTimeout(openCart, 80) }, 900)
  }
  return createPortal(
    <div className={`shopdlg ${inApp ? 'shopdlg--app' : ''}`} role="dialog" aria-modal="true" aria-labelledby="pinfo-title">
      <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <div className="shopdlg__panel" ref={panel}>
        <button ref={closeBtn} type="button" className="shopdlg__close" aria-label={t('common.close')} onClick={onClose}><SiteIcon name="x" size={22} /></button>
        <Gallery key={product.slug} product={product} title={title} />
        <div className="pinfo">
          <Stickers product={product} className="pinfo__stickers" />
          <h2 id="pinfo-title">{product.name}</h2>
          <div className="pinfo__color">
            <span>{t('shop.color')} <b>{product.colorName}</b></span>
            <Swatches colors={siblings} current={product} onPick={onSwitch} big label={t('shop.colors')} />
          </div>
          <div className="pinfo__pricerow">
            <Price product={product} variant={variant} big />
            {saving > 0 && <span className="psave">{t('shop.save', { amount: fmtMoney(saving * (variant ? qty : 1)) })}</span>}
          </div>
          <div>
            <p className="pinfo__label" id="pinfo-size"><span>{t('shop.size')}</span>
              <a className="tlink" href={SIZE_GUIDE[product.category] || SIZE_GUIDE.pants} target="_blank" rel="noopener noreferrer">{t('shop.sizeGuide')}</a>
            </p>
            <div className={`sizes ${pulse ? 'is-pulse' : ''}`} key={`p${pulse}`} role="radiogroup" aria-labelledby="pinfo-size">
              {(product.variants || []).map((v) => {
                const open = sizeOpen(product, v)
                const order = onOrder(product, v)
                const n = stockNum(v)
                return (
                  <span key={v.size} className="sizeopt">
                    <button type="button" role="radio" aria-checked={size === v.size} disabled={!open}
                      className={`sizepill ${size === v.size ? 'is-on' : ''} ${order ? 'is-order' : ''}`}
                      onClick={() => { setSize(v.size); setQty(1) }}>{v.size}</button>
                    {order ? <small className="is-order">{t('shop.onOrder')}</small> : open && n <= 2 ? <small>{t('shop.left', { n })}</small> : null}
                  </span>
                )
              })}
            </div>
            {variant && onOrder(product, variant) && <p className="pinfo__order">{t('shop.onOrderLine')}</p>}
            {pulse > 0 && !variant && <p className="pinfo__ask" role="alert">{t('shop.chooseSize')}</p>}
          </div>
          <div className="pinfo__buy">
            <Qty value={qty} max={max} onChange={setQty} />
            <ShopBtn inApp={inApp} className="shopbtn--main" onClick={add} aria-live="polite">
              {added ? t('shop.added') : t('shop.add')}
            </ShopBtn>
          </div>
          {desc && <p className="pinfo__desc">{desc}</p>}
          {features.length > 0 && (
            <ul className="plist">
              {features.map((f) => <li key={f}><SiteIcon name="check" size={18} /><span>{f}</span></li>)}
            </ul>
          )}
          <p className="pinfo__pickup"><SiteIcon name="pin" size={20} /> {t('shop.pickup')}</p>
          <Dudas inApp={inApp} title={title} onAsk={onAsk} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Photos: swipe on phones, arrows and thumbnails on a computer; the whole product on white. */
function Gallery({ product, title }) {
  const { t } = useI18n()
  const strip = useRef(null)
  const [photo, setPhoto] = useState(0)
  const photos = product.photos?.length ? product.photos : [null]
  const goPhoto = (i) => { const n = Math.max(0, Math.min(photos.length - 1, i)); setPhoto(n); strip.current?.scrollTo({ left: n * strip.current.clientWidth, behavior: 'smooth' }) }
  return (
    <div className="pgal">
      <div className="pgal__main">
        <div className="pgal__strip" ref={strip} onScroll={(e) => { const w = e.currentTarget.clientWidth; if (w) setPhoto(Math.round(e.currentTarget.scrollLeft / w)) }}>
          {photos.map((_, i) => <div key={i} className="pgal__slide"><ProductPhoto product={product} index={i} alt={`${title} · ${i + 1}`} /></div>)}
        </div>
        {photos.length > 1 && <>
          <button type="button" className="pgal__arrow pgal__arrow--prev" aria-label={t('shop.prevPhoto')} onClick={() => goPhoto(photo - 1)}><SiteIcon name="arrowRight" size={20} style={{ transform: 'scaleX(-1)' }} /></button>
          <button type="button" className="pgal__arrow pgal__arrow--next" aria-label={t('shop.nextPhoto')} onClick={() => goPhoto(photo + 1)}><SiteIcon name="arrowRight" size={20} /></button>
        </>}
      </div>
      {photos.length > 1 && (
        <div className="pgal__thumbs">
          {photos.map((_, i) => (
            <button key={i} type="button" className={`pgal__thumb ${photo === i ? 'is-on' : ''}`} aria-label={`${title} · ${i + 1}`} aria-pressed={photo === i} onClick={() => goPhoto(i)}>
              <ProductPhoto product={product} index={i} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** "¿Dudas?" + WhatsApp · Mensaje, at the end of a product window. */
function Dudas({ inApp, title, onAsk, onClose }) {
  const { t } = useI18n()
  return (
    <div className="pinfo__dudas">
      <span>{t('site.info.title')}</span>
      <ShopBtn inApp={inApp} kind="sage" as="a" href={waLink(t('shop.waAsk', { product: title }))} target="_blank" rel="noopener noreferrer" className={inApp ? 'btn--sm' : 'sbtn--pill'}>
        <SiteIcon name="whatsapp" size={18} /> {t('site.info.whatsapp')}
      </ShopBtn>
      {onAsk && <ShopBtn inApp={inApp} kind="sage" className={inApp ? 'btn--sm' : 'sbtn--pill'} onClick={() => { onClose(); onAsk(title) }}>
        <SiteIcon name="mail" size={18} /> {t('site.info.message')}
      </ShopBtn>}
    </div>
  )
}

export function Qty({ value, max, onChange, small }) {
  const { t } = useI18n()
  return (
    <span className={`qty ${small ? 'qty--sm' : ''}`} role="group" aria-label={t('shop.qty')}>
      <button type="button" aria-label={t('shop.less')} disabled={value <= 1} onClick={() => onChange(value - 1)}><SiteIcon name="minus" size={18} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={t('shop.more')} disabled={value >= max} onClick={() => onChange(value + 1)}><SiteIcon name="plus" size={18} /></button>
    </span>
  )
}

/** The cart's lines resolved against the catalog (prices, stock, "bajo pedido"). */
export function useCartLines(products) {
  const cart = useCart()
  return useMemo(() => cart.map((l) => resolveLine(products || [], l)).filter((l) => !l.missing || !products?.length), [cart, products])
}

/**
 * The cart: a side panel on a computer, a bottom sheet on phones. `checkout(lines, totals, back)` renders the step after
 * "Pagar" (the website's form, or the app's own); without it "Pagar" calls `onPay(lines, totals)`.
 */
export function CartDrawer({ products, inApp, onBrowse, checkout, onPay, payBusy, payError }) {
  const { t, fmtMoney } = useI18n()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('cart')
  const panel = useRef(null)
  const closeBtn = useRef(null)
  const show = useCallback(() => { setOpen(true); setStep('cart') }, [])
  useCartOpener(show)
  const lines = useCartLines(products)
  const totals = cartTotals(lines)
  const close = useCallback(() => setOpen(false), [])
  // Leaving the page closes it (and lets the page scroll again).
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  if (!open) return null
  return <CartPanel {...{ panel, closeBtn, close, lines, totals, step, setStep, inApp, onBrowse, checkout, onPay, payBusy, payError, t, fmtMoney }} />
}

function CartPanel({ panel, closeBtn, close, lines, totals, step, setStep, inApp, onBrowse, checkout, onPay, payBusy, payError, t, fmtMoney }) {
  useModal(panel, close, closeBtn)
  const body = useRef(null)
  useEffect(() => { body.current?.scrollTo({ top: 0 }) }, [step])
  const blocked = lines.some((l) => l.gone || l.missing)
  const inCheckout = step !== 'cart' && checkout
  return createPortal(
    <div className="cartdrw" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={close} />
      <div className="cartdrw__panel" ref={panel}>
        <div className="cartdrw__head">
          <h2 id="cart-title">{t('shop.cart.title')}</h2>
          <button ref={closeBtn} type="button" className="shopdlg__close" aria-label={t('shop.cart.close')} onClick={close}><SiteIcon name="x" size={22} /></button>
        </div>
        {inCheckout ? checkout({ lines, totals, back: () => setStep('cart'), close, body }) : (
          <>
            <div className="cartdrw__body" ref={body}>
              {lines.length ? (
                <>
                  <ul className="clines" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {lines.map((l) => <CartLine key={`${l.slug}|${l.size}|${l.color || ''}`} line={l} />)}
                  </ul>
                  <div className="csum">
                    <div><span>{t('shop.cart.subtotal')}</span><b>{fmtMoney(totals.subtotal)}</b></div>
                    {totals.saving > 0 && <div className="csum__save"><span>{t('shop.cart.saving', { amount: fmtMoney(totals.saving) })}</span></div>}
                    {totals.hasOrder && (
                      <div className="csum__today">
                        <p style={{ margin: 0 }}><b>{t('shop.cart.today', { amount: fmtMoney(totals.now) })}</b><span>{t('shop.cart.todayNote')}</span></p>
                        <b>{t('shop.cart.later', { amount: fmtMoney(totals.rest) })}</b>
                      </div>
                    )}
                  </div>
                  {(payError || blocked) && <p className="cerr" role="alert">{payError || t('shop.cart.fix')}</p>}
                </>
              ) : (
                <div className="cempty">
                  <SiteIcon name="bag" size={44} />
                  <p>{t('shop.cart.empty')}</p>
                  <ShopBtn inApp={inApp} kind="line" onClick={() => { close(); onBrowse?.() }}>{t('shop.cart.browse')}</ShopBtn>
                </div>
              )}
            </div>
            {lines.length > 0 && (
              <div className="cartdrw__foot">
                <span className="cartdrw__total"><span>{t(totals.hasOrder ? 'shop.cart.todayShort' : 'shop.cart.total')}</span><b>{fmtMoney(totals.now)}</b></span>
                <ShopBtn inApp={inApp} disabled={blocked || payBusy} aria-busy={payBusy || undefined}
                  onClick={() => (checkout ? setStep('checkout') : onPay?.(lines, totals, close))}>
                  {payBusy ? t('site.enroll.paying') : t('shop.cart.pay', { amount: fmtMoney(totals.now) })}
                </ShopBtn>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function CartLine({ line }) {
  const { t, fmtMoney } = useI18n()
  const p = line.product
  if (!p) return null
  return (
    <li className={`cline ${line.gone ? 'is-gone' : ''}`}>
      <span className="cline__thumb"><ProductPhoto product={p} /></span>
      <span className="cline__info">
        <b>{p.name}</b>
        <span>{line.gone ? t('shop.cart.gone', { size: line.size }) : `${p.colorName} · ${t('shop.sizeShort', { size: line.size })}`}</span>
        {line.onOrder && <span className="ordertag">{t('shop.onOrder')}</span>}
        <span className="cline__row">
          <Qty small value={line.qty} max={Math.max(line.qty, line.max)} onChange={(q) => cartApi.set(line.slug, line.size, q, line.color)} />
          <button type="button" className="tlink" onClick={() => cartApi.remove(line.slug, line.size, line.color)}>{t('shop.cart.remove')}</button>
        </span>
      </span>
      <span className="cline__price">{fmtMoney(line.unit * line.qty)}{line.list > line.unit && <s>{fmtMoney(line.list * line.qty)}</s>}</span>
    </li>
  )
}

/** The order's status as the family reads it. */
export function OrderPill({ status, family }) {
  const { t } = useI18n()
  const st = family ? ({ nuevo: 'apartado' }[status] || status) : status
  return <span className={`opill opill--${st}`}>{t(`shop.status.${st}`)}</span>
}

/** One quiet line at the bottom: anything else, by WhatsApp. */
export function ShopQuiet() {
  const { t } = useI18n()
  return (
    <p className="shopquiet">{t('shop.quiet.before')}{' '}
      <a className="tlink" href={waLink(t('shop.quiet.waText'))} target="_blank" rel="noopener noreferrer">{t('shop.quiet.link')}</a>{' '}{t('shop.quiet.after')}
    </p>
  )
}
