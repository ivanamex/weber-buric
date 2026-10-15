import { useEffect, useRef } from 'react'

// A horse drawn with letters. The silhouette is built from simple shapes in a 200 × 120 box (facing right),
// rasterised into a grid, and every filled cell gets a letter of the club's name.
const TEXT = 'HÍPICO•RIVIERA•MAYA•'
const SAGE = [138, 142, 117]
const LIGHT_SAGE = [190, 197, 164]
const CHAR_RATIO = 1.45 // cell height ÷ width

// Gallop poses: leg angles in degrees from straight down (+ = forward). [upper, lower] for each leg.
const POSES = [
  { dy: -3, tail: [6, 50], legs: { fN: [50, 72], fF: [34, 18], hN: [-55, -82], hF: [-38, -58] } }, // stretched out
  { dy: 2, tail: [10, 62], legs: { fN: [-14, -82], fF: [6, -40], hN: [34, 8], hF: [20, -8] } }, // gathered
  { dy: 0, tail: [8, 56], legs: { fN: [16, 6], fF: [-10, -72], hN: [-22, -36], hF: [10, -4] } }, // landing
]
const HIP = { fN: [130, 70], fF: [124, 69], hN: [70, 68], hF: [64, 67] }

// The footer course's jump, one pose per phase. rot tilts the whole horse (− = nose up).
const STAND = { dy: 0, tail: [14, 74], legs: { fN: [5, -2], fF: [-4, 1], hN: [-7, 5], hF: [4, -2] } }
const TAKEOFF = { dy: 0, rot: -17, tail: [4, 62], legs: { fN: [52, -78], fF: [40, -96], hN: [-48, -38], hF: [-34, -24] } } // head up, front legs folded, hind legs pushing
const TUCK = { dy: 0, rot: -2, tail: [4, 46], legs: { fN: [62, -84], fF: [50, -100], hN: [56, -42], hF: [46, -52] } } // legs tucked over the poles
const LAND = { dy: 0, rot: 13, tail: [6, 44], legs: { fN: [64, 50], fF: [46, 34], hN: [-58, -84], hF: [-46, -72] } } // front legs reaching for the ground

function drawHorse(ctx, pose) {
  const { dy, tail, legs, rot } = pose
  ctx.save()
  ctx.translate(0, dy)
  if (rot) { ctx.translate(100, 62); ctx.rotate((rot * Math.PI) / 180); ctx.translate(-100, -62) }
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const poly = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill() }
  // body, chest, rump
  ctx.beginPath(); ctx.ellipse(99, 58, 42, 17, -0.05, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(126, 60, 17, 15, 0.3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(68, 55, 19, 17, 0, 0, Math.PI * 2); ctx.fill()
  // neck with the mane, head, ears
  ctx.beginPath()
  ctx.moveTo(108, 50); ctx.quadraticCurveTo(118, 28, 146, 10); ctx.lineTo(156, 12)
  ctx.quadraticCurveTo(150, 34, 146, 68); ctx.lineTo(124, 72); ctx.closePath(); ctx.fill()
  poly([[145, 11], [155, 7], [168, 17], [183, 31], [187, 38], [183, 44], [174, 44], [160, 33], [151, 30]])
  poly([[149, 11], [151, -1], [157, 9]])
  // tail: a tapered, flowing shape
  const [tx, ty] = tail
  const pts = []
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    const x = (1 - u) ** 2 * 54 + 2 * (1 - u) * u * 30 + u * u * tx
    const y = (1 - u) ** 2 * 46 + 2 * (1 - u) * u * 38 + u * u * ty
    pts.push([x, y, 5.5 * (1 - u) + 1.5])
  }
  ctx.beginPath()
  pts.forEach(([x, y, w], i) => (i ? ctx.lineTo(x, y - w) : ctx.moveTo(x, y - w)))
  pts.slice().reverse().forEach(([x, y, w]) => ctx.lineTo(x, y + w))
  ctx.closePath(); ctx.fill()
  // legs
  const rad = (d) => (d * Math.PI) / 180
  for (const [key, [up, low]] of Object.entries(legs)) {
    const [x, y] = HIP[key]
    const kx = x + Math.sin(rad(up)) * 24
    const ky = y + Math.cos(rad(up)) * 24
    const fx = kx + Math.sin(rad(low)) * 22
    const fy = ky + Math.cos(rad(low)) * 22
    ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((x + kx) / 2, (y + ky) / 2); ctx.stroke()
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke()
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke()
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(fx - Math.sin(rad(low)) * 2, fy - Math.cos(rad(low)) * 2); ctx.lineTo(fx, fy); ctx.stroke()
  }
  ctx.restore()
}

