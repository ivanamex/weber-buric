// Hoofprints pressed into the page, behind the "Aprende a montar" steps.
// A trail walks diagonally across the band when it scrolls into view (one print every 250 ms); on a computer
// the mouse leaves fresh prints along its path. Prints fade back into the sand after ~6 s.
// The emboss is a WebGL fragment shader (a height map of one print → normals → light from the top left);
// without WebGL a pre-lit 2D sprite is used. Paused off screen. Reduced motion: 6 still prints.
import { useEffect, useRef } from 'react'
import { reducedMotion } from './motion.jsx'

const SPRITE = 128 // height-map resolution
const PRINT = 34 // print length on screen (px)
const LIFE = 6000 // ms until a print has faded back into the sand
const STEP_MS = 250
const STRIDE = 62 // px between prints (walk)
const SIDE = 11 // px left/right of the line of travel

/** One hoofprint as a height map (white = deepest): the hoof wall as a U open at the heel, the sole, the V of the frog. */
function heightMap() {
  const c = document.createElement('canvas')
  c.width = c.height = SPRITE
  const g = c.getContext('2d')
  const cx = SPRITE / 2
  g.fillStyle = '#000'
  g.fillRect(0, 0, SPRITE, SPRITE)
  g.filter = 'blur(2.5px)'
  // the sole: a rounded hoof shape, wider at the toe (top)
  g.fillStyle = 'rgb(120,120,120)'
  g.beginPath()
  g.moveTo(cx, 12)
  g.bezierCurveTo(cx + 52, 12, cx + 50, 84, cx + 30, 112)
  g.lineTo(cx - 30, 112)
  g.bezierCurveTo(cx - 50, 84, cx - 52, 12, cx, 12)
  g.fill()
  // the hoof wall: deeper, a U open at the heel
  g.strokeStyle = 'rgb(255,255,255)'
  g.lineWidth = 11
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - 28, 108)
  g.bezierCurveTo(cx - 48, 80, cx - 48, 16, cx, 16)
  g.bezierCurveTo(cx + 48, 16, cx + 48, 80, cx + 28, 108)
  g.stroke()
  // the frog: a shallow V from the heel toward the toe
  g.fillStyle = 'rgb(40,40,40)'
  g.beginPath()
  g.moveTo(cx, 46)
  g.lineTo(cx + 16, 110)
  g.lineTo(cx + 6, 110)
  g.lineTo(cx, 84)
  g.lineTo(cx - 6, 110)
  g.lineTo(cx - 16, 110)
  g.closePath()
  g.fill()
  return c
}

/** The 2D fallback: light the height map once into an RGBA sprite (shadow on the top-left inner walls, light on the rest). */
function litSprite(hm) {
  const src = hm.getContext('2d').getImageData(0, 0, SPRITE, SPRITE).data
  const out = document.createElement('canvas')
  out.width = out.height = SPRITE
  const g = out.getContext('2d')
  const img = g.createImageData(SPRITE, SPRITE)
  const h = (x, y) => src[(Math.min(SPRITE - 1, Math.max(0, y)) * SPRITE + Math.min(SPRITE - 1, Math.max(0, x))) * 4] / 255
  for (let y = 0; y < SPRITE; y++) {
    for (let x = 0; x < SPRITE; x++) {
      const dx = h(x + 1, y) - h(x - 1, y)
      const dy = h(x, y + 1) - h(x, y - 1)
      const shade = (dx + dy) * 2.2 // pressed in: walls facing the light (top left) are dark
      const depth = h(x, y)
      const i = (y * SPRITE + x) * 4
      if (shade < 0) { img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = Math.min(255, -shade * 255) }
      else { img.data[i] = 62; img.data[i + 1] = 56; img.data[i + 2] = 44; img.data[i + 3] = Math.min(255, shade * 255 + depth * 40) }
    }
  }
  g.putImageData(img, 0, 0)
  return out
}

const VS = `attribute vec2 a; uniform vec2 res, pos; uniform float size, rot; varying vec2 uv;
void main() { uv = a * .5 + .5; vec2 p = a * size * .5; float c = cos(rot), s = sin(rot);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + pos;
  gl_Position = vec4(p / res * 2. - 1., 0., 1.); gl_Position.y = -gl_Position.y; }`
