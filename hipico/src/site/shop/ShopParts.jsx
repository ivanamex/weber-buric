import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { SiteIcon } from '../../components/site/Icons.jsx'
import { waLink } from '../../components/ui.jsx'
import {
  CATEGORIES, CATEGORY_SLUGS, categoryFromSlug, siblingsOf, stickersOf, STICKER_COLOR, stockNum, sizeOpen, onOrder,
  unitPrice, listPrice, maxQty, SIZE_GUIDE, photoBg, searchWords, matchesWords, resolveLine, cartTotals, shopPhoto, FRE_PREFIX, isFre, freAsProduct, freColors, freSizes, freExtras, freChosen, frePhotos, sizeLabel, optText, extraList, ORDER_MAX,
  AUDIENCES, PARA_SLUGS, paraFromSlug, audienceOfProduct, forAudience, LETTER_SIZES, sortSizes, colorHexFor,
} from '../../data/shop.js'
import { cartApi, fetchFre, openCart, openWish, sendWishlist, useCart, useSheet, useWish, wishApi, wishItems, wishView } from './shopApi.js'
import { wishText, wishTotal } from '../../data/shop.js'
import { FloatField } from '../FloatField.jsx'
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
// Phones that ask to save data get the photo alone (no blurred copy behind it).
const SAVE_DATA = typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData)
/** A shop photo filling its box. Its background was read from its edges when it was copied or uploaded (photosBg):
 *  one even color ('#F2F1EF': white, off-white, studio grey) fills the box with exactly that color, so the photo melts
 *  into it; 'blur' (outdoors) puts the same image blurred behind it; not read yet → a plain light box. The photo itself
 *  is always whole on top. thumb: a small cart / list thumbnail, simply cropped to fill. */
export function ProductPhoto({ product, index = 0, alt = '', thumb = false, className = '' }) {
  const src = shopPhoto(product.photos?.[index])
  const [broken, setBroken] = useState(false)
  useEffect(() => setBroken(false), [src])
  if (!src || broken) {
    return (
      <span className={`pph ${className}`} style={{ '--sw': product.colorHex }} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <SiteIcon name={product.category === 'shirts' ? 'shirt' : product.category === 'pants' ? 'pants' : product.category === 'horse' ? 'horseshoe' : 'hanger'} size={72} />
        <span className="pph__dot" aria-hidden="true" />
      </span>
    )
  }
  const bg = photoBg(product.photosBg?.[index])
  const solid = bg.startsWith('#')
  const backdrop = !thumb && bg === 'blur' && !SAVE_DATA
  const look = thumb ? 'pimg--thumb' : solid ? 'pimg--solid' : bg === 'blur' ? (backdrop ? '' : 'pimg--lite') : 'pimg--plain'
  return (
    <span className={`pimg ${look} ${className}`} style={solid && !thumb ? { background: bg } : undefined}>
      {backdrop && <img className="pimg__bg" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
      <img className="pimg__fg" src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} />
    </span>
  )
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

/** One card per product and color; the swatches jump the card to the model's other colors. */
function ProductCard({ group, hrefFor }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(group.first)
  useEffect(() => setCurrent(group.first), [group.first])
  const title = productTitle(current)
  return (
    <li>
      <article className={`pcard ${current.photos?.[1] ? '' : 'pcard--one'}`}>
        <Link to={hrefFor(current)} className="pcard__photo" aria-label={title}>
          <ProductPhoto product={current} alt={title} />
          {current.photos?.[1] && <ProductPhoto product={current} index={1} className="pimg--alt" />}
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
          <span className="pcard__see" aria-hidden="true">{t('shop.see')} <SiteIcon name="arrowRight" size={14} /></span>
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
      facets: { categories: r.categories, colors: r.colors, sizes: r.sizes, discount: r.discount },
    }))
  }, [key])
  useEffect(() => { load(0, true) }, [load])
  const more = useCallback(() => { if (state.items.length < state.total) load(state.items.length) }, [load, state.items.length, state.total])
  return { ...state, more, hasMore: state.items.length < state.total }
}

/** The filters in the address: ?para=mujer&talla=S,M&color=navy (a filtered page can be shared). */
const listParam = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean)
export function readFilters(params) {
  return { para: paraFromSlug(params.get('para')), sizes: listParam(params.get('talla')), colors: listParam(params.get('color')).map((c) => c.toLowerCase()), q: (params.get('q') || '').slice(0, 60) }
}