/** Cells of one pose: [{ c, r, a }] where a is coverage 0..1, plus the silhouette's edges in cells. pad = room
 * around the 200 × 120 box for tilted poses. */
function rasterise(pose, cols, pad = 0) {
  const bw = 200 + pad * 2
  const bh = 120 + pad * 2
  const rows = Math.round((cols * bh) / bw / CHAR_RATIO)
  const k = 4
  const cv = document.createElement('canvas')
  cv.width = cols * k
  cv.height = rows * k
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.scale(cv.width / bw, cv.height / bh)
  ctx.translate(pad, pad)
  drawHorse(ctx, pose)
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0
      for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) sum += data[((r * k + y) * cv.width + c * k + x) * 4 + 3]
      const a = sum / (k * k * 255)
      if (a > 0.3) cells.push({ c, r, a, ch: TEXT[(r * 7 + c) % TEXT.length], heat: 0 })
    }
  }
  const edge = (f, k2) => cells.reduce((m, cell) => f(m, cell[k2]), cells[0]?.[k2] ?? 0)
  return { cells, rows, top: edge(Math.min, 'r'), bottom: edge(Math.max, 'r') + 1, left: edge(Math.min, 'c'), right: edge(Math.max, 'c') + 1 }
}

const mixer = (from, to) => (h) => from.map((v, i) => Math.round(v + (to[i] - v) * h)).join(',')
const mix = mixer(SAGE, LIGHT_SAGE)
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const fontReady = () => (document.fonts?.load ? document.fonts.load('600 12px "Archivo Variable"').catch(() => {}) : Promise.resolve())