const FS = `precision mediump float; uniform sampler2D hm; uniform float alpha, frot; varying vec2 uv;
void main() { float e = 1. / ${SPRITE}.;
  float dx = texture2D(hm, uv + vec2(e, 0.)).r - texture2D(hm, uv - vec2(e, 0.)).r;
  float dy = texture2D(hm, uv + vec2(0., e)).r - texture2D(hm, uv - vec2(0., e)).r;
  float c = cos(frot), s = sin(frot); vec2 g = vec2(dx * c - dy * s, dx * s + dy * c);
  float shade = (g.x + g.y) * 2.2; float depth = texture2D(hm, uv).r;
  vec4 col = shade < 0. ? vec4(1., 1., 1., -shade) : vec4(.24, .22, .17, shade + depth * .16);
  gl_FragColor = vec4(col.rgb * col.a, col.a) * alpha; }`

function webglRenderer(canvas, hm) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
  if (!gl) return null
  const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null }
  const vs = sh(gl.VERTEX_SHADER, VS)
  const fs = sh(gl.FRAGMENT_SHADER, FS)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hm)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  const u = Object.fromEntries(['res', 'pos', 'size', 'rot', 'frot', 'alpha'].map((n) => [n, gl.getUniformLocation(prog, n)]))
  return {
    draw(prints, w, h, dpr) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u.res, w * dpr, h * dpr)
      gl.uniform1f(u.size, PRINT * dpr)
      for (const p of prints) {
        gl.uniform2f(u.pos, p.x * dpr, p.y * dpr)
        gl.uniform1f(u.rot, p.rot)
        gl.uniform1f(u.frot, p.rot)
        gl.uniform1f(u.alpha, p.alpha)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    },
  }
}

function canvasRenderer(canvas, hm) {
  const g = canvas.getContext('2d')
  const sprite = litSprite(hm)
  return {
    draw(prints, w, h, dpr) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of prints) {
        g.setTransform(dpr, 0, 0, dpr, p.x * dpr, p.y * dpr)
        g.rotate(p.rot)
        g.globalAlpha = p.alpha
        g.drawImage(sprite, -PRINT / 2, -PRINT / 2, PRINT, PRINT)
      }
      g.globalAlpha = 1
    },
  }
}

const fade = (age) => (age < LIFE * 0.7 ? 1 : Math.max(0, 1 - (age - LIFE * 0.7) / (LIFE * 0.3)))

/** The sand band's print layer. `band` is the element the canvas covers (and listens to for the mouse). */
export function Hoofprints({ band }) {
  const ref = useRef(null)
  useEffect(() => {
    const box = ref.current
    const host = band.current
    if (!box || !host) return undefined
    const hm = heightMap()
    // WebGL first; if it can't start, a fresh canvas for the 2D sprite (a canvas keeps the first context it gets)
    let canvas = document.createElement('canvas')
    let r = webglRenderer(canvas, hm)
    if (r) canvas.dataset.mode = 'webgl'
    else { canvas = document.createElement('canvas'); r = canvasRenderer(canvas, hm); canvas.dataset.mode = '2d' }
    box.appendChild(canvas)
    let w = 0
    let h = 0
    let dpr = 1
    const prints = []
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = host.clientWidth
      h = host.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    size()
    const still = reducedMotion()
    if (still) {
      // six still prints, walking up to the right
      for (let i = 0; i < 6; i++) {
        const t = (i + 0.5) / 6
        prints.push({ x: w * (0.08 + t * 0.84) + (i % 2 ? SIDE : -SIDE), y: h * (0.82 - t * 0.6), rot: Math.atan2(-0.6 * h, 0.84 * w) + Math.PI / 2, alpha: 1, born: 0 })
      }
      r.draw(prints, w, h, dpr)
      const ro = new ResizeObserver(() => { size(); r.draw(prints, w, h, dpr) })
      ro.observe(host)
      return () => { ro.disconnect(); canvas.remove() }
    }
    let raf = 0
    let visible = false
    let walked = false
    let walkTimer = 0
    const loop = () => {
      raf = 0
      const now = performance.now()
      for (let i = prints.length - 1; i >= 0; i--) {
        prints[i].alpha = fade(now - prints[i].born)
        if (prints[i].alpha <= 0) prints.splice(i, 1)
      }
      r.draw(prints, w, h, dpr)
      if (visible && prints.length) raf = requestAnimationFrame(loop)
    }
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(loop) }
    const add = (x, y, rot) => { prints.push({ x, y, rot, alpha: 1, born: performance.now() }); if (prints.length > 80) prints.shift(); wake() }
    // the trail: from the bottom left to the top right, alternating left and right hooves
    const walk = () => {
      const dx = w * 0.9
      const dy = -h * 0.55
      const len = Math.hypot(dx, dy)
      const n = Math.max(4, Math.floor(len / STRIDE))
      const rot = Math.atan2(dy, dx) + Math.PI / 2
      const nx = -dy / len
      const ny = dx / len
      let i = 0
      const next = () => {
        if (!visible || i > n) return
        const t = i / n
        const side = i % 2 ? SIDE : -SIDE
        add(w * 0.05 + dx * t + nx * side, h * 0.8 + dy * t + ny * side, rot)
        i += 1
        walkTimer = setTimeout(next, STEP_MS)
      }
      next()
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) { wake(); if (!walked) { walked = true; walk() } }
    }, { threshold: 0.4 })
    io.observe(host)
    // the mouse: a print every stride along its path (computers only)
    let last = null
    let left = false
    const move = (e) => {
      const b = host.getBoundingClientRect()
      const x = e.clientX - b.left
      const y = e.clientY - b.top
      if (!last) { last = { x, y }; return }
      const d = Math.hypot(x - last.x, y - last.y)
      if (d < STRIDE * 0.8) return
      const rot = Math.atan2(y - last.y, x - last.x) + Math.PI / 2
      const nx = -(y - last.y) / d
      const ny = (x - last.x) / d
      left = !left
      add(x + nx * (left ? -SIDE : SIDE), y + ny * (left ? -SIDE : SIDE), rot)
      last = { x, y }
    }
    const leave = () => { last = null }
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    if (fine) { host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave) }
    const ro = new ResizeObserver(() => { size(); wake() })
    ro.observe(host)
    return () => {
      io.disconnect(); ro.disconnect(); clearTimeout(walkTimer); cancelAnimationFrame(raf)
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave)
      canvas.remove()
    }
  }, [band])
  return <div ref={ref} className="ssand__prints" aria-hidden="true" />
}