/**
 * The shop itself: one toolbar (category tabs in the address, ?cat=camisas; a search, ?q=; three filter menus Para ·
 * Talla · Color, one "Filtros" sheet on phones; the heart and the bag), Mara's own
 * stock first ("Entrega inmediata en el club"), then the whole FreeRide catalog ("sobre pedido", 24 at a time), and the
 * product window (?p=<slug> or ?p=fre:<handle>, so a product can be shared on WhatsApp). Used by /tienda and the app.
 */
export function ShopCatalog({ products, inApp, onAsk, gridRef, actions }) {
  const { t, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const cat = categoryFromSlug(params.get('cat')) || 'all'
  const open = params.get('p')
  const f = readFilters(params)
  const words = useMemo(() => searchWords(f.q), [f.q])
  const phone = usePhone()
  const fre = useFreList({ category: cat === 'all' ? null : cat, audience: f.para, sizes: f.sizes, colors: f.colors, ...(words.length ? { words } : {}) })
  const freFacets = fre.facets || {}
  const freCats = freFacets.categories || {}
  const freOn = Object.values(freCats).some((n) => n > 0)
  // Mara's own pieces in this tab for this audience (what the size and color menus offer), then with every filter.
  const tabMine = products.filter((p) => (cat === 'all' || p.category === cat) && forAudience(audienceOfProduct(p), f.para)
    && (!words.length || matchesWords(`${p.name} ${p.colorName || ''} ${p.model || ''}`, words)))
  const mine = tabMine.filter((p) => (!f.sizes.length || (p.variants || []).some((v) => f.sizes.includes(v.size) && sizeOpen(p, v)))
    && (!f.colors.length || f.colors.includes((p.colorName || '').toLowerCase())))
  const filtered = Boolean(f.para || f.sizes.length || f.colors.length)
  const searching = words.length > 0
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, products.filter((p) => p.category === c).length + (freCats[c] || 0)]))
  const allCount = products.length + Object.values(freCats).reduce((a, n) => a + n, 0)
  const tabs = ['all', ...CATEGORIES.filter((c) => counts[c] > 0)]
  // One card per product and color everywhere, Mara's newest first (the swatches jump to the other colors).
  const groups = useMemo(() => [...mine]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((p) => ({ key: p.slug, first: p, colors: siblingsOf(products, p) })), [mine, products])
  // Sizes: XXS…XXXL for women, men and everyone; the kids' own sizes under Niños. Only what this tab has.
  const tabSizes = [...(freFacets.sizes || []), ...tabMine.flatMap((p) => (p.variants || []).map((v) => v.size))]
  const sizeOptions = f.para === 'kids' ? sortSizes(tabSizes) : LETTER_SIZES.filter((x) => tabSizes.includes(x))
  const colorMap = new Map()
  for (const p of tabMine) if (p.colorName) colorMap.set(p.colorName.toLowerCase(), { label: p.colorName, swatch: p.colorHex })
  for (const c of freFacets.colors || []) if (!colorMap.has(c.toLowerCase())) colorMap.set(c.toLowerCase(), { label: c, swatch: colorHexFor(c) })
  for (const c of f.colors) if (!colorMap.has(c)) colorMap.set(c, { label: c, swatch: colorHexFor(c) })
  const setFilters = (next) => setParams((prev) => {
    const q = new URLSearchParams(prev)
    const put = (k, v) => (v ? q.set(k, v) : q.delete(k))
    if ('para' in next) put('para', next.para ? PARA_SLUGS[lang][next.para] : '')
    if ('sizes' in next) put('talla', next.sizes.join(','))
    if ('colors' in next) put('color', next.colors.join(','))
    if ('q' in next) put('q', next.q.trim())
    q.delete('p')
    return q
  }, { replace: true, preventScrollReset: true })
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const results = mine.length + (fre.total || 0)
  // The three filters, as menus on a computer and as one "Filtros" sheet on phones.
  const filterGroups = [
    { key: 'para', title: t('shop.para.label'), label: t('shop.filters.paraOn', { v: t(`shop.para.${f.para || 'all'}`) }), on: Boolean(f.para), badge: 0,
      options: [{ value: null, label: t('shop.para.all') }, ...AUDIENCES.map((a) => ({ value: a, label: t(`shop.para.${a}`) }))],
      selected: [f.para], onPick: (v) => setFilters({ para: v, sizes: v === f.para ? f.sizes : [] }) },
    { key: 'size', title: t('shop.filters.size'), multiple: true, badge: f.sizes.length,
      label: f.sizes.length ? t('shop.filters.sizeOn', { v: f.sizes.slice(0, 3).join(', ') + (f.sizes.length > 3 ? ` +${f.sizes.length - 3}` : '') }) : t('shop.filters.size'),
      options: [...new Set([...sizeOptions, ...f.sizes])].map((x) => ({ value: x, label: x })), selected: f.sizes, onPick: (v) => setFilters({ sizes: toggle(f.sizes, v) }) },
    { key: 'color', title: t('shop.filters.color'), multiple: true, badge: f.colors.length,
      label: f.colors.length ? t('shop.filters.colorOn', { v: (colorMap.get(f.colors[0])?.label || f.colors[0]) + (f.colors.length > 1 ? ` +${f.colors.length - 1}` : '') }) : t('shop.filters.color'),
      options: [...colorMap.entries()].map(([value, c]) => ({ value, label: c.label, swatch: c.swatch })), selected: f.colors, onPick: (v) => setFilters({ colors: toggle(f.colors, v) }) },
  ]
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
      <div className={`shopbar ${actions ? 'shopbar--sticky' : ''}`}>
        <div className="shoptabs" role="tablist" aria-label={t('shop.catLabel')}>
          {tabs.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={`shoptab ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>
              {t(c === 'pants' ? 'shop.catTab.pants' : `shop.cat.${c}`)} <span className="shoptab__n">{c === 'all' ? allCount : counts[c]}</span>
            </button>
          ))}
        </div>
        <div className="shoptools" role="group" aria-label={t('shop.filters.label')}>
          <ShopSearch value={f.q} onChange={(v) => setFilters({ q: v })} />
          {phone ? (
            <FilterSheet inApp={inApp} results={results} groups={filterGroups} count={(f.para ? 1 : 0) + f.sizes.length + f.colors.length}
              onClear={() => setFilters({ para: null, sizes: [], colors: [] })} />
          ) : filterGroups.map((g) => (
            <FilterMenu key={g.key} inApp={inApp} title={g.title} label={g.label} on={g.on} badge={g.badge} results={results}
              options={g.options} selected={g.selected} multiple={g.multiple} onPick={g.onPick} />
          ))}
        </div>
        {actions}
      </div>
      {(filtered || searching) && (
        <p className="shopstate" aria-live="polite">
          <span>{fre.loading && !fre.items.length ? '\u00a0' : t('shop.filters.results', { n: results })}</span>
          <button type="button" className="tlink" onClick={() => setFilters({ para: null, sizes: [], colors: [], q: '' })}>{t('shop.filters.clear')}</button>
        </p>
      )}
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
              {fre.items.map((item) => <FreCard key={item.handle} item={item} href={hrefFor(`${FRE_PREFIX}${item.handle}`)} />)}
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
          <p>{searching ? t('shop.search.none', { q: f.q.trim() }) : filtered ? t('shop.filters.none') : t('shop.emptyCat', { cat: t(`shop.cat.${cat}`).toLowerCase() })}</p>
          {searching ? (
            <a className="tlink" href={waLink(t('shop.search.wa', { q: f.q.trim() }))} target="_blank" rel="noopener noreferrer"><SiteIcon name="whatsapp" size={16} /> {t('shop.search.waLink')}</a>
          ) : onAsk && <button type="button" className="tlink" onClick={onAsk}>{t('shop.emptyAsk')}</button>}
        </div>
      )}
      {product && <ProductSheet key={product.model || product.slug} product={product} siblings={siblingsOf(products, product)} inApp={inApp} onClose={closeSheet} onSwitch={switchTo} onAsk={onAsk} />}
      {open && isFre(open) && <FreSheet handle={open.slice(FRE_PREFIX.length)} known={fre.items} inApp={inApp} onClose={closeSheet} onAsk={onAsk} />}
    </>
  )
}

/** A FreeRide product: its photo on white on a sand card, "Sobre pedido", the approximate price in pesos, sizes. */
function FreCard({ item, href }) {
  const { t, fmtMoney } = useI18n()
  const p = freAsProduct(item)
  const colors = freColors(item).filter(Boolean)
  const sizes = item.sizes || []
  const avail = (sz) => (item.variants || []).some((v) => v.size === sz && v.available)
  return (
    <li>
      <article className={`pcard pcard--fre ${item.images?.[1] ? '' : 'pcard--one'}`}>
        <Link to={href} className="pcard__photo" aria-label={item.title}>
          <ProductPhoto product={p} alt={item.title} />
          {item.images?.[1] && <ProductPhoto product={p} index={1} className="pimg--alt" />}
          <span className="pcard__stickers">
            <span className="sticker sticker--order">{t('shop.fre.tag')}</span>
            {item.onSale && <span className="sticker sticker--terracotta">{t('shop.sticker.promo')}</span>}
          </span>
        </Link>
        <div className="pcard__body">
          <h3 className="pcard__name"><Link to={href}>{item.title}</Link></h3>
          <div className="pcard__color"><span>{colors.length > 1 ? t('shop.fre.colors', { n: colors.length }) : colors[0] || ''}</span></div>
          <span className="pprice"><b>{fmtMoney(item.unit)}</b><small className="pprice__approx">{t('shop.fre.approxShort')}</small></span>
          {sizes.length > 0 && (
            <p className="psizes">{t('shop.sizes')}{' '}{sizes.map((sz, i) => <span key={sz}>{i ? ' · ' : ''}{avail(sz) ? sz : <s>{sz}</s>}</span>)}</p>
          )}
          <span className="pcard__see" aria-hidden="true">{t('shop.see')} <SiteIcon name="arrowRight" size={14} /></span>
        </div>
      </article>
    </li>
  )
}

/** A FreeRide product in full: its photos, colors, sizes (struck when FreeRide has none), the approximate price and
 *  "Agregar a mi lista" (Mara answers the list with her price; nothing is paid here). */
function FreSheet({ handle, known, inApp, onClose, onAsk }) {
  const { t, fmtMoney } = useI18n()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useModal(panel, onClose, closeBtn)
  const [item, setItem] = useState(() => known.find((x) => x.handle === handle) || null)
  const [missing, setMissing] = useState(false)
  // The grid's copy shows at once; the window then asks for the product itself (every photo, not only the grid's six).
  useEffect(() => {
    let live = true
    fetchFre({ handle, limit: 1 }).then((r) => { if (!live) return; if (r.items[0]) setItem(r.items[0]); else if (!r.failed) setMissing(true) })
    return () => { live = false }
  }, [handle])
  const [color, setColor] = useState(null)
  const [picked, setPicked] = useState({})
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [pulse, setPulse] = useState(0)
  const [added, setAdded] = useState(false)
  const colors = item ? freColors(item) : []
  const current = color ?? colors.find((c) => freSizes(item, c).some((v) => v.available)) ?? colors[0] ?? ''
  const extras = item ? freExtras(item, current) : []
  const chosen = item ? freChosen(item, current, picked) : {}
  const sizes = item ? freSizes(item, current, chosen) : []
  const shots = item ? frePhotos(item, current) : { photos: [], photosBg: [], mine: 0 }
  const p = item ? { ...freAsProduct(item, current), photos: shots.photos, photosBg: shots.photosBg } : null
  const add = () => {
    if (!size && sizes.length && sizes.some((v) => v.size)) { setPulse((n) => n + 1); return }
    // The exact variant's options go with the line (a product's variants don't always all name every option).
    const v = (item.variants || []).find((x) => (x.color || '') === current && (x.size || '') === (size || '') && x.available
      && Object.entries(chosen).every(([k, val]) => !x.extra?.[k] || x.extra[k] === val))
    wishApi.add(item.handle, current, size || '', qty, { name: item.title, photo: shots.photos[0] || null, unit: item.unit, category: item.category, url: item.url }, v?.extra || {})
    setAdded(true)
    setTimeout(() => { setAdded(false); onClose(); setTimeout(openWish, 80) }, 1500)
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
            <Gallery key={`${item.handle}|${current}`} product={p} title={item.title} own={shots.mine} />
            <div className="pinfo">
              <span className="pinfo__stickers">
                <span className="sticker sticker--order">{t('shop.fre.tag')}</span>
                {item.onSale && <span className="sticker sticker--terracotta">{t('shop.sticker.promo')}</span>}
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
              {extras.map((x) => (
                <div key={x.key}>
                  <p className="pinfo__label" id={`fre-${x.key}`}><span>{t(`shop.opt.${x.key}`)}</span></p>
                  <div className="seg" role="radiogroup" aria-labelledby={`fre-${x.key}`}>
                    {x.values.map(({ value, available }) => (
                      <button key={value} type="button" role="radio" aria-checked={chosen[x.key] === value} disabled={!available} className={`seg__opt ${chosen[x.key] === value ? 'is-on' : ''}`}
                        onClick={() => { setPicked({ ...chosen, [x.key]: value }); setSize(null) }}>{optText(t, value)}</button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="pinfo__approx">{t('shop.fre.approx')} <b>{fmtMoney(item.unit * qty)}</b></p>
              <div>
                <p className="pinfo__label" id="fre-size"><span>{t('shop.size')}</span>
                  {item.url && <a className="tlink" href={item.url} target="_blank" rel="noopener noreferrer">{t('shop.sizeGuide')}</a>}
                </p>
                <div className={`sizes sizes--compact ${pulse ? 'is-pulse' : ''}`} key={`p${pulse}`} role="radiogroup" aria-labelledby="fre-size">
                  {sizes.map((v) => (
                    <span key={v.size || 'u'} className="sizeopt">
                      <button type="button" role="radio" aria-checked={size === v.size} disabled={!v.available}
                        className={`sizepill is-order ${size === v.size ? 'is-on' : ''}`} onClick={() => { setSize(v.size); setQty(1) }}>{v.size ? sizeLabel(v.size) : t('shop.fre.oneSize')}</button>
                    </span>
                  ))}
                </div>
                <p className="pinfo__order">{t('shop.fre.orderLine')}</p>
                {pulse > 0 && !size && <p className="pinfo__ask" role="alert">{t('shop.chooseSize')}</p>}
              </div>
              <div className="pinfo__buy">
                <Qty value={qty} max={ORDER_MAX} onChange={setQty} />
                <ShopBtn inApp={inApp} className="shopbtn--main" onClick={add} aria-live="polite" disabled={added}>
                  {added ? <><SiteIcon name="check" size={18} /> {t('shop.wish.added')}</> : <><SiteIcon name="heart" size={18} /> {t('shop.wish.add')}</>}
                </ShopBtn>
              </div>
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
/** own: when a FreeRide product's photos are grouped by color, how many are the chosen color's (the rest dimmed). */
function Gallery({ product, title, own }) {
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
            <button key={i} type="button" className={`pgal__thumb ${photo === i ? 'is-on' : ''} ${own != null && i >= own ? 'is-dim' : ''}`} aria-label={`${title} · ${i + 1}`} aria-pressed={photo === i} onClick={() => goPhoto(i)}>
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
  const close = useCallback(() => setOpen(false), [])
  useSheet('cart', show, close)
  const lines = useCartLines(products)
  const totals = cartTotals(lines)
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
                    {lines.map((l) => <CartLine key={`${l.slug}|${l.size}`} line={l} />)}
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
      <span className="cline__thumb"><ProductPhoto product={p} thumb /></span>
      <span className="cline__info">
        <b>{p.name}</b>
        <span>{line.gone ? t('shop.cart.gone', { size: line.size }) : `${p.colorName} · ${t('shop.sizeShort', { size: line.size })}`}</span>
        {line.onOrder && <span className="ordertag">{t('shop.onOrder')}</span>}
        <span className="cline__row">
          <Qty small value={line.qty} max={Math.max(line.qty, line.max)} onChange={(q) => cartApi.set(line.slug, line.size, q)} />
          <button type="button" className="tlink" onClick={() => cartApi.remove(line.slug, line.size)}>{t('shop.cart.remove')}</button>
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

/** The heart (the wish list) and the bag (the cart) with their counts, for the shop's sticky bar and the app's band. */
export function ShopIcons({ inApp }) {
  const { t } = useI18n()
  const w = useWish().reduce((a, l) => a + l.qty, 0)
  const c = useCart().reduce((a, l) => a + l.qty, 0)
  const Btn = ({ icon, n, label, onClick }) => (
    <button type="button" className={`shopicon ${inApp ? 'shopicon--app' : ''}`} onClick={onClick} aria-label={`${label}${n ? ` (${n})` : ''}`}>
      <SiteIcon name={icon} size={22} />
      {n > 0 && <span className="shopicon__n" aria-hidden="true">{n}</span>}
    </button>
  )
  return (
    <span className="shopicons">
      <Btn icon="heart" n={w} label={t('shop.wish.title')} onClick={openWish} />
      <Btn icon="bag" n={c} label={t('shop.cart.title')} onClick={openCart} />
    </span>
  )
}

const WA_FIELDS = ['name', 'phone', 'email']
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Mi lista de deseos: the FreeRide pieces chosen, with the approximate total; "Enviar a Mara" asks for a name and a
 * WhatsApp on the website (`onSend` in the app, where the family is known), saves the list, and then offers to send it
 * by WhatsApp too. The same shell as the cart; only one of them is open at a time.
 */
export function WishDrawer({ inApp, onSend, onBrowse }) {
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  useSheet('wish', show, close)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  if (!open) return null
  return <WishPanel inApp={inApp} onSend={onSend} onBrowse={onBrowse} close={close} />
}

function WishPanel({ inApp, onSend, onBrowse, close }) {
  const { t, fmtMoney, lang } = useI18n()
  const panel = useRef(null)
  const closeBtn = useRef(null)
  useModal(panel, close, closeBtn)
  const body = useRef(null)
  const list = useWish().map(wishView)
  const total = wishTotal(list)
  const [step, setStep] = useState('list') // list | send | done
  const [f, setF] = useState({ name: '', phone: '', email: '', note: '', website: '' })
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // { number, name, text }
  useEffect(() => { body.current?.scrollTo({ top: 0 }) }, [step])

  const check = (v = f) => {
    const e = {}
    if (!v.name.trim()) e.name = t('site.enroll.errors.contact')
    if (v.phone.replace(/\D/g, '').length < 8) e.phone = t('site.enroll.errors.phone')
    if (v.email.trim() && !EMAIL_OK.test(v.email.trim())) e.email = t('site.enroll.errors.email')
    return e
  }
  const set = (k) => (ev) => { const v = { ...f, [k]: ev.target.value }; setF(v); if (tried) setErrors(check(v)) }
  // The list typed out for WhatsApp: "Hola Mara, esta es mi lista de FreeRide: 1 × … Total aproximado $4,300. Lista L-101"
  const waText = (lines, number, sum) => t('shop.wish.waText', {
    lines: lines.map((l) => wishText(l, t)).join('\n'), total: fmtMoney(sum), number,
  })
  const finish = (r, name) => {
    const text = waText(list, r.number, r.total ?? total)
    wishApi.clear()
    setDone({ number: r.number, name: (name || '').trim().split(/\s+/)[0], text })
    setStep('done')
  }
  const send = async (ev) => {
    ev?.preventDefault()
    if (busy || !list.length) return
    if (onSend) {
      setBusy(true)
      const r = await onSend({ items: wishItems(list), note: f.note.trim(), lang })
      setBusy(false)
      if (!r.ok) { setErrors({ general: t(`errors.${r.code}`) }); return }
      finish(r, r.name)
      return
    }
    if (step === 'list') { setStep('send'); return }
    setTried(true)
    const e = check()
    setErrors(e)
    const k = WA_FIELDS.find((x) => e[x])
    if (k) { body.current?.querySelector(`[name="${k}"]`)?.focus(); return }
    setBusy(true)
    const r = await sendWishlist({ items: wishItems(list), name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), note: f.note.trim(), lang, website: f.website })
    setBusy(false)
    if (!r.ok) {
      if (r.code === 'out_of_stock') { setErrors({ general: t('shop.wish.gone', { product: `${r.line?.name || ''} ${r.line?.color || ''}`.trim(), size: r.line?.size || '' }) }); return }
      const field = { badPhone: 'phone', badEmail: 'email', missing: 'name' }[r.code]
      setErrors({ [field || 'general']: t(`errors.${r.code}`) })
      return
    }
    finish(r, f.name)
  }

  return createPortal(
    <div className="cartdrw wishdrw" role="dialog" aria-modal="true" aria-labelledby="wish-title">
      <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={close} />
      <form className="cartdrw__panel" ref={panel} onSubmit={send} noValidate>
        <div className="cartdrw__head">
          <h2 id="wish-title">{t('shop.wish.title')}</h2>
          <button ref={closeBtn} type="button" className="shopdlg__close" aria-label={t('common.close')} onClick={close}><SiteIcon name="x" size={22} /></button>
        </div>
        <div className="cartdrw__body" ref={body}>
          {step === 'done' && done ? (
            <div className="cdone">
              <span className="cdone__check" aria-hidden="true"><SiteIcon name="check" size={26} /></span>
              <p className="cdone__title">{t('shop.wish.doneTitle', { name: done.name })}</p>
              <p>{t('shop.wish.doneLine', { number: done.number })}</p>
              <ShopBtn inApp={inApp} kind="sage" as="a" href={waLink(done.text)} target="_blank" rel="noopener noreferrer"><SiteIcon name="whatsapp" size={18} /> {t('shop.wish.alsoWa')}</ShopBtn>
            </div>
          ) : !list.length ? (
            <div className="cempty">
              <SiteIcon name="heart" size={44} />
              <p>{t('shop.wish.empty')}</p>
              <ShopBtn inApp={inApp} kind="line" onClick={() => { close(); onBrowse?.() }}>{t('shop.cart.browse')}</ShopBtn>
            </div>
          ) : step === 'send' ? (
            <div className="ccheck">
              <button type="button" className="sback ccheck__back tlink" onClick={() => setStep('list')}><span aria-hidden="true">←</span> {t('shop.wish.back')}</button>
              <p className="wish__lead">{t('shop.wish.sendLead')}</p>
              <div>
                <FloatField error={errors.name} label={t('site.contact.name')} className="efield"><input name="name" autoComplete="name" value={f.name} onChange={set('name')} /></FloatField>
                <FloatField error={errors.phone} label={t('shop.wish.phone')} className="efield"><input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} /></FloatField>
                <FloatField error={errors.email} label={t('shop.wish.email')} className="efield"><input name="email" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} /></FloatField>
                <FloatField label={t('shop.wish.note')} className="efield"><textarea name="note" rows={2} value={f.note} onChange={set('note')} /></FloatField>
              </div>
              <div className="cform__hp" aria-hidden="true"><label>{t('site.contact.website')}<input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
              {errors.general && <p className="cerr" role="alert">{errors.general}</p>}
            </div>
          ) : (
            <>
              <ul className="clines" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {list.map((l) => <WishLine key={`${l.handle}|${l.color}|${extraList(l.extra).join('|')}|${l.size}`} line={l} />)}
              </ul>
              <div className="csum">
                <div><span>{t('shop.wish.total')}</span><b>{fmtMoney(total)}</b></div>
                <p className="wish__terms">{t('shop.wish.terms')}</p>
              </div>
              {onSend && (
                <FloatField label={t('shop.wish.note')} className="efield"><textarea name="note" rows={2} value={f.note} onChange={set('note')} /></FloatField>
              )}
              {errors.general && <p className="cerr" role="alert">{errors.general}</p>}
            </>
          )}
        </div>
        {step !== 'done' && list.length > 0 && (
          <div className="cartdrw__foot">
            <span className="cartdrw__total"><span>{t('shop.wish.total')}</span><b>{fmtMoney(total)}</b></span>
            <ShopBtn inApp={inApp} type="submit" disabled={busy} aria-busy={busy || undefined}>
              {busy && <span className="sspin" aria-hidden="true" />}{busy ? t('shop.wish.sending') : t('shop.wish.send')}
            </ShopBtn>
          </div>
        )}
      </form>
    </div>,
    document.body,
  )
}

function WishLine({ line }) {
  const { t, fmtMoney } = useI18n()
  const p = { name: line.name, colorName: line.color, colorHex: '#FFFFFF', category: line.category, photos: line.photo ? [line.photo] : [] }
  return (
    <li className="cline">
      <span className="cline__thumb"><ProductPhoto product={p} thumb /></span>
      <span className="cline__info">
        <b>{line.name}</b>
        <span>{[line.color, ...extraList(line.extra).map((v) => optText(t, v)), line.size && t('shop.sizeShort', { size: line.size })].filter(Boolean).join(' · ')}</span>
        <span className="cline__row">
          <Qty small value={line.qty} max={ORDER_MAX} onChange={(q) => wishApi.set(line, q)} />
          <button type="button" className="tlink" onClick={() => wishApi.remove(line)}>{t('shop.cart.remove')}</button>
        </span>
      </span>
      <span className="cline__price">{fmtMoney(line.unit * line.qty)}<small>{t('shop.fre.approxShort')}</small></span>
    </li>
  )
}

const PHONE = '(max-width: 599px)'
function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(PHONE).matches)
  useEffect(() => {
    const m = window.matchMedia?.(PHONE)
    if (!m) return undefined
    const on = () => setPhone(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return phone
}

/**
 * One filter menu: a pill button ("Talla: S, M ▾" with a count badge) and a card under it with the choices (radio for
 * Para, checkboxes for Talla and Color); arrows move, Esc or a click outside closes. On phones it is a small bottom sheet
 * with "Ver N productos". Choices apply at once.
 */
/** A filter's choices: radio dots (one) or boxes (several), a swatch for colors. */
function OptionList({ label, options, selected, multiple, onPick, onKeyDown }) {
  const { t } = useI18n()
  return (
    <div className="fmenu__list" role="menu" aria-label={label} onKeyDown={onKeyDown}>
      {options.length ? options.map((o) => {
        const sel = selected.includes(o.value)
        return (
          <button key={String(o.value)} type="button" role={multiple ? 'menuitemcheckbox' : 'menuitemradio'} aria-checked={sel} className={`fmenu__opt ${sel ? 'is-on' : ''}`}
            onClick={() => onPick(o.value)}>
            <span className={`fmenu__tick ${multiple ? 'is-box' : 'is-dot'}`} aria-hidden="true">{sel && <SiteIcon name="check" size={14} />}</span>
            {o.swatch && <span className="fmenu__sw" style={{ '--sw': o.swatch }} aria-hidden="true" />}
            <span className="fmenu__label">{o.label}</span>
          </button>
        )
      }) : <p className="fmenu__none">{t('shop.filters.noneHere')}</p>}
    </div>
  )
}

/** "Buscar en la tienda": name and color of Mara's stock and FreeRide's, in the address (?q=) a moment after typing. */
function ShopSearch({ value, onChange }) {
  const { t } = useI18n()
  const [text, setText] = useState(value)
  const input = useRef(null)
  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (text.trim() === value.trim()) return undefined
    const id = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(id)
  }, [text, value, onChange])
  return (
    <form className={`shopsearch ${text ? 'has-text' : ''}`} role="search" onSubmit={(e) => { e.preventDefault(); onChange(text); input.current?.blur() }}>
      <SiteIcon name="search" size={18} />
      <input ref={input} type="search" value={text} maxLength={60} enterKeyHint="search" aria-label={t('shop.search.placeholder')} placeholder={t('shop.search.placeholder')}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape' && text) { e.stopPropagation(); setText(''); onChange('') } }} />
      {text && <button type="button" className="shopsearch__x" aria-label={t('shop.search.clear')} onClick={() => { setText(''); onChange(''); input.current?.focus() }}><SiteIcon name="x" size={16} /></button>}
    </form>
  )
}

/** Phones: one "Filtros" button and one sheet with Para, Talla and Color; choices apply at once. */
function FilterSheet({ groups, results, count, onClear, inApp }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const btn = useRef(null)
  const close = useCallback(() => { setOpen(false); btn.current?.focus() }, [])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close() } }
    window.addEventListener('keydown', onKey)
    const unlock = lockScroll()
    return () => { window.removeEventListener('keydown', onKey); unlock() }
  }, [open, close])
  return (
    <>
      <button ref={btn} type="button" className={`fmenu__btn shopfilterbtn ${count ? 'is-on' : ''}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <SiteIcon name="sliders" size={16} /><span className="fmenu__text">{t('shop.filters.button')}</span>
        {count > 0 && <span className="fmenu__n" aria-hidden="true">{count}</span>}
      </button>
      {open && createPortal(
        <div className="fsheet" role="dialog" aria-modal="true" aria-label={t('shop.filters.button')}>
          <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={close} />
          <div className="fsheet__panel">
            <div className="fsheet__head">
              <h2>{t('shop.filters.button')}</h2>
              <button type="button" className="shopdlg__close" aria-label={t('common.close')} onClick={close}><SiteIcon name="x" size={22} /></button>
            </div>
            <div className="fsheet__body">
              {groups.map((g) => (
                <section key={g.key} className="fsheet__group">
                  <h3>{g.title}</h3>
                  <OptionList label={g.title} options={g.options} selected={g.selected} multiple={g.multiple} onPick={g.onPick} />
                </section>
              ))}
            </div>
            <div className="fsheet__foot">
              {count > 0 && <button type="button" className="tlink" onClick={onClear}>{t('shop.filters.clear')}</button>}
              <ShopBtn inApp={inApp} onClick={close}>{t('shop.filters.see', { n: results })}</ShopBtn>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export function FilterMenu({ title, label, options, selected, onPick, multiple, badge = 0, on, results, inApp }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const phone = usePhone()
  const btn = useRef(null)
  const card = useRef(null)
  const close = useCallback((focus) => { setOpen(false); if (focus) btn.current?.focus() }, [])
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!card.current?.contains(e.target) && !btn.current?.contains(e.target)) close() }
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(true) } }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    const first = card.current?.querySelector('[aria-checked="true"]') || card.current?.querySelector('[role^="menuitem"]')
    first?.focus({ preventScroll: true })
    const unlock = phone ? lockScroll() : null
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); unlock?.() }
  }, [open, phone, close])
  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const items = [...card.current.querySelectorAll('[role^="menuitem"]')]
    const i = items.indexOf(document.activeElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }
  const list = <OptionList label={title} options={options} selected={selected} multiple={multiple} onKeyDown={onKeyDown}
    onPick={(v) => { onPick(v); if (!multiple && !phone) close(true) }} />
  return (
    <div className="fmenu">
      <button ref={btn} type="button" className={`fmenu__btn ${on || badge ? 'is-on' : ''} ${open ? 'is-open' : ''}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="fmenu__text">{label}</span>
        {badge > 0 && <span className="fmenu__n" aria-hidden="true">{badge}</span>}
        <SiteIcon name="chevronDown" size={16} />
      </button>
      {open && !phone && <div className="fmenu__card" ref={card}>{list}</div>}
      {open && phone && createPortal(
        <div className="fsheet" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="shopdlg__scrim" aria-hidden="true" tabIndex={-1} onClick={() => close(true)} />
          <div className="fsheet__panel" ref={card}>
            <div className="fsheet__head">
              <h2>{title}</h2>
              <button type="button" className="shopdlg__close" aria-label={t('common.close')} onClick={() => close(true)}><SiteIcon name="x" size={22} /></button>
            </div>
            <div className="fsheet__body">{list}</div>
            <div className="fsheet__foot"><ShopBtn inApp={inApp} onClick={() => close(true)}>{t('shop.filters.see', { n: results })}</ShopBtn></div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
