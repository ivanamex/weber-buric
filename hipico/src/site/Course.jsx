import { useEffect, useRef } from 'react'

// The footer course: numbered fences (posts + striped poles) on a dotted ground line, three on a computer and two on
// phones, and Ivana's silhouettes (rider and horse, olivewood) that canter on the line and jump each fence.
const fencesFor = (w) => (w < 900 ? [0.27, 0.73] : [0.22, 0.5, 0.78])
const INK = 'rgba(51,53,42,'
function drawCourse(ctx, w, ground, fh, fences) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = `${INK}.5)`
  ctx.lineWidth = 1.5
  ctx.setLineDash([2, 7])
  ctx.beginPath(); ctx.moveTo(16, ground + 0.5); ctx.lineTo(w - 16, ground + 0.5); ctx.stroke()
  const half = Math.max(22, fh * 0.55)
  fences.forEach((fx, i) => {
    const cx = Math.round(fx * w)
    ctx.setLineDash([])
    ctx.strokeStyle = `${INK}.72)`
    ctx.lineWidth = 2
    for (const px of [cx - half, cx + half]) { // posts with a small cap
      ctx.beginPath(); ctx.moveTo(px, ground); ctx.lineTo(px, ground - fh - 6); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px - 4, ground - fh - 6); ctx.lineTo(px + 4, ground - fh - 6); ctx.stroke()
    }
    ctx.lineWidth = 3
    ctx.setLineDash([10, 7]) // striped poles
    for (let k = 1; k <= 3; k++) {
      const y = ground - (fh * k) / 3
      ctx.beginPath(); ctx.moveTo(cx - half + 3, y); ctx.lineTo(cx + half - 3, y); ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.lineWidth = 1.5 // the number, like a course plan
    ctx.beginPath(); ctx.arc(cx - half - 12, ground - fh - 14, 9, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = `${INK}.85)`
    ctx.font = '700 11px "Archivo Variable", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), cx - half - 12, ground - fh - 13.5)
  })
  ctx.restore()
}

const POSES = ['canter', 'takeoff', 'over', 'landing']
const RUN = 9000 // across the band
const PAUSE = 2000 // then again from the left
const FRAME_TO_FENCE = 1.9 // the image's height ÷ the fence's: the withers sit about 1.1× the fence
const PEAK = 1.2 // the lowest hoof at the top of the arc, × the fence (20 % over the top pole)
const REACH = 0.85 // take-off and landing, in horse-lengths from the fence
const BODY = 0.58 // the horse's middle, from the tail end of the silhouette (the tail makes the image longer behind)
const FADE = 120 // ms to cross-fade between poses
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Each silhouette with the edges of its opaque part (in image pixels): left, right, bottom. */
function loadPoses() {
  return Promise.all(POSES.map((name) => new Promise((resolve, reject) => {
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
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 128) { if (x < left) left = x; if (x > right) right = x; if (y > bottom) bottom = y }
        }
      }
      resolve([name, { img, w: c.width, h: c.height, left, right: right + 1, bottom: bottom + 1 }])
    }
    img.onerror = reject
    img.src = `/img/course/horse-${name}.png`
  }))).then(Object.fromEntries)
}

/**
 * The course in the footer band: the horse canters in from the left with its hooves on the dotted line and a 2 px bob,
 * takes off about a horse-length before each fence, is over it at the top of the arc, lands a horse-length after and
 * canters on; 9 s across, a 2 s pause, and again from the left whenever the band is on screen. Poses cross-fade in
 * 120 ms. Reduced motion: the horse stands at the start line.
 */
export function CourseHorse() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    let poses = null
    let ctx = null
    let w = 0
    let h = 0
    let fh = 66
    let scale = 1
    let raf = 0
    let alive = true
    let visible = false
    let start = null
    let shown = { pose: 'canter', since: -1e9, prev: 'canter' }
    const layout = () => {
      w = canvas.parentElement.clientWidth
      h = canvas.parentElement.clientHeight
      fh = w < 600 ? 40 : 66
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.height = `${h}px`
      ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingQuality = 'high'
      if (poses) scale = (FRAME_TO_FENCE * fh) / poses.canter.h
    }
    // One pose with the horse's middle on `mid` and its lowest point `lift` px over the ground.
    const put = (name, mid, lift, ground, alpha) => {
      const p = poses[name]
      const x = mid - (p.left + (p.right - p.left) * BODY) * scale
      const y = ground - p.bottom * scale - lift
      ctx.globalAlpha = alpha
      ctx.drawImage(p.img, x, y, p.w * scale, p.h * scale)
      ctx.globalAlpha = 1
    }
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      const ground = h - 22
      const fences = fencesFor(w)
      drawCourse(ctx, w, ground, fh, fences)
      if (!poses) return
      const c = poses.canter
      const len = (c.right - c.left) * scale
      if (reducedMotion()) { put('canter', 18 + len * BODY, 0, ground, 1); return }
      const p = t % (RUN + PAUSE)
      if (p >= RUN) return
      const mid = -len * (1 - BODY) + (p / RUN) * (w + len)
      let pose = 'canter'
      let lift = 2 * Math.abs(Math.sin(t / 150)) // the canter's small bob
      for (const fx of fences) {
        const d = (mid - fx * w) / (len * REACH)
        if (Math.abs(d) >= 1) continue
        pose = d < -0.35 ? 'takeoff' : d <= 0.35 ? 'over' : 'landing'
        lift = PEAK * fh * (1 - d * d) ** 0.7 // a little flatter on top than a parabola, so the legs clear the posts
        break
      }
      if (pose !== shown.pose) shown = { pose, since: t, prev: shown.pose }
      const k = Math.min(1, (t - shown.since) / FADE)
      if (k < 1) put(shown.prev, mid, lift, ground, 1 - k)
      put(pose, mid, lift, ground, k)
    }
    const loop = (now) => {
      if (!alive || !visible) { raf = 0; return }
      if (start === null) start = now
      draw(now - start)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reducedMotion()) { start = null; shown = { pose: 'canter', since: -1e9, prev: 'canter' }; raf = requestAnimationFrame(loop) }
    })
    const ro = new ResizeObserver(() => { if (alive) { layout(); if (!raf) draw(0) } })
    layout()
    draw(0)
    loadPoses().then((loaded) => {
      if (!alive) return
      poses = loaded
      layout()
      draw(0)
      ro.observe(canvas.parentElement)
      io.observe(canvas)
    }).catch(() => {})
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [])
  return <canvas ref={ref} className="runhorse" aria-hidden="true" />
}
