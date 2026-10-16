import { useEffect, useRef } from 'react'

// The footer course: Ivana's fence illustrations (a vertical, an oxer, a wall with flower boxes) standing on a dotted
// ground line, three on a computer and two on phones, and her rider-and-horse silhouettes running and jumping them.
const fencesFor = (w) => (w < 900 ? [0.25, 0.75] : [0.22, 0.5, 0.78])
const GAIT = ['canter-1', 'canter-2', 'canter-3', 'canter-4', 'canter-5', 'canter-6'] // public/img/course/canter-N.png
const HORSE = ['takeoff', 'over', 'landing'] // public/img/course/horse-<pose>.png
const FENCES = ['fence-1', 'fence-2', 'fence-3']
const RUN = 9000 // across the band
const PAUSE = 2000 // then again from the left
const FRAME_TO_FENCE = 1.9 // the horse image's height ÷ the fence's: the withers sit about 1.1× the fence
const FRAME = 415 // px: every pose is drawn at one scale, set by the jump poses' frame height
const PEAK = 1.2 // the lowest hoof at the top of the arc, × the fence (20 % over the top pole)
const REACH = 0.85 // take-off and landing, in horse-lengths from the fence's middle…
const CLEAR = 1.9 // …or this many half-fence-widths, whichever is longer, so the legs clear a wide oxer
const BODY = 0.58 // where the horse's middle sits along its length, from the tail (for the start and end of the run)
const FRAME_MS = 90 // ms per canter frame: the six frames make one stride of about 0.55 s
const BOB = 2 // px: a light lift in the moment all four hooves are off the ground (the sixth frame)
const FADE = 120 // ms to cross-fade into and out of the jump poses
const INK = 'rgba(51,53,42,.5)'
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** An image with its opaque part (in image pixels): left, right, bottom, and the horizontal centre of mass (`mid`). */
function load(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, c.width, c.height).data
      let left = c.width
      let right = 0
      let bottom = 0
      let sum = 0
      let n = 0
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 128) { if (x < left) left = x; if (x > right) right = x; if (y > bottom) bottom = y; sum += x; n++ }
        }
      }
      resolve({ img, w: c.width, h: c.height, left, right: right + 1, bottom: bottom + 1, mid: n ? sum / n : c.width / 2 })
    }
    img.onerror = reject
    img.src = src
  })
}
const loadAll = (names) => Promise.all(names.map((n) => load(`/img/course/${HORSE.includes(n) ? `horse-${n}` : n}.png`).then((v) => [n, v]))).then(Object.fromEntries)

/**
 * The course in the footer band: the horse canters in from the left on the dotted line (Ivana's six canter frames,
 * 90 ms each, with a light lift in the moment of suspension, at a steady speed), takes off before each fence, is over it
 * at the top of the arc, lands after it and canters on; 9 s across, a 2 s pause, and again from the left whenever the
 * band is on screen. Jump poses cross-fade in 120 ms. Reduced motion: the first canter frame standing at the start line.
 */
