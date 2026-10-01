// Website motion: letters that rise, blocks that reveal once (12 px + fade), headlines whose weight grows
// (Outfit is variable), manifesto words that go from faint to ink with the scroll. Image zooms and the
// progress line use CSS scroll-driven animations where the browser has them (site.css).
// prefers-reduced-motion: everything is shown at once, nothing moves.
import { useEffect, useRef } from 'react'

export const reducedMotion = () => typeof window === 'undefined' || !window.matchMedia
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)

/** Mark [data-reveal] and [data-kinetic] blocks .is-in once they scroll into view (also blocks that load later). */
export function useReveal(root, key) {
  useEffect(() => {
    const el = root.current
    if (!el || reducedMotion()) return undefined
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
    }), { rootMargin: '0px 0px -10% 0px' })
    const watch = () => el.querySelectorAll('[data-reveal]:not(.is-in), [data-kinetic]:not(.is-in)').forEach((n) => io.observe(n))
    watch()
    const mo = new MutationObserver(watch)
    mo.observe(el, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [root, key])
}

/**
 * A headline that rises letter by letter (~25 ms apart, once). The word between *stars* is filled with the
 * flamboyán → coral gradient. Screen readers get the plain text.
 */
export function Letters({ text, as: Tag = 'h1', className = '' }) {
  let i = 0
  const plain = text.replace(/\*/g, '')
  const words = text.split(' ')
  return (
    <Tag className={`letters ${className}`} aria-label={plain} style={{ '--n': [...plain].length }}>
      {words.map((raw, wi) => {
        const accent = /^\*.*\*[.,!?]?$/.test(raw)
        const w = raw.replace(/\*/g, '')
        const tail = accent ? (w.match(/[.,!?]$/) || [''])[0] : ''
        const core = tail ? w.slice(0, -1) : w
        return (
          <span key={wi} className="letters__word" aria-hidden="true">
            <span className={accent ? 'gword' : undefined}>
              {[...core].map((ch, ci) => <span key={ci} className="letters__ch" style={{ '--i': i++ }}>{ch}</span>)}
            </span>
            {[...tail].map((ch, ci) => <span key={`t${ci}`} className="letters__ch" style={{ '--i': i++ }}>{ch}</span>)}
            {wi < words.length - 1 && <span className="letters__sp" style={{ '--i': i++ }}> </span>}
          </span>
        )
      })}
    </Tag>
  )
}

/** A section headline: weight 300 → 650 as it comes into view (once). One *word* can carry the gradient. */
export function Kinetic({ text, as: Tag = 'h2', className = '', id }) {
  const parts = text.split(/(\*[^*]+\*)/)
  return (
    <Tag id={id} className={`kinetic ${className}`} data-kinetic="">
      {parts.map((p, i) => (p.startsWith('*') ? <span key={i} className="gword">{p.slice(1, -1)}</span> : p))}
    </Tag>
  )
}

/** A sentence whose words go from faint to full ink while it crosses the screen. */
export function ScrollWords({ text, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const words = [...el.querySelectorAll('.swords__w')]
    if (reducedMotion()) { words.forEach((w) => w.classList.add('is-lit')); return undefined }
    let raf = 0
    const move = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)))
      const lit = Math.round(p * words.length)
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(move) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    move()
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [text])
  return (
    <p ref={ref} className={`swords ${className}`}>
      {text.split(' ').map((w, i) => <span key={i} className="swords__w">{w} </span>)}
    </p>
  )
}

/** One of the big portrait photos: 800 px for phones, 1600 px for big screens. */
export function BigPhoto({ photo, alt, eager = false, className = '', sizes = '100vw' }) {
  return (
    <img className={className} src={photo.src} srcSet={`${photo.small} 800w, ${photo.src} 1600w`} sizes={sizes}
      width={photo.w} height={photo.h} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      fetchPriority={eager ? 'high' : undefined} style={photo.position ? { objectPosition: photo.position } : undefined} />
  )
}

/** A club photo (~1000 px) at medium size. */
export function ClubPhoto({ photo, alt, className = '', position }) {
  return (
    <img className={className} src={photo.src} width={photo.w} height={photo.h} alt={alt} loading="lazy" decoding="async"
      style={position ? { objectPosition: position } : undefined} />
  )
}
