#!/usr/bin/env node
/**
 * Video guides, recorded for real while the demo runs.
 *
 *   node scripts/guides/guide.mjs mara [--base http://localhost:4173] [--voice take.mp3] [--out guides/out]
 *
 * 1. Records: Chromium at 1280×720 (2×) walks the steps of the scene (the website, the sign-in, the demo), Chrome's
 *    screencast keeps every painted frame with its time, and the script logs the pointer (moves and clicks) and what
 *    the camera should look at.
 * 2. Renders at 1920×1080, 30 fps: each step lasts as long as its sentence (sped up to 2× at most, then held on its
 *    last frame), the camera eases in on the action (up to 1.8×) and back out when the screen changes, the pointer and a
 *    mustard ripple where it clicks are drawn on top, a numbered step label sits at the lower left, and the title and
 *    closing cards sit on parchment with the club logo.
 * 3. Encodes: with an ffmpeg that has H.264 (`ffmpeg` on the PATH or FFMPEG=…) an MP4 (`--voice` adds the take, mixed
 *    at −16 LUFS, AAC); otherwise a silent WebM cut to check the picture.
 *
 * The take is split by each sentence's expected length (its share of the characters), so every step starts with its
 * sentence. Without `--voice`, sentence lengths are estimated (Spanish, about 14 characters a second, plus a pause).
 */
import { createRequire } from 'node:module'
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const W = 1920
const H = 1080
const FPS = 30
const VIEW = { width: 1280, height: 720 }
const PHONE = { width: 390, height: 844 }
const COLORS = { parchment: '#F1EAD8', ink: '#33352A', bark: '#68604D', mustard: '#D9A441', card: '#FFFBF5' }

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def }
const sceneName = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--')) || 'mara'
const BASE = opt('base', 'http://localhost:4173').replace(/\/$/, '')
const VOICE = opt('voice', null)
const STILLS = args.includes('--stills') // also saves a frame every 3 s next to the video, to check the picture
const OUT = resolve(ROOT, opt('out', 'guides/out'), 'es')
const WORK = join(OUT, `.${sceneName}`)

function loadPlaywright() {
  const require = createRequire(import.meta.url)
  for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(c) } catch { /* next */ } }
  throw new Error('Playwright not found (npm i -D playwright, or a global install).')
}
const CHROME = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => existsSync(p))

/* ───────── The scenes ───────── */

// Hidden while recording: things only the demo or this device shows that don't belong to the step (toasts stay: a
// confirmation is part of its step).
const HIDE = '.installcard, .sample-note, .pwnudge { display: none !important }'