function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function paint(ctx, cells, cw, ch, ox, oy, alpha, tint = mix, weight = 600) {
  ctx.font = `${weight} ${Math.round(ch * 0.82)}px "Archivo Variable", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const cell of cells) {
    const h = cell.heat
    ctx.fillStyle = `rgba(${tint(h)},${Math.min(1, (cell.a > 0.6 ? alpha : alpha * 0.55) + h * 0.5)})`
    ctx.fillText(cell.ch, ox + cell.c * cw + cw / 2, oy + cell.r * ch + ch / 2)
  }
}

// A small course for the footer: numbered fences (posts + striped poles) on a dotted ground line. Three on a
// computer, two on phones.
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

// Course timing and shape: 9 s across, a 2 s pause, then again from the left. The horse is 1.4× a fence tall; a jump
// starts about one horse-length before the fence and lands one after, its lowest hoof peaking 20 % over the top pole.
const RUN = 9000
const PAUSE = 2000
const PAD = 26
const HORSE_TO_FENCE = 1.4
const PEAK = 1.2
const CELL = 4.2 // px per letter column

/**
 * The closing band's horse: gallops across in about 12 s, three frames for the legs.
 * With `course`, the footer course: the horse canters on the dotted line and jumps each fence (take-off with the
 * head up, legs tucked over the poles, front legs reaching to land); it starts from the left whenever the band comes
 * on screen. Reduced motion: the horse stands at the start line; the fences stay.
 * colors: [from, to] as [r, g, b]; the app's sage → light sage by default.
 */
export function RunningHorse({ colors, course = false }) {
  const ref = useRef(null)
  const tint = colors ? mixer(colors[0], colors[1]) : mix
  useEffect(() => {
    const canvas = ref.current
    let frames = []
    let jump = null
    let stand = null
    let cw = 6
    let chH = 9
    let hw = 0
    let fh = 0
    let ctx = null
    let raf = 0
    let alive = true
    let visible = false
    let start = null
    let elapsed = 0
    const LAP = 12000
    const STEP = 110
    const layout = () => {
      const w = canvas.parentElement.clientWidth
      const h = canvas.parentElement.clientHeight
      if (course) {
        fh = w < 600 ? 40 : 66
        // Size the horse from its standing height: rows × cell height covers (120 + 2·PAD) box units.
        const probe = rasterise(STAND, 100, PAD)
        const share = (probe.bottom - probe.top) / probe.rows
        hw = (HORSE_TO_FENCE * fh) / share * ((200 + PAD * 2) / (120 + PAD * 2))
        const cols = Math.max(30, Math.round(hw / CELL))
        cw = hw / cols
        chH = cw * CHAR_RATIO
        frames = POSES.map((p) => rasterise(p, cols, PAD))
        jump = { takeoff: rasterise(TAKEOFF, cols, PAD), tuck: rasterise(TUCK, cols, PAD), land: rasterise(LAND, cols, PAD) }
        stand = rasterise(STAND, cols, PAD)
      } else {
        const cols = w < 600 ? 50 : 64
        hw = Math.min(w * 0.62, w < 600 ? 230 : 330)
        cw = hw / cols
        chH = cw * CHAR_RATIO
        frames = POSES.map((p) => rasterise(p, cols))
      }
      ctx = setupCanvas(canvas, w, h)
    }
    const drawCourseFrame = (t, w, h) => {
      const ground = h - 22
      const fences = fencesFor(w)
      drawCourse(ctx, w, ground, fh, fences)
      // Place a pose so its lowest cell sits `lift` px above the ground and its left edge at `left`.
      const put = (f, left, lift) => paint(ctx, f.cells, cw, chH, left - f.left * cw, ground - f.bottom * chH - lift + 1, 0.9, tint, 800)
      if (reducedMotion()) return put(stand, 18, 0)
      const p = t % (RUN + PAUSE)
      if (p >= RUN) return
      const f0 = frames[0]
      const len = (f0.right - f0.left) * cw
      const left = -len + (p / RUN) * (w + len)
      const mid = left + len / 2
      const reach = len * 0.85
      for (const fx of fences) {
        const d = (mid - fx * w) / reach
        if (Math.abs(d) >= 1) continue
        const f = d < -0.45 ? jump.takeoff : d < 0.4 ? jump.tuck : jump.land
        // Keep the silhouette centred on the same point whatever the pose.
        return put(f, mid - ((f.right - f.left) * cw) / 2, PEAK * fh * (1 - d * d))
      }
      put(frames[Math.floor(t / STEP) % frames.length], left, 0)
    }
    const draw = (t) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      if (course) return drawCourseFrame(t, w, h)
      const still = reducedMotion()
      const x = still ? (w - hw) / 2 : ((t % LAP) / LAP) * (w + hw) - hw
      const f = frames[still ? 0 : Math.floor(t / STEP) % frames.length]
      paint(ctx, f.cells, cw, chH, x, h - f.rows * chH + 2, 0.62, tint)
    }
    const loop = (t) => {
      if (!alive || !visible) { raf = 0; return }
      if (start === null) start = t - (course ? 0 : elapsed)
      elapsed = t - start
      draw(elapsed)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reducedMotion()) { start = null; raf = requestAnimationFrame(loop) }
    })
    const ro = new ResizeObserver(() => { if (alive) { layout(); draw(elapsed) } })
    fontReady().then(() => {
      if (!alive) return
      layout()
      draw(0)
      ro.observe(canvas.parentElement)
      io.observe(canvas)
    })
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [])
  return <canvas ref={ref} className="runhorse" aria-hidden="true" />
}
