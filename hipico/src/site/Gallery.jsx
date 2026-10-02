import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SiteIcon } from '../components/site/Icons.jsx'
import { GALLERY_CLIPS } from './content.js'
import GALLERY from 'virtual:gallery'

// Alt text for known photos; any other file gets its name as a short description.
const GALLERY_ALT = {
  'jump-bay': 'jumpBay', 'families-celebrating': 'families', 'jump-grey': 'jumpGrey', 'rosette-campeon': 'rosette',
  'rider-buckskin': 'rider', 'paddock-herd': 'paddock', 'horse-fence': 'fence', 'girl-horse-closeup': 'closeup',
  'girl-horse-nose': 'nose', 'girl-riding-flamboyan': 'riding', 'horse-blaze': 'hero', 'paddock-face': 'paddockFace',
  'jump-sunset': 'jumpSunset', 'grooming-hands': 'grooming', 'hooves-sand-sunset': 'hooves',
}
const MIN_SET = 3200 // px at the tallest row: one set is always wider than the widest screen, so the loop never shows a gap

/** Photos and clips, one clip after every photo or two. */
function mix(photos, clips) {
  const out = []
  let c = 0
  photos.forEach((p, i) => {
    out.push(p)
    if (i % 2 === 1 && c < clips.length) out.push(clips[c++])
  })
  return out.concat(clips.slice(c))
}
const ITEMS = mix(GALLERY, GALLERY_CLIPS)

/** One slow row of photos and clips (pauses on hover); a tile opens the lightbox. */
export function GalleryRow() {
  const { t } = useI18n()
  const [open, setOpen] = useState(null)
  const alt = (g) => (g.alt ? t(`site.alt.${g.alt}`) : GALLERY_ALT[g.name] ? t(`site.alt.${GALLERY_ALT[g.name]}`) : g.name.replace(/[-_]+/g, ' '))
  const width = ITEMS.reduce((s, g) => s + 420 * (g.w / g.h) + 24, 0)
  const copies = Math.max(1, Math.ceil(MIN_SET / width))
  const set = Array.from({ length: copies }, () => ITEMS).flat()
  return (
    <div className={`sgallery ${open != null ? 'is-paused' : ''}`} role="group" aria-label={t('site.gallery.label')}>
      <div className="sgallery__row">
        <div className="sgallery__track">
          {[0, 1].map((copy) => set.map((g, i) => {
            const hidden = copy > 0 || i >= ITEMS.length
            return (
              <button key={`${copy}-${i}`} type="button" className="sgallery__item" style={{ '--ratio': g.w / g.h }}
                aria-hidden={hidden ? 'true' : undefined} tabIndex={hidden ? -1 : undefined}
                aria-label={t('site.gallery.open', { name: alt(g) })} onClick={(e) => setOpen({ i: i % ITEMS.length, from: e.currentTarget })}>
                <img src={g.src} width={g.w} height={g.h} alt="" loading="lazy" decoding="async" />
                {g.video && <span className="sgallery__play" aria-hidden="true"><SiteIcon name="play" size={18} /></span>}
              </button>
            )
          }))}
        </div>
      </div>
      {open != null && <Lightbox items={ITEMS} start={open.i} alt={alt} onClose={() => { const f = open.from; setOpen(null); f?.focus?.() }} />}
    </div>
  )
}

/** Full screen: arrows, swipe, Esc. Clips play muted in a loop. */
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
          <video key={g.video} src={g.video} poster={g.src} muted autoPlay loop playsInline aria-label={alt(g)} />
        ) : (
          <img key={g.src} src={g.src} width={g.w} height={g.h} alt={alt(g)} />
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