const SCENES = {
  // "La app del club" for Mara: the website, into the demo, the side panel, a family, and "todo se adapta".
  mara: {
    title: ['La app del club', 'Hípico Riviera Maya'],
    closing: ['Todo se adapta a como trabaja el club.', 'Pruébalo: hipico-riviera-maya.vercel.app → Entrar → Ver la demo'],
    steps: [
      { card: 'title', say: 'Esta es la app del club.', run: async (g) => { await g.goto('/'); await g.wait(1600) } },
      { label: 'Desde la página, toca Entrar', say: 'Desde la página, toca Entrar.', run: async (g) => { await g.point('.sbar__login'); await g.wait(1400) } },
      { label: 'Ver la demo', say: 'Y toca Ver la demo: son datos de ejemplo, puedes probar todo.', run: async (g) => { await g.look('.democard'); await g.wait(1200); await g.point('.democard a'); await g.wait(900) } },
      { label: 'Entra como dirección', say: 'Entra como dirección.', run: async (g) => { await g.point('.login__btn >> nth=1'); await g.wait(1200) } },
      { label: 'Resumen', say: 'En Resumen ves todo de un vistazo; cada número te lleva a su lista.', run: async (g) => {
        for (const n of [0, 1]) { await g.point(`.stat--link >> nth=${n}`, { click: false }); await g.wait(400) }
        await g.point('.stat--link >> nth=2'); await g.wait(1300)
        await g.point('.desk__nav a >> nth=0'); await g.wait(900)
      } },
      { label: 'El panel: Hoy · Horario · Cobros · Familias · Mensajes', say: 'En el panel tienes el día, el horario, los cobros, las familias y los mensajes.', run: async (g) => {
        await g.point('.desk__nav a:has-text("Hoy")'); await g.wait(700)
        await g.point('.desk__content button.pill--sage:has-text("Vino") >> nth=0'); await g.wait(700)
        await g.point('.desk__nav a:has-text("Horario")'); await g.wait(700)
        await g.point('.desk__content button:has-text("Semana")'); await g.wait(500)
        await g.point('.desk__content button:has-text("Cancelar fechas")'); await g.wait(600)
        await g.type('#cr-reason', 'Lluvia'); await g.wait(400)
        if (await g.enabled('.isheet__panel .btn--dangerSolid')) { await g.point('.isheet__panel .btn--dangerSolid'); await g.wait(900) } else await g.key('Escape')
        await g.point('.desk__nav a:has-text("Cobros")'); await g.wait(700)
        await g.point('.desk__content button:has-text("Revisar") >> nth=0'); await g.wait(900)
        await g.point('button.btn--primary:has-text("Aprobar")'); await g.wait(900)
        await g.point('.desk__nav a:has-text("Familias")'); await g.wait(1000)
        await g.point('.desk__nav a:has-text("Mensajes")'); await g.wait(1100)
      } },
      { label: 'Así lo ve una familia', say: 'Y así lo ve una familia: su plan, sus clases y sus pagos, desde el celular.', run: async (g) => {
        await g.phone()
        await g.point('.demobar__switch button:has-text("Familia")'); await g.wait(1100)
        await g.look('.activeplan'); await g.wait(1000)
        await g.point('.tabbar a:has-text("Clases")'); await g.wait(800)
        await g.point('.app__main button.day >> nth=2'); await g.wait(600)
        await g.point('.app__main button.btn--primary:has-text("Confirmar") >> nth=0'); await g.wait(1600)
        await g.point('.tabbar a:has-text("Inicio")'); await g.wait(700)
        await g.point('.app__main button:has-text("Pagar") >> nth=0'); await g.wait(1500)
        await g.point('.paydlg__panel .paycard >> nth=1', { click: false }); await g.wait(600)
        await g.key('Escape'); await g.wait(600)
      } },
      { card: 'closing', say: 'Todo se adapta a como trabaja el club.' },
      { card: 'closing', say: 'Pruébalo en la página del club.' },
    ],
  },
  // "Clases en el Hípico" for families (vertical, for WhatsApp): after the meeting.
  familias: {
    title: ['Clases en el Hípico', 'Hípico Riviera Maya'],
    closing: ['Tu lugar feliz tiene caballos.', 'hipico-riviera-maya.vercel.app'],
    steps: [],
  },
}

/* ───────── Recording ───────── */