export function CourseHorse() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    let art = null
    let ctx = null
    let w = 0
    let h = 0
    let fh = 66
    let scale = 1
    let raf = 0
    let alive = true
    let visible = false
    let start = null
    let shown = { key: 'run', pose: GAIT[0], since: -1e9, prev: GAIT[0] }
    const layout = () => {
      w = canvas.parentElement.clientWidth
      h = canvas.parentElement.clientHeight
      fh = w < 600 ? 34 : 66
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.height = `${h}px`
      ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingQuality = 'high'
      scale = (FRAME_TO_FENCE * fh) / FRAME
    }
    // Each fence scaled by its own height (so the three are the same height), its bottom edge on the line.
    const fenceBox = (name) => { const f = art[name]; const k = fh / f.bottom; return { f, k, half: ((f.right - f.left) * k) / 2 } }
    const drawFences = (ground, fences) => {
      ctx.save()
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.setLineDash([2, 7])
      ctx.beginPath(); ctx.moveTo(16, ground + 0.5); ctx.lineTo(w - 16, ground + 0.5); ctx.stroke()
      ctx.restore()
      if (!art) return
      fences.forEach((fx, i) => {
        const { f, k } = fenceBox(FENCES[i])
        const x = fx * w - ((f.left + f.right) / 2) * k
        ctx.drawImage(f.img, x, ground - f.bottom * k + 1, f.w * k, f.h * k)
      })
    }
    // One pose with the horse's centre of mass on `mid`, `lift` px over the ground. The canter frames share one ground
    // line (their own baseline, so the sixth frame floats in its suspension); a jump pose stands on its lowest pixel.
    const put = (name, mid, lift, ground, alpha) => {
      const p = art[name]
      const x = mid - p.mid * scale
      const y = ground - (art.base && GAIT.includes(name) ? art.base : p.bottom) * scale - lift
      ctx.globalAlpha = alpha
      ctx.drawImage(p.img, x, y, p.w * scale, p.h * scale)
      ctx.globalAlpha = 1
    }
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      const ground = h - 22
      const fences = fencesFor(w)
      drawFences(ground, fences)
      if (!art) return
      const c = art[GAIT[0]]
      const len = (c.right - c.left) * scale
      if (reducedMotion()) { put(GAIT[0], 18 + (c.mid - c.left) * scale, 0, ground, 1); return }
      const p = t % (RUN + PAUSE)
      if (p >= RUN) return
      const mid = -len * (1 - BODY) + (p / RUN) * (w + len) // steady speed
      // On the ground: the six canter frames in turn, lifted a little around the sixth (all four hooves off the ground).
      const stride = FRAME_MS * GAIT.length
      let pose = GAIT[Math.floor(t / FRAME_MS) % GAIT.length]
      let lift = BOB * Math.max(0, Math.cos(2 * Math.PI * ((t % stride) / stride - 11 / 12))) ** 2
      let jumping = false
      fences.forEach((fx, i) => {
        if (jumping) return
        const reach = Math.max(len * REACH, fenceBox(FENCES[i]).half * CLEAR)
        const d = (mid - fx * w) / reach
        if (Math.abs(d) >= 1) return
        jumping = true
        pose = d < -0.35 ? 'takeoff' : d <= 0.35 ? 'over' : 'landing'
        lift = PEAK * fh * (1 - Math.abs(d) ** 2.5) // flat on top, so the legs clear the whole fence
      })
      // Cross-fade only into and out of the jump; the canter frames swap cleanly.
      const key = jumping ? pose : 'run'
      if (key !== shown.key) shown = { key, pose, since: t, prev: shown.pose }
      shown.pose = pose
      const k = Math.min(1, (t - shown.since) / FADE)
      if (k < 1 && shown.prev !== pose) put(shown.prev, mid, lift, ground, 1 - k)
      put(pose, mid, lift, ground, k < 1 && shown.prev !== pose ? k : 1)
    }
    const loop = (now) => {
      if (!alive || !visible) { raf = 0; return }
      if (start === null) start = now
      draw(now - start)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reducedMotion()) { start = null; shown = { key: 'run', pose: GAIT[0], since: -1e9, prev: GAIT[0] }; raf = requestAnimationFrame(loop) }
    })
    const ro = new ResizeObserver(() => { if (alive) { layout(); if (!raf) draw(0) } })
    layout()
    draw(0)
    loadAll([...GAIT, ...HORSE, ...FENCES]).then((loaded) => {
      if (!alive) return
      art = { ...loaded, base: Math.max(...GAIT.slice(0, 5).map((n) => loaded[n].bottom)) } // frames 1–5 have hooves on the line
      layout()
      draw(0)
      ro.observe(canvas.parentElement)
      io.observe(canvas)
    }).catch(() => {})
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [])
  return <canvas ref={ref} className="runhorse" aria-hidden="true" />
}