/**
 * The same prints as the page's background: a fixed canvas behind all the content. On a computer a print is
 * pressed wherever the mouse moves over the page and fades after a few seconds; phones get a few still
 * prints down the sides. Prints keep their place on the page while it scrolls. Off with reduced motion.
 */
export function PageHoofprints() {
  const ref = useRef(null)
  useEffect(() => {
    const box = ref.current
    if (!box || reducedMotion()) return undefined
    const hm = heightMap()
    let canvas = document.createElement('canvas')
    let r = webglRenderer(canvas, hm)
    if (r) canvas.dataset.mode = 'webgl'
    else { canvas = document.createElement('canvas'); r = canvasRenderer(canvas, hm); canvas.dataset.mode = '2d' }
    box.appendChild(canvas)
    let w = 0
    let h = 0
    let dpr = 1
    const prints = [] // page coordinates
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    size()
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
    let raf = 0
    const draw = () => {
      raf = 0
      const now = performance.now()
      for (let i = prints.length - 1; i >= 0; i--) {
        const p = prints[i]
        if (p.still) continue
        p.alpha = fade(now - p.born)
        if (p.alpha <= 0) prints.splice(i, 1)
      }
      const top = window.scrollY
      r.draw(prints.filter((p) => p.y > top - 60 && p.y < top + h + 60).map((p) => ({ ...p, y: p.y - top })), w, h, dpr)
      if (prints.some((p) => !p.still)) raf = requestAnimationFrame(draw)
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(draw) }
    const onScroll = () => wake()
    const onResize = () => { size(); wake() }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    let last = null
    let left = false
    const move = (e) => {
      const x = e.pageX
      const y = e.pageY
      if (!last) { last = { x, y }; return }
      const d = Math.hypot(x - last.x, y - last.y)
      if (d < STRIDE * 0.8) return
      const rot = Math.atan2(y - last.y, x - last.x) + Math.PI / 2
      const nx = -(y - last.y) / d
      const ny = (x - last.x) / d
      left = !left
      prints.push({ x: x + nx * (left ? -SIDE : SIDE), y: y + ny * (left ? -SIDE : SIDE), rot, alpha: 1, born: performance.now() })
      if (prints.length > 90) prints.splice(prints.findIndex((p) => !p.still), 1)
      last = { x, y }
      wake()
    }
    const out = () => { last = null }
    if (fine) {
      window.addEventListener('pointermove', move, { passive: true })
      document.addEventListener('pointerleave', out)
    } else {
      // a few still trails down the margins of the page
      const H = document.documentElement.scrollHeight
      for (let k = 0; k < 8; k++) {
        const x0 = k % 2 ? w - 22 : 22
        const y0 = H * (0.12 + k * 0.105)
        for (let i = 0; i < 3; i++) prints.push({ x: x0 + (i % 2 ? SIDE : -SIDE), y: y0 + i * STRIDE * 0.8, rot: Math.PI, alpha: 0.8, born: 0, still: true })
      }
      wake()
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', out)
      canvas.remove()
    }
  }, [])
  return <div ref={ref} className="spage__prints" aria-hidden="true" />
}
