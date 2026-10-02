import { useEffect, useRef } from 'react'

// A horse drawn with letters. The silhouette is built from simple shapes in a 200 × 120 box (facing right),
// rasterised into a grid, and every filled cell gets a letter of the club's name.
const TEXT = 'HÍPICO•RIVIERA•MAYA•'
const SAGE = [110, 150, 118]
const APRICOT = [242, 180, 140]
const CHAR_RATIO = 1.45 // cell height ÷ width

// Gallop poses: leg angles in degrees from straight down (+ = forward). [upper, lower] for each leg.
const POSES = [
  { dy: -3, tail: [6, 50], legs: { fN: [50, 72], fF: [34, 18], hN: [-55, -82], hF: [-38, -58] } }, // stretched out
  { dy: 2, tail: [10, 62], legs: { fN: [-14, -82], fF: [6, -40], hN: [34, 8], hF: [20, -8] } }, // gathered
  { dy: 0, tail: [8, 56], legs: { fN: [16, 6], fF: [-10, -72], hN: [-22, -36], hF: [10, -4] } }, // landing
]
const HIP = { fN: [130, 70], fF: [124, 69], hN: [70, 68], hF: [64, 67] }

function drawHorse(ctx, pose) {
  const { dy, tail, legs } = pose
  ctx.save()
  ctx.translate(0, dy)
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

/** Cells of one pose: [{ c, r, a }] where a is coverage 0..1. */
function rasterise(pose, cols) {
  const rows = Math.round((cols * 120) / 200 / CHAR_RATIO)
  const k = 4
  const cv = document.createElement('canvas')
  cv.width = cols * k
  cv.height = rows * k
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.scale(cv.width / 200, cv.height / 120)
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
  return { cells, rows }
}

const mixer = (from, to) => (h) => from.map((v, i) => Math.round(v + (to[i] - v) * h)).join(',')
const mix = mixer(SAGE, APRICOT)
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

function paint(ctx, cells, cw, ch, ox, oy, alpha, tint = mix) {
  ctx.font = `600 ${Math.round(ch * 0.82)}px "Archivo Variable", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const cell of cells) {
    const h = cell.heat
    ctx.fillStyle = `rgba(${tint(h)},${Math.min(1, (cell.a > 0.6 ? alpha : alpha * 0.55) + h * 0.5)})`
    ctx.fillText(cell.ch, ox + cell.c * cw + cw / 2, oy + cell.r * ch + ch / 2)
  }
}

/** The closing band's horse: gallops across in about 12 s, three frames for the legs. Still with reduced motion. */
/** colors: [from, to] as [r, g, b]; the app's sage → apricot by default. */
export function RunningHorse({ colors }) {
  const ref = useRef(null)
  const tint = colors ? mixer(colors[0], colors[1]) : mix
  useEffect(() => {
    const canvas = ref.current
    let frames = []
    let cw = 6
    let chH = 9
    let hw = 0
    let ctx = null
    let raf = 0
    let alive = true
    let visible = false
    const LAP = 12000
    const STEP = 110
    const layout = () => {
      const w = canvas.parentElement.clientWidth
      const h = canvas.parentElement.clientHeight
      const cols = w < 600 ? 50 : 64
      hw = Math.min(w * 0.62, w < 600 ? 230 : 330)
      cw = hw / cols
      chH = cw * CHAR_RATIO
      frames = POSES.map((p) => rasterise(p, cols))
      ctx = setupCanvas(canvas, w, h)
    }
    const draw = (t) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const still = reducedMotion()
      const f = frames[still ? 0 : Math.floor(t / STEP) % frames.length]
      const x = still ? (w - hw) / 2 : ((t % LAP) / LAP) * (w + hw) - hw
      const y = h - f.rows * chH - 12
      ctx.clearRect(0, 0, w, h)
      paint(ctx, f.cells, cw, chH, x, y, 0.62, tint)
    }
    const loop = (t) => {
      if (!alive || !visible) { raf = 0; return }
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf && !reducedMotion()) raf = requestAnimationFrame(loop)
    })
    const ro = new ResizeObserver(() => { if (alive) { layout(); draw(performance.now()) } })
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