async function record(scene) {
  const { chromium } = loadPlaywright()
  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(join(WORK, 'f'), { recursive: true })
  // the screencast only captures at 2× when the browser itself runs at 2×
  const browser = await chromium.launch({ ...(CHROME ? { executablePath: CHROME } : {}), args: ['--force-device-scale-factor=2'] })
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2, locale: 'es-MX' })
  await ctx.addInitScript((css) => {
    try { localStorage.setItem('hipico.lang', 'es'); localStorage.setItem('hipico.installOffered', '1') } catch { /* no storage */ }
    addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s) })
  }, HIDE)
  const page = await ctx.newPage()
  const t0 = Date.now()
  const now = () => Date.now() - t0
  const log = { frames: [], pointer: [], camera: [], steps: [], view: [{ t: 0, ...VIEW }] }
  let view = { ...VIEW }
  let pos = { x: VIEW.width / 2, y: VIEW.height * 0.62 }

  // Chrome's screencast: every painted frame, kept with its time.
  const cdp = await ctx.newCDPSession(page)
  let n = 0
  cdp.on('Page.screencastFrame', async (f) => {
    const file = `${String(n++).padStart(5, '0')}.jpg`
    writeFileSync(join(WORK, 'f', file), Buffer.from(f.data, 'base64'))
    log.frames.push({ t: now(), file, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight })
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  // at 2×: the screencast is scaled to the viewport's CSS size unless it's given the device size
  const startCast = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, everyNthFrame: 1, maxWidth: view.width * 2, maxHeight: view.height * 2 })
  await startCast()

  const box = async (sel) => {
    const el = page.locator(sel).first()
    await el.waitFor({ state: 'visible', timeout: 8000 })
    await el.scrollIntoViewIfNeeded().catch(() => {})
    return el.boundingBox()
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2)
  const g = {
    page,
    wait: (ms) => page.waitForTimeout(ms),
    async goto(path) { await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' }); log.camera.push({ t: now(), box: null }); await page.waitForTimeout(300) },
    async look(sel) { const b = await box(sel); log.camera.push({ t: now(), box: b }) },
    async enabled(sel) { const el = page.locator(sel).first(); return (await el.count()) > 0 && (await el.isEnabled()) },
    async key(k) { await page.keyboard.press(k); log.camera.push({ t: now(), box: null }) },
    /** Moves the pointer to the element (eased, ~650 ms), looks at it, and clicks it unless { click: false }. */
    async point(sel, { click = true } = {}) {
      const b = await box(sel)
      const to = { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      log.camera.push({ t: now(), box: b })
      const steps = 26
      const from = { ...pos }
      for (let i = 1; i <= steps; i++) {
        const k = ease(i / steps)
        pos = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }
        await page.mouse.move(pos.x, pos.y)
        log.pointer.push({ t: now(), ...pos })
        await page.waitForTimeout(16)
      }
      if (!click) return
      await page.waitForTimeout(120)
      log.pointer.push({ t: now(), ...pos, click: true })
      await page.mouse.down(); await page.mouse.up()
      await page.waitForTimeout(250)
      if (page.url() !== this._url) { this._url = page.url(); log.camera.push({ t: now() + 200, box: null }) }
    },
    async type(sel, text) { await this.point(sel); await page.keyboard.type(text, { delay: 70 }) },
    /** The rest on a phone: the page becomes 390×844, shown upright in the middle of the frame. */
    async phone() {
      view = { ...PHONE }
      await page.setViewportSize(PHONE)
      await cdp.send('Page.stopScreencast'); await startCast()
      log.view.push({ t: now(), ...PHONE })
      pos = { x: PHONE.width / 2, y: PHONE.height * 0.6 }
      log.camera.push({ t: now(), box: null })
      await page.waitForTimeout(500)
    },
  }
  g._url = ''
  // Start in the demo with its sample data, then the steps.
  await page.goto(`${BASE}/demo?reset=1`, { waitUntil: 'networkidle' })
  for (const [i, step] of scene.steps.entries()) {
    const start = now()
    if (step.run) await step.run(g)
    log.steps.push({ i, t0: start, t1: now() })
  }
  await page.waitForTimeout(300)
  await cdp.send('Page.stopScreencast').catch(() => {})
  await browser.close()
  writeFileSync(join(WORK, 'log.json'), JSON.stringify(log))
  return log
}

/* ───────── Timing ───────── */

const estimate = (s) => 0.6 + s.length / 14 // seconds: Spanish at an easy pace, plus a breath

