import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { BIG, GALLERY_CLIPS, GALLERY_FILTERS, GALLERY_TAGS, PHOTOS } from './content.js'
import { reducedMotion } from './motion.jsx'
import GALLERY from 'virtual:gallery'

// Alt text for known photos; any other file gets its name (without the tag prefix) as a short description.
const GALLERY_ALT = {
  'jump-bay': 'jumpBay', 'families-celebrating': 'families', 'jump-grey': 'jumpGrey', 'rosette-campeon': 'rosette',
  'rider-buckskin': 'rider', 'paddock-herd': 'paddock', 'horse-fence': 'fence', 'girl-horse-closeup': 'closeup',
  'girl-horse-nose': 'nose', 'girl-riding-flamboyan': 'riding', 'horse-blaze': 'hero', 'paddock-face': 'paddockFace',
  'jump-sunset': 'jumpSunset', 'grooming-hands': 'grooming', 'hooves-sand-sunset': 'hooves',
  'kid-pony-flamboyan': 'kidPony', 'horse-rope-jungle': 'horseJungle',
}
const FIRST = 12 // shown before "Ver más fotos"
const GAP = 12
const UNIT = 4 // grid row unit (px): each tile spans as many rows as its height needs

const prefixTag = (name) => GALLERY_FILTERS.find((f) => name.startsWith(`${f}-`))

/** Every photo in public/img/gallery/, the club photos and the clips, each with a tag; the warm sunset jump first. */
function buildItems() {
  const seen = new Set()
  const photos = []
  const add = (g) => { if (!seen.has(g.src)) { seen.add(g.src); photos.push(g) } }
  GALLERY.forEach((g) => add({ ...g, tag: GALLERY_TAGS[g.name] || prefixTag(g.name) }))
  Object.entries(PHOTOS).forEach(([k, p]) => add({ name: k, src: p.src, w: p.w, h: p.h, alt: k, tag: GALLERY_TAGS[k] }))
  Object.entries(BIG).forEach(([k, p]) => add({ name: k, src: p.small || p.src, large: p.src, w: p.w, h: p.h, alt: k, tag: GALLERY_TAGS[k] }))
  // a clip of the same shot as a photo plays in that photo's tile, so the grid never shows it twice
  const clips = []
  GALLERY_CLIPS.forEach((c) => {
    const p = photos.find((g) => g.name === c.photo)
    if (p) Object.assign(p, { video: c.video, tag: p.tag || c.tag })
    else clips.push(c)
  })
  const lead = photos.findIndex((g) => g.name === 'jump-sunset')
  if (lead > 0) photos.unshift(photos.splice(lead, 1)[0])
  // the other clips: one after every two photos
  const out = []
  let c = 0
  photos.forEach((p, i) => {
    out.push(p)
    if (i % 2 === 1 && c < clips.length) out.push(clips[c++])
  })
  return out.concat(clips.slice(c))
}
const ITEMS = buildItems()

