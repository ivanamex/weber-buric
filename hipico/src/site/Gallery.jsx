import { useCallback, useEffect, useRef, useState } from 'react'
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
const prefixTag = (name) => GALLERY_FILTERS.find((f) => name.startsWith(`${f}-`))

/** Every photo in public/img/gallery/, the club photos and the clips; the families photo first. */
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
  const lead = photos.findIndex((g) => g.name === 'families')
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

/** A clip in the strip: muted, looping, playing only while on screen (reduced motion: the poster). */
function StripClip({ g }) {
  const ref = useRef(null)
  const [still, setStill] = useState(true)
  useEffect(() => { setStill(reducedMotion()) }, [])
  useEffect(() => {
    const v = ref.current
    if (still || !v) return undefined
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.3 })
    io.observe(v)
    return () => { io.disconnect(); v.pause() }
  }, [still])
  if (still) return <img src={g.src} width={g.w} height={g.h} alt="" loading="lazy" decoding="async" draggable="false" />
  return <video ref={ref} src={g.video} poster={g.src} muted loop playsInline preload="none" aria-hidden="true" />
}

/**
 * "Familias que montan juntas": a dark film strip with sprocket holes. Drag it with the mouse (momentum, then it
 * settles on the nearest photo), swipe it on phones, scroll it sideways on a trackpad, or use the arrows.
 * A photo opens the lightbox; clips play muted in the strip and with controls in the lightbox.
 */
export function FilmStrip() {
  const { t } = useI18n()
  const row = useRef(null)
  const drag = useRef(null)
  const glide = useRef(0)
  const [open, setOpen] = useState(null)
  const alt = useCallback((g) => {
    const key = g.alt || GALLERY_ALT[g.name]
    if (key) return t(`site.alt.${key}`)
    const tag = prefixTag(g.name)
    return (tag ? g.name.slice(tag.length + 1) : g.name).replace(/[-_]+/g, ' ')
  }, [t])
  const settle = () => {
    const el = row.current
    if (!el) return
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0
    let best = 0
    let dist = Infinity
    for (const c of el.children) {
      const d = Math.abs(c.offsetLeft - pad - el.scrollLeft)
      if (d < dist) { dist = d; best = c.offsetLeft - pad }
    }
    el.scrollTo({ left: best, behavior: 'smooth' })
    setTimeout(() => el.classList.remove('is-drag'), 450)
  }
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return
    cancelAnimationFrame(glide.current)
    const el = row.current
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: 0, lastX: e.clientX, lastT: performance.now(), v: 0 }
    el.classList.add('is-drag')
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const el = row.current
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 4 && !el.hasPointerCapture?.(e.pointerId)) el.setPointerCapture?.(e.pointerId)
    el.scrollLeft = d.left - dx
    d.moved = Math.max(d.moved, Math.abs(dx))
    const now = performance.now()
    if (now > d.lastT) { d.v = (e.clientX - d.lastX) / (now - d.lastT); d.lastX = e.clientX; d.lastT = now }
  }
  const onPointerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = { moved: d.moved, done: true }
    const el = row.current
    let v = -d.v * 16 // px per frame
    const step = () => {
      if (Math.abs(v) < 0.6) { settle(); return }
      el.scrollLeft += v
      v *= 0.92
      glide.current = requestAnimationFrame(step)
    }
    step()
  }
  const onClickCapture = (e) => {
    if (drag.current?.done && drag.current.moved > 6) { e.preventDefault(); e.stopPropagation() }
    drag.current = null
  }
  const by = (dir) => {
    const el = row.current
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.6), behavior: 'smooth' })
  }
  return (
    <div className="sfilm">
      <ul className="sfilm__row" ref={row} aria-label={t('site.families.label')}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture} onDragStart={(e) => e.preventDefault()}>
        {ITEMS.map((g, i) => (
          <li key={g.src} style={{ '--ratio': g.w / g.h }}>
            <button type="button" className="sfilm__item" aria-label={t('site.gallery.open', { name: alt(g) })}
              onClick={(e) => setOpen({ i, from: e.currentTarget })}>
              {g.video ? <StripClip g={g} /> : <img src={g.src} width={g.w} height={g.h} alt="" loading={i < 3 ? 'eager' : 'lazy'} decoding="async" draggable="false" />}
              {g.video && <span className="sfilm__play" aria-hidden="true"><SiteIcon name="play" size={16} /></span>}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="sfilm__arrow sfilm__arrow--prev" aria-label={t('site.gallery.prev')} onClick={() => by(-1)}><SiteIcon name="arrowRight" size={22} /></button>
      <button type="button" className="sfilm__arrow sfilm__arrow--next" aria-label={t('site.gallery.next')} onClick={() => by(1)}><SiteIcon name="arrowRight" size={22} /></button>
      {open != null && <Lightbox items={ITEMS} start={open.i} alt={alt} onClose={() => { const f = open.from; setOpen(null); f?.focus?.() }} />}
    </div>
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
