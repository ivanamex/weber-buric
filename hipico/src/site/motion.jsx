// Website motion: letters that rise, sections and photos that reveal, numbers that count up, and the
// giant outlined word band. Only IntersectionObserver, requestAnimationFrame and CSS; all of it is off
// with prefers-reduced-motion (everything is simply shown).
import { useEffect, useRef, useState } from 'react'

export const reducedMotion = () => typeof window === 'undefined' || !window.matchMedia
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)

/** Reveal [data-reveal] blocks and [data-photo] frames once they scroll into view. Re-runs on each page. */
export function useReveal(root, key) {
  useEffect(() => {
    const el = root.current
    if (!el || reducedMotion()) return undefined
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
    }), { rootMargin: '0px 0px -8% 0px' })
    const watch = () => el.querySelectorAll('[data-reveal]:not(.is-in), [data-photo]:not(.is-in)').forEach((n) => io.observe(n))
    watch()
    const mo = new MutationObserver(watch) // blocks that arrive later (prices, events, horses for sale)
    mo.observe(el, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [root, key])
}

/** A headline that rises letter by letter (~25 ms apart, once). Screen readers get the plain text. */
export function Letters({ text, as: Tag = 'h1', className = '' }) {
  let i = 0
  const words = text.split(' ')
  return (
    <Tag className={`letters ${className}`} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="letters__word" aria-hidden="true">
          {[...w].map((ch, ci) => <span key={ci} className="letters__ch" style={{ '--i': i++ }}>{ch}</span>)}
          {wi < words.length - 1 && <span className="letters__sp" style={{ '--i': i++ }}> </span>}
        </span>
      ))}
    </Tag>
  )
}

/** A number that counts up when it comes into view. Without a real figure it shows "—". */
export function Counter({ value, suffix = '' }) {
  const ref = useRef(null)
  const real = typeof value === 'number' && value > 0
  const [shown, setShown] = useState(real && reducedMotion() ? value : 0)
  useEffect(() => {
    if (!real || reducedMotion()) { if (real) setShown(value); return undefined }
    const el = ref.current
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / 1400)
        setShown(Math.round(value * (1 - (1 - p) ** 3)))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [real, value])
  return <span ref={ref} className="counter__num">{real ? `${shown.toLocaleString('es-MX')}${suffix}` : '—'}</span>
}

/** "HÍPICO · RIVIERA MAYA · PAAMUL ·" in huge outlined letters that slide sideways with the scroll
 *  and fill with coral while they cross the middle of the screen. */
export function WordBand({ words }) {
  const band = useRef(null)
  const track = useRef(null)
  useEffect(() => {
    if (reducedMotion()) return undefined
    const el = band.current
    const tr = track.current
    const spans = [...tr.querySelectorAll('.wband__word')]
    let raf = 0
    let visible = false
    const move = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth
      const progress = (vh - r.top) / (vh + r.height) // 0 → 1 while the band crosses the screen
      tr.style.transform = `translate3d(${(-progress * tr.scrollWidth * 0.33).toFixed(1)}px, 0, 0)`
      for (const s of spans) {
        const b = s.getBoundingClientRect()
        const mid = b.left + b.width / 2
        s.classList.toggle('is-lit', Math.abs(mid - vw / 2) < Math.max(b.width / 2, vw * 0.12))
      }
    }
    const onScroll = () => { if (visible && !raf) raf = requestAnimationFrame(move) }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) onScroll() })
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])
  const all = [...words, ...words, ...words]
  return (
    <div className="wband" ref={band} aria-hidden="true">
      <div className="wband__track" ref={track}>
        {all.map((w, i) => <span key={i} className="wband__word">{w}<span className="wband__dot">·</span></span>)}
      </div>
    </div>
  )
}

/** A real club photo in a frame: soft zoom (1.06 → 1) and a slight reveal mask when it comes into view. */
export function Photo({ src, alt, width, height, eager = false, className = '', position }) {
  return (
    <figure className={`sphoto ${className}`} data-photo="">
      <img src={src} alt={alt} width={width} height={height} loading={eager ? 'eager' : 'lazy'} decoding="async"
        fetchPriority={eager ? 'high' : undefined} style={position ? { objectPosition: position } : undefined} />
    </figure>
  )
}