/** Galería: filters, a masonry grid (3 columns on a computer, 2 on tablets and phones), the lightbox. */
export function Gallery() {
  const { t } = useI18n()
  const [filter, setFilter] = useState('all')
  const [all, setAll] = useState(false)
  const [open, setOpen] = useState(null)
  const [width, setWidth] = useState(0)
  const grid = useRef(null)
  const alt = useCallback((g) => {
    const key = g.alt || GALLERY_ALT[g.name]
    if (key) return t(`site.alt.${key}`)
    const tag = prefixTag(g.name)
    return (tag ? g.name.slice(tag.length + 1) : g.name).replace(/[-_]+/g, ' ')
  }, [t])
  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const filters = ['all', ...GALLERY_FILTERS.filter((f) => ITEMS.some((g) => g.tag === f))]
  const list = useMemo(() => (filter === 'all' ? ITEMS : ITEMS.filter((g) => g.tag === filter)), [filter])
  const shown = all ? list : list.slice(0, FIRST)
  const cols = width >= 1000 ? 3 : 2
  const colW = width ? (width - GAP * (cols - 1)) / cols : 0
  return (
    <div className="sgal">
      <div className="sgal__filters" role="group" aria-label={t('site.gallery.filterLabel')}>
        {filters.map((f) => (
          <button key={f} type="button" className={filter === f ? 'is-on' : ''} aria-pressed={filter === f}
            onClick={() => { setFilter(f); setAll(false) }}>{t(`site.gallery.filters.${f}`)}</button>
        ))}
      </div>
      <ul className="sgal__grid" ref={grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-label={t('site.gallery.label')}>
        {colW > 0 && shown.map((g, i) => {
          const span = i === 0 && cols > 1 ? 2 : 1
          const w = colW * span + GAP * (span - 1)
          const h = Math.round(w * g.h / g.w)
          return (
            <li key={g.src} style={{ gridColumn: `span ${span}`, gridRowEnd: `span ${Math.ceil((h + GAP) / UNIT)}`, height: h }}>
              <Tile g={g} label={t('site.gallery.open', { name: alt(g) })} eager={i < 3}
                onOpen={(e) => setOpen({ i: list.indexOf(g), from: e.currentTarget })} />
            </li>
          )
        })}
      </ul>
      {!all && list.length > FIRST && (
        <div className="sgal__more">
          <button type="button" className="sbtn sbtn--line" onClick={() => setAll(true)}>{t('site.gallery.more', { n: list.length - FIRST })}</button>
        </div>
      )}
      {open != null && <Lightbox items={list} start={open.i} alt={alt} onClose={() => { const f = open.from; setOpen(null); f?.focus?.() }} />}
    </div>
  )
}

/** A tile: the photo (or the clip's poster with a play mark). On a computer a clip plays muted while hovered. */
function Tile({ g, label, eager, onOpen }) {
  const [play, setPlay] = useState(false)
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches && !reducedMotion()
  return (
    <button type="button" className="sgal__item" aria-label={label} onClick={onOpen}
      onMouseEnter={g.video ? () => { if (canHover()) setPlay(true) } : undefined}
      onMouseLeave={g.video ? () => setPlay(false) : undefined}>
      <img src={g.src} width={g.w} height={g.h} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
      {play && <video className="sgal__clip" src={g.video} poster={g.src} muted autoPlay loop playsInline aria-hidden="true" />}
      {g.video && <span className="sgal__play" aria-hidden="true"><SiteIcon name="play" size={18} /></span>}
    </button>
  )
}

/** Full screen: arrows, swipe, Esc, a counter and the alt text as caption. Clips play with controls. */
function Lightbox({ items, start, alt, onClose }) {
  const { t } = useI18n()
  const [i, setI] = useState(start)
  const closeRef = useRef(null)
  const touch = useRef(null)
  const go = useCallback((d) => setI((n) => (n + d + items.length) % items.length), [items.length])
  useEffect(() => {
    closeRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [go, onClose])
  const g = items[i]
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (Math.abs(dx) > 44) go(dx < 0 ? 1 : -1)
  }
  return createPortal(
    <div className="slight" role="dialog" aria-modal="true" aria-label={t('site.gallery.dialog')} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button type="button" className="slight__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <figure className="slight__stage">
        {g.video ? (
          <video key={g.video} src={g.video} poster={g.src} muted autoPlay loop playsInline controls aria-label={alt(g)} />
        ) : (
          <img key={g.src} src={g.large || g.src} width={g.w} height={g.h} alt={alt(g)} />
        )}
        <figcaption className="slight__caption">
          <span>{alt(g)}</span>
          <span className="slight__count">{t('site.gallery.count', { n: i + 1, total: items.length })}</span>
        </figcaption>
      </figure>
      <button type="button" className="slight__btn slight__btn--prev" aria-label={t('site.gallery.prev')} onClick={() => go(-1)}><SiteIcon name="arrowRight" size={26} /></button>
      <button type="button" className="slight__btn slight__btn--next" aria-label={t('site.gallery.next')} onClick={() => go(1)}><SiteIcon name="arrowRight" size={26} /></button>
      <button ref={closeRef} type="button" className="slight__btn slight__close" aria-label={t('site.gallery.close')} onClick={onClose}><SiteIcon name="x" size={24} /></button>
    </div>,
    document.body,
  )
}