function voiceLength(file) {
  const ff = findFfmpeg(true)
  if (!ff) throw new Error('--voice needs an ffmpeg that reads MP3 (ffmpeg on the PATH or FFMPEG=…).')
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr || '')
  if (!m) throw new Error(`Can't read the length of ${file}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/**
 * Where each sentence sits in the take: the pauses (silences of 0.3 s or more) nearest to where each sentence should end
 * by its share of the characters, taken in order. Returns [start, end] in seconds per sentence.
 */
function voiceCuts(file, says) {
  const ff = findFfmpeg(true)
  const total = voiceLength(file)
  const r = spawnSync(ff, ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-'], { encoding: 'utf8' })
  const starts = [...(r.stderr || '').matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]))
  const ends = [...(r.stderr || '').matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]))
  const gaps = starts.map((a, i) => ({ a, b: ends[i] ?? total })).filter((g) => g.b < total - 0.05) // not the trailing silence
  const chars = says.reduce((a, x) => a + x.length, 0)
  let acc = 0
  let from = 0
  const cuts = []
  for (let i = 0; i < says.length - 1; i++) {
    acc += says[i].length
    const want = (total * acc) / chars
    let best = -1
    for (let j = from; j <= gaps.length - (says.length - 1 - i); j++) if (best < 0 || Math.abs((gaps[j].a + gaps[j].b) / 2 - want) < Math.abs((gaps[best].a + gaps[best].b) / 2 - want)) best = j
    cuts.push(gaps[best])
    from = best + 1
  }
  return says.map((_, i) => [i === 0 ? 0 : cuts[i - 1].b - 0.05, i === says.length - 1 ? total : cuts[i].a + 0.12])
}

/**
 * Each step's length in seconds: its sentence (from the take, plus a breath, or estimated), and never under half its
 * recording (sped up 2× at most). With a take, each sentence then starts exactly when its step starts.
 */
function plan(scene, log) {
  const says = scene.steps.map((s) => s.say)
  let lengths = says.map(estimate)
  let cuts = null
  if (VOICE) {
    cuts = voiceCuts(VOICE, says)
    lengths = cuts.map(([a, b]) => b - a + 0.45)
  }
  let at = 0
  return scene.steps.map((step, i) => {
    const rec = log.steps[i] ? (log.steps[i].t1 - log.steps[i].t0) / 1000 : 0
    // the title card stays long enough to read (2.4 s), whatever its sentence
    const out = step.card ? Math.max(lengths[i], step.card === 'title' ? 2.4 : 0) : Math.max(lengths[i], rec / 2)
    const p = { ...step, i, say: lengths[i], out, rec, src: log.steps[i], at, cut: cuts?.[i] }
    at += out
    return p
  })
}

/* ───────── Rendering ───────── */

/** Each sentence cut from the take and placed at its step's start, then the mix brought to −16 LUFS. */
function voiceMix(steps) {
  const parts = steps.map((s, i) => `[1:a]atrim=start=${s.cut[0].toFixed(3)}:end=${s.cut[1].toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${Math.max(0, s.cut[1] - s.cut[0] - 0.06).toFixed(3)}:d=0.06,adelay=${Math.round(s.at * 1000)}:all=1[v${i}]`)
  return `${parts.join(';')};${steps.map((_, i) => `[v${i}]`).join('')}amix=inputs=${steps.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[voice]`
}

function findFfmpeg(needH264) {
  const list = [process.env.FFMPEG, 'ffmpeg'].filter(Boolean)
  for (const f of list) {
    const r = spawnSync(f, ['-hide_banner', '-encoders'], { encoding: 'utf8' })
    if (r.status === 0 && (!needH264 || /libx264/.test(r.stdout))) return f
  }
  if (needH264) return null
  const pw = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux'
  return existsSync(pw) ? pw : null
}

const fontFiles = () => {
  const dir = (pkg) => join(ROOT, 'node_modules', '@fontsource-variable', pkg, 'files')
  const pick = (pkg, re) => { try { const d = dir(pkg); return join(d, spawnSync('ls', [d], { encoding: 'utf8' }).stdout.split('\n').find((f) => re.test(f))) } catch { return null } }
  return { archivo: pick('archivo', /latin-wdth-normal\.woff2$/) || pick('archivo', /latin-wght-normal\.woff2$/), hanken: pick('hanken-grotesk', /latin-wght-normal\.woff2$/) }
}

const COMPOSITOR = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Archivo; src: url(/font/archivo.woff2); font-stretch: 62% 125%; font-weight: 100 900 }
@font-face { font-family: Hanken; src: url(/font/hanken.woff2); font-weight: 100 900 }
html, body { margin: 0; background: ${COLORS.parchment} } canvas { display: block }</style>
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
const c = document.getElementById('c'); const x = c.getContext('2d')
const cache = new Map(); let logo = null
async function img(src) {
  if (cache.has(src)) return cache.get(src)
  const b = await (await fetch(src)).blob(); const bm = await createImageBitmap(b)
  cache.set(src, bm); if (cache.size > 6) { const k = cache.keys().next().value; cache.get(k).close?.(); cache.delete(k) }
  return bm
}
function pointer(px, py, s) {
  x.save(); x.translate(px, py); x.scale(s, s)
  x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 22); x.lineTo(6, 17); x.lineTo(10, 26); x.lineTo(14, 24); x.lineTo(10, 15); x.lineTo(17, 15); x.closePath()
  x.fillStyle = '#fff'; x.strokeStyle = '#33352A'; x.lineWidth = 1.6; x.lineJoin = 'round'; x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 6; x.fill(); x.shadowBlur = 0; x.stroke(); x.restore()
}
function label(n, text) {
  x.save(); x.font = '600 30px Hanken'; const w = x.measureText(text).width
  const pad = 22, h = 64, bx = 48, by = ${H} - 48 - h
  x.fillStyle = 'rgba(51,53,42,.88)'; x.beginPath(); x.roundRect(bx, by, w + 64 + pad * 2, h, 32); x.fill()
  x.fillStyle = '${COLORS.mustard}'; x.beginPath(); x.arc(bx + pad + 18, by + h / 2, 18, 0, Math.PI * 2); x.fill()
  x.fillStyle = '#33352A'; x.font = '800 22px Archivo'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), bx + pad + 18, by + h / 2 + 1)
  x.fillStyle = '#fff'; x.font = '600 30px Hanken'; x.textAlign = 'left'; x.fillText(text, bx + pad + 52, by + h / 2 + 1); x.restore()
}
async function card(lines, a) {
  if (!logo) logo = await createImageBitmap(await (await fetch('/logo.png')).blob()) // kept apart from the frame cache
  x.fillStyle = '${COLORS.parchment}'; x.fillRect(0, 0, ${W}, ${H})
  x.save(); x.globalAlpha = a
  const lh = 190; x.drawImage(logo, ${W} / 2 - lh * logo.width / logo.height / 2, 250, lh * logo.width / logo.height, lh)
  x.textAlign = 'center'; x.fillStyle = '${COLORS.ink}'
  x.font = '800 96px Archivo'; x.fontStretch = 'condensed'; x.fillText(lines[0], ${W} / 2, 600)
  x.font = '500 40px Hanken'; x.fillStyle = '${COLORS.bark}'; x.fillText(lines[1], ${W} / 2, 680)
  x.restore()
}
window.draw = async (f) => {
  if (f.card) { await card(f.card, f.alpha) } else {
    const im = await img(f.src)
    x.fillStyle = '${COLORS.parchment}'; x.fillRect(0, 0, ${W}, ${H})
    // the screen fitted in the frame (a phone stands upright in the middle), then the camera; all in output pixels
    const { ox, oy, dw, dh } = f
    x.save(); x.translate(${W} / 2, ${H} / 2); x.scale(f.zoom, f.zoom); x.translate(-f.cx, -f.cy)
    if (dw < ${W}) { x.shadowColor = 'rgba(51,53,42,.28)'; x.shadowBlur = 50; x.shadowOffsetY = 18; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(ox, oy, dw, dh, 28); x.fill(); x.shadowColor = 'transparent'; x.save(); x.beginPath(); x.roundRect(ox, oy, dw, dh, 28); x.clip() }
    x.drawImage(im, ox, oy, dw, dh)
    if (dw < ${W}) x.restore()
    if (f.ptr) {
      const px = f.ptr.x, py = f.ptr.y
      for (const r of f.ripples) { x.beginPath(); x.arc(px, py, 8 + r.k * 46, 0, Math.PI * 2); x.strokeStyle = 'rgba(217,164,65,' + (1 - r.k) + ')'; x.lineWidth = 6; x.stroke(); x.fillStyle = 'rgba(217,164,65,' + (0.28 * (1 - r.k)) + ')'; x.fill() }
      x.restore(); x.save()
      const sx = ${W} / 2 + (px - f.cx) * f.zoom, sy = ${H} / 2 + (py - f.cy) * f.zoom
      pointer(sx, sy, 1.5)
    }
    x.restore()
    if (f.label) label(f.n, f.label)
  }
  return c.toDataURL('image/jpeg', 0.9).slice(23)
}
</script>`

async function render(scene, log) {
  const steps = plan(scene, log)
  const ff = findFfmpeg(true) || findFfmpeg(false)
  if (!ff) throw new Error('No ffmpeg found to encode the video.')
  const h264 = /libx264/.test(spawnSync(ff, ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '')
  const out = join(OUT, `${sceneName}${VOICE ? '' : '-sin-voz'}.${h264 ? 'mp4' : 'webm'}`)
  const total = steps.reduce((a, s) => a + s.out, 0)
  // frames go to ffmpeg through a named pipe (the bundled ffmpeg has no pipe: input)
  const FIFO = join(WORK, 'frames.fifo')
  rmSync(FIFO, { force: true })
  spawnSync('mkfifo', [FIFO])
  const enc = h264
    ? ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', FIFO, ...(VOICE ? ['-i', VOICE, '-filter_complex', voiceMix(steps), '-map', '0:v', '-map', '[voice]', '-c:a', 'aac', '-b:a', '128k'] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', total.toFixed(2), out]
    : ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', FIFO, '-c:v', 'libvpx', '-b:v', '1200k', '-maxrate', '1800k', '-bufsize', '3600k', '-deadline', 'good', '-cpu-used', '4', out]
  const proc = spawn(ff, enc, { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  let closed = null
  proc.stderr.on('data', (d) => { err = (err + d).slice(-4000) })
  proc.on('close', (c) => { closed = c })
  const sink = createWriteStream(FIFO)
  sink.on('error', () => {})

  const { chromium } = loadPlaywright()
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  const fonts = fontFiles()
  await page.route('http://guide.local/**', (route) => {
    const p = new URL(route.request().url()).pathname
    if (p === '/') return route.fulfill({ contentType: 'text/html', body: COMPOSITOR })
    if (p === '/logo.png') return route.fulfill({ path: join(ROOT, 'public', 'logo-green.png') })
    if (p.startsWith('/font/')) return route.fulfill({ path: p.includes('archivo') ? fonts.archivo : fonts.hanken })
    if (p.startsWith('/f/')) return route.fulfill({ path: join(WORK, 'f', p.slice(3)), contentType: 'image/jpeg' })
    return route.fulfill({ status: 404 })
  })
  await page.goto('http://guide.local/')
  await page.evaluate(() => document.fonts.ready)

  const frames = log.frames
  const frameAt = (t) => { let lo = 0; let hi = frames.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (frames[m].t <= t) lo = m; else hi = m - 1 } return frames[lo] }
  const lastBefore = (arr, t) => { let r = null; for (const e of arr) { if (e.t > t) break; r = e } return r }
  const ptrAt = (t) => { const a = lastBefore(log.pointer, t); return a ? { x: a.x, y: a.y } : null }
  const viewAt = (t) => lastBefore(log.view, t) || log.view[0]
  let cam = { zoom: 1, cx: W / 2, cy: H / 2 }
  let n = 0
  for (const step of steps) {
    const frames_ = Math.round(step.out * FPS)
    const rate = step.src && step.out > 0 ? Math.min(2, Math.max(1, step.rec / step.out)) : 1
    const stepNo = scene.steps.filter((s, j) => !s.card && j <= step.i).length
    for (let k = 0; k < frames_; k++) {
      let f
      if (step.card) {
        const lines = step.card === 'title' ? scene.title : [scene.closing[0], step.i === scene.steps.length - 1 ? scene.closing[1] : '']
        f = { card: lines, alpha: Math.min(1, k / (FPS * 0.4)) }
      } else {
        const t = Math.min(step.src.t0 + (k / FPS) * 1000 * rate, step.src.t1)
        const fr = frameAt(t)
        const v = viewAt(t)
        // CSS px → output px: the screen fitted in the frame
        const fit = Math.min(W / v.width, H / v.height)
        const ox = (W - v.width * fit) / 2
        const oy = (H - v.height * fit) / 2
        // camera: ease toward the current target (zoom up to 1.8×, never past the frame's edges)
        const tgt = lastBefore(log.camera, t)
        let want = { zoom: 1, cx: W / 2, cy: H / 2 }
        if (tgt?.box) {
          const bw = tgt.box.width * fit
          const bh = tgt.box.height * fit
          const zoom = Math.max(1, Math.min(1.8, Math.min((0.55 * W) / bw, (0.55 * H) / bh)))
          const bx = ox + (tgt.box.x + tgt.box.width / 2) * fit
          const by = oy + (tgt.box.y + tgt.box.height / 2) * fit
          const half = { x: W / 2 / zoom, y: H / 2 / zoom }
          want = { zoom, cx: Math.min(W - half.x, Math.max(half.x, bx)), cy: Math.min(H - half.y, Math.max(half.y, by)) }
        }
        const a = 0.09
        cam = { zoom: cam.zoom + (want.zoom - cam.zoom) * a, cx: cam.cx + (want.cx - cam.cx) * a, cy: cam.cy + (want.cy - cam.cy) * a }
        const ripples = log.pointer.filter((p) => p.click && t >= p.t && t - p.t < 500).map((p) => ({ k: (t - p.t) / 500 }))
        const p = ptrAt(t)
        f = { src: `/f/${fr.file}`, ox, oy, dw: v.width * fit, dh: v.height * fit, zoom: cam.zoom, cx: cam.cx, cy: cam.cy, ptr: p && { x: ox + p.x * fit, y: oy + p.y * fit }, ripples, label: step.label, n: stepNo }
      }
      const jpg = await page.evaluate((fr) => window.draw(fr), f)
      if (closed !== null) throw new Error(`ffmpeg stopped:\n${err}`)
      if (STILLS && n % (FPS * 3) === 0) writeFileSync(join(OUT, `${sceneName}-${String(Math.round(n / FPS)).padStart(3, '0')}s.jpg`), Buffer.from(jpg, 'base64'))
      if (!sink.write(Buffer.from(jpg, 'base64'))) await new Promise((r) => { sink.once('drain', r); proc.once('close', r) })
      n++
    }
  }
  await new Promise((r) => sink.end(r))
  const code = closed ?? await new Promise((r) => proc.on('close', r))
  await browser.close()
  if (code !== 0) throw new Error(`ffmpeg failed:\n${err}`)
  return { out, frames: n, seconds: total, h264, steps }
}

/* ───────── Main ───────── */

const scene = SCENES[sceneName]
if (!scene || !scene.steps.length) { console.error(`No steps for "${sceneName}" yet.`); process.exit(2) }
mkdirSync(OUT, { recursive: true })
const log = args.includes('--rerender') && existsSync(join(WORK, 'log.json')) ? JSON.parse(readFileSync(join(WORK, 'log.json'), 'utf8')) : await record(scene)
const res = await render(scene, log)
console.log(`${res.out}\n${res.seconds.toFixed(1)} s · ${res.frames} frames · ${res.h264 ? 'MP4 (H.264)' : 'WebM (VP8, silent cut: no H.264 encoder here)'}`)
for (const s of res.steps) console.log(`  ${String(s.i + 1).padStart(2)} ${s.out.toFixed(1)} s (sentence ${s.say.toFixed(1)} s, recorded ${s.rec.toFixed(1)} s) ${s.label || s.card}`)
