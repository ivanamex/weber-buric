#!/usr/bin/env node
/**
 * Hover audit: every interactive element in the app, the panel and the website must change on hover.
 *
 * Opens the demo (both roles, every route, every tab, the first side panel of each table) plus the website and the
 * download page at 1440×900, collects every button, link, tab, option, switch, summary, clickable row and card, reads
 * its computed style, hovers it, reads again, and lists the ones where nothing changed (disabled elements are skipped;
 * a selected tab or pressed pill only needs the pointer).
 *
 *   npm run check:hover            (expects a preview on http://localhost:4173, or starts one from dist/)
 *   HOVER_BASE=http://localhost:5173 node scripts/hover-audit.mjs
 *
 * It also lists text-level elements (nav and text links, table headers, unselected tabs, sidebar items) whose hover
 * adds a background or a pill: the "too strong" case. They should only change color and grow an underline.
 *
 * And it lists cards in the app and the panel with a band of more than 80 px with nothing in it (a card stretched to
 * match a taller neighbour while its content stays short), by screen; Resumen is also checked at 1280 and 1920 px.
 *
 * It also lists elements with a color of their own (`.c-<color>`) whose hover background isn't their own light tint (--ch).
 *
 * And it lists text, buttons, fields and images closer than 12 px to the edge of their lightbox, sheet, card, tile or
 * sticky footer (nothing touches an edge), by screen; the Clases lightbox is also checked at 1920×830, 1440×760 and 390×844,
 * and the shop's product window, cart and checkout at 1440×900 and 390×844.
 *
 * Exit code 1 when any element has no hover, a text-level one gets a background, a colored element hovers in another
 * color, or a card is mostly empty.
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.HOVER_BASE || 'http://localhost:4173'
const require = createRequire(import.meta.url)

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright'].filter(Boolean)
  for (const c of candidates) {
    try { return require(c) } catch { /* next */ }
  }
  throw new Error('Playwright not found: npm i -g playwright, or set PLAYWRIGHT_MODULE to its folder')
}

async function reachable(url) {
  try { const r = await fetch(url); return r.ok } catch { return false }
}

async function ensureServer() {
  if (await reachable(`${BASE}/demo`)) return null
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) throw new Error(`Nothing answers at ${BASE} and there is no dist/: run "npm run build" (or "npx vite build") first`)
  const port = new URL(BASE).port || '4173'
  const child = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { cwd: ROOT, stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200))
    if (await reachable(`${BASE}/demo`)) return child
  }
  child.kill()
  throw new Error(`The preview did not start on ${BASE}`)
}

// Family and management screens, then the website and the download page.
const FAMILY = ['', 'reservar', 'plan', 'caballo', 'pagos', 'eventos', 'tienda', 'perfil', 'instalar', 'ajustes', 'mas'].map((p) => `/demo/familia${p ? `/${p}` : ''}`)
const ADMIN = ['', 'hoy', 'horario', 'horario?vista=caballos', 'cobros', 'familias', 'mensajes', 'tienda', 'tienda?vista=productos', 'tienda?vista=freeride', 'nomina', 'rentabilidad', 'reportes', 'ajustes'].map((p) => `/demo/direccion${p ? `/${p}` : ''}`)
const SITE = ['/', '/en', '/tienda', '/en/shop', '/descargar']

const PICK = [
  'button', 'a[href]', '[role="tab"]', '[role="button"]', '[role="link"]', '[role="option"]', '[role="switch"]', 'summary',
  'label:has(input[type="checkbox"]), label:has(input[type="radio"]), label:has(input[type="file"])', '[tabindex="0"]', 'tr.is-clickable', '.ctile', '.scard', '.sbox', '.feature', '.stat--link',
].join(', ')

/** Runs in the page: a style snapshot of the element, its ::before/::after and its first descendants. */
// Level 1 (text): these may change color, grow an underline (background-image) or show a side bar, never a background.
const LEVEL1 = [
  '.sbar__nav a', '.sbar__login', '.link', '.crumbs a', '.lheader__login', '.dtable__sort', '.segmented button:not(.is-active)', '.demobar__switch button:not(.is-active)',
  '.demobar__exit', '.login__back', '.msg__contact a', '.desk__link:not(.is-active)', '.fdesk__link:not(.is-active)', '.tabbar__item:not(.is-active)', '.slinkarrow',
  '.sfooter__links a', '.sfooter__legal a', '.svisit2__wa', '.sback', '.slist a', '.ebank__copy', '.tlink', '.stat__split a',
].join(', ')

/** The background colors an element shows (itself and its ::before/::after): a level-1 hover must not add one.
 *  A pseudo-element 3 px tall or less is the underline, which is allowed. */
const BACKGROUNDS = (el) => {
  const own = getComputedStyle(el).backgroundColor
  const pseudo = ['::before', '::after'].map((p) => {
    const c = getComputedStyle(el, p)
    if (c.content === 'none' || c.display === 'none' || parseFloat(c.height) <= 3) return 'line'
    return `${c.backgroundColor}|${c.opacity}`
  })
  return [own, ...pseudo].join(' ')
}

const SNAPSHOT = (el) => {
  const props = ['background-color', 'background-image', 'color', 'border-color', 'box-shadow', 'transform', 'text-decoration-line', 'outline-color', 'outline-style', 'opacity', 'filter', 'background-position', 'background-size', 'fill', 'stroke']
  const read = (node, pseudo) => { const c = getComputedStyle(node, pseudo); return props.map((p) => c.getPropertyValue(p)).join('|') }
  const parts = [read(el), read(el, '::before'), read(el, '::after')]
  const kids = el.querySelectorAll('*')
  for (let i = 0; i < Math.min(kids.length, 12); i++) parts.push(read(kids[i]), read(kids[i], '::before'))
  return parts.join('\n')
}

const DESCRIBE = (el) => {
  const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
  const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.')
  return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + (text ? ' "' + text + '"' : '')
}

const strong = []
const colored = []

async function auditPage(page, route, seen, out) {
  const handles = await page.$$(PICK)
  let checked = 0
  for (const h of handles) {
    const info = await h.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled], [aria-disabled="true"]') !== null
      const selected = el.classList.contains('is-active') || el.classList.contains('is-on') || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-current') !== null || el.classList.contains('is-selected')
      const folded = Boolean(el.closest('details:not([open])')) && !el.closest('summary') // inside a closed <details>
      const visible = !folded && r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0 && cs.pointerEvents !== 'none'
      const scrim = /scrim|visually-hidden|hoof|canvas/.test(el.className || '') || el.tabIndex === -1 && el.tagName === 'BUTTON' && /scrim/.test(el.className)
      return { visible, disabled, selected, scrim, cursor: cs.cursor, w: Math.round(r.width), h: Math.round(r.height) }
    }).catch(() => null)
    if (!info || !info.visible || info.disabled || info.scrim) continue
    const key = await h.evaluate((el) => { const path = []; let n = el; while (n && n.nodeType === 1 && path.length < 6) { path.unshift(n.tagName + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '')); n = n.parentElement } return path.join('>') + '#' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30) })
    if (seen.has(key)) continue
    seen.add(key)
    checked++
    await h.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }))
    await page.mouse.move(0, 0)
    await page.waitForTimeout(60)
    const box = await h.boundingBox()
    if (!box) continue
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const onTop = await page.evaluate(({ x, y }) => { const t = document.elementFromPoint(x, y); return t ? [t, ...(t.getRootNode() === document ? [] : [])] : null }, { x: cx, y: cy }).catch(() => null)
    const covered = await h.evaluate((el, pt) => { const t = document.elementFromPoint(pt.x, pt.y); return !t || !(el === t || el.contains(t) || t.contains(el)) }, { x: cx, y: cy }).catch(() => true)
    if (covered || !onTop) continue
    const before = await h.evaluate(SNAPSHOT)
    const level1 = await h.evaluate((el, sel) => el.matches(sel), LEVEL1).catch(() => false)
    const bgBefore = level1 ? await h.evaluate(BACKGROUNDS) : null
    await page.mouse.move(cx, cy)
    await page.waitForTimeout(80)
    const after = await h.evaluate(SNAPSHOT).catch(() => before)
    const bgAfter = level1 ? await h.evaluate(BACKGROUNDS).catch(() => bgBefore) : null
    // A colored element (.c-<color>) must hover to its own light fill (--ch), not mustard or anything else.
    const own = info.selected ? null : await h.evaluate((el) => {
      if (![...el.classList].some((c) => /^c-[a-z]+$/.test(c))) return null
      const want = getComputedStyle(el).getPropertyValue('--ch').trim()
      if (!want) return null
      const g = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
      const px = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data] }
      const a = px(want)
      const b = px(getComputedStyle(el).backgroundColor)
      return { ok: a.every((v, i) => Math.abs(v - b[i]) <= 3), want: `rgb(${a.slice(0, 3)})`, got: `rgb(${b.slice(0, 3)})` }
    }).catch(() => null)
    if (own && !own.ok) colored.push({ route, what: await h.evaluate(DESCRIBE), got: own.got, want: own.want })
    await page.mouse.move(0, 0)
    if (before === after && !(info.selected && info.cursor === 'pointer')) {
      out.push({ route, what: await h.evaluate(DESCRIBE), cursor: info.cursor, selected: info.selected })
    } else if (level1 && bgBefore !== bgAfter) {
      strong.push({ route, what: await h.evaluate(DESCRIBE) })
    }
  }
  return checked
}

const EMPTY_MAX = 80

/** Cards whose content ends more than EMPTY_MAX px above their bottom edge (padding excluded). */
async function emptyCards(page, route, out) {
  const found = await page.evaluate((max) => {
    const LEAF = new Set(['IMG', 'SVG', 'CANVAS', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'VIDEO', 'HR', 'PROGRESS', 'METER'])
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' }
    const name = (el) => (el.closest('.sumblock, .homegrid > div, .reviewblock, section')?.querySelector('.section-title h2')?.textContent || el.querySelector('h2, h3, .card__label, .card__title, strong, b')?.textContent || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)
    const res = []
    for (const card of document.querySelectorAll('.desk__content .card, .fdesk__content .card, .page .card')) {
      if (!visible(card) || card.closest('.sheet, .paydlg, [role="dialog"]')) continue
      const cs = getComputedStyle(card)
      const box = card.getBoundingClientRect()
      const top = box.top + parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth)
      const bottom = box.bottom - parseFloat(cs.paddingBottom) - parseFloat(cs.borderBottomWidth)
      // The content's vertical extents; the largest band with nothing in it (between, above or below) is the gap.
      const spans = []
      for (const el of card.querySelectorAll('*')) {
        const leaf = LEAF.has(el.tagName.toUpperCase()) || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        if (!leaf || el.closest('.visually-hidden') || !visible(el)) continue
        const r = el.getBoundingClientRect()
        spans.push([r.top, r.bottom])
      }
      spans.sort((a, b) => a[0] - b[0])
      let gap = 0
      let reach = top
      for (const [a, b] of spans) { gap = Math.max(gap, a - reach); reach = Math.max(reach, b) }
      gap = Math.round(Math.max(gap, bottom - reach))
      if (gap > max) res.push(`${name(card)} — ${gap} px empty`)
    }
    return res
  }, EMPTY_MAX)
  for (const what of found) empties.push({ route, what })
}
const empties = []

const EDGE_MIN = 12
const EDGE_BOXES = '.ssheet2__panel, .efoot, .isheet__panel, .paydlg__panel, .paydlg__body, .card, .ctile, .package, .paycard, .democard, .login__panel, .esum, .eplan, .erow, .sbox, .feature, .pcard, .pinfo, .pgal, .cartdrw__panel, .cartdrw__foot, .toorder'

/**
 * Nothing touches an edge: text, buttons, fields and images inside a lightbox, sheet, card, tile or sticky footer must
 * sit at least EDGE_MIN px from that container's edge. Photos that bleed on purpose (touching two sides) are fine.
 * While a container scrolls, only its sides are checked (a line can be scrolled to any height).
 */
async function edgeCheck(page, route) {
  const found = await page.evaluate(({ min, boxes }) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 }
    const label = (el) => (el.getAttribute?.('aria-label') || el.textContent || el.getAttribute?.('alt') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
    const boxName = (b) => `.${[...b.classList].filter((c) => !c.startsWith('is-') && !c.startsWith('c-')).join('.')}`
    const scrolls = (el, stop) => { for (let n = el.parentElement; n && n !== stop.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return true } return false }
    const sticky = (el, stop) => { for (let n = el; n && n !== stop; n = n.parentElement) if (getComputedStyle(n).position === 'sticky') return true; return false }
    const res = new Set()
    for (const box of document.querySelectorAll(boxes)) {
      if (!visible(box) || box.closest('[aria-hidden="true"]')) continue
      const b = box.getBoundingClientRect()
      const cs = getComputedStyle(box)
      const inner = { left: b.left + parseFloat(cs.borderLeftWidth), right: b.right - parseFloat(cs.borderRightWidth), top: b.top + parseFloat(cs.borderTopWidth), bottom: b.bottom - parseFloat(cs.borderBottomWidth) }
      const items = []
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement) || n.parentElement.closest('.visually-hidden, [aria-hidden="true"]')) continue
        const r = document.createRange(); r.selectNodeContents(n)
        for (const rect of r.getClientRects()) if (rect.width > 1) items.push({ el: n.parentElement, rect, what: n.textContent })
      }
      for (const el of box.querySelectorAll('button, a, input, select, textarea, img, svg, video')) {
        if (!visible(el) || el.closest('.visually-hidden, [aria-hidden="true"], .ssheet2__photo, .pcard__photo') || el.matches('.ssheet2__close, .ssheet2__close *')) continue
        const nested = el.closest(boxes); if (nested !== box && box.contains(nested) && nested !== el) continue // judged by its own container
        items.push({ el, rect: el.getBoundingClientRect(), what: label(el) })
      }
      for (const { el, rect, what } of items) {
        const nested = el.closest(boxes); if (nested && nested !== box && box.contains(nested)) continue
        const d = { left: rect.left - inner.left, right: inner.right - rect.right, top: rect.top - inner.top, bottom: inner.bottom - rect.bottom }
        const vertical = !scrolls(el, box) || sticky(el, box)
        const sides = ['left', 'right'].concat(vertical ? ['top', 'bottom'] : [])
        if (sides.some((k) => d[k] < -1)) continue // outside (scrolled away or clipped on purpose)
        const tight = sides.filter((k) => d[k] < min - 0.5)
        if (!tight.length) continue
        if (el.matches('img, video, svg') && tight.length >= 2) continue // a photo that bleeds on purpose
        res.add(`${boxName(box)} › "${String(what).trim().replace(/\s+/g, ' ').slice(0, 40)}" — ${tight.map((k) => `${k} ${Math.round(d[k])} px`).join(', ')}`)
      }
    }
    return [...res]
  }, { min: EDGE_MIN, boxes: EDGE_BOXES })
  for (const what of found) edges.push({ route, what })
}
const edges = []

/** Every tab on the page (segmented controls, view toggles), then the first clickable row's side panel. */
async function variants(page) {
  const list = []
  const tabs = await page.$$('[role="tab"]:not(.is-active):not(.demobar__switch *), .segmented button:not(.is-active)')
  for (const t of tabs.slice(0, 12)) list.push({ name: 'tab', act: () => t.click({ timeout: 1000 }).catch(() => {}) })
  list.push({ name: 'row', act: () => page.click('tr.is-clickable >> nth=0', { timeout: 1000 }).catch(() => {}) })
  list.push({ name: 'edit', act: () => page.click('button:has-text("Editar") >> nth=0', { timeout: 1000 }).catch(() => {}) })
  return list
}

async function main() {
  const { chromium } = loadPlaywright()
  const server = await ensureServer()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const out = []
  let total = 0
  // No smooth scrolling and no transitions while auditing: the box is where the element is, and a hover state is read in its final form.
  const settle = () => page.addStyleTag({ content: 'html { scroll-behavior: auto !important } *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important }' }).catch(() => {})
  const go = async (path) => { await page.evaluate((p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate')) }, path); await page.waitForTimeout(500) }
  const enter = async (role) => {
    await page.goto(`${BASE}/demo?reset=1`, { waitUntil: 'networkidle' })
    // Spanish names below; the English site sets the language, so put it back first.
    if (await page.evaluate(() => { try { if (localStorage.getItem('hipico.lang') === 'es') return false; localStorage.setItem('hipico.lang', 'es'); return true } catch { return false } })) await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: role === 'family' ? /familia/i : /dirección/i }).first().click()
    await page.waitForTimeout(600)
    await page.evaluate(() => { try { localStorage.setItem('hipico.installOffered', '1') } catch { /* no storage */ } })
    await settle()
  }
  try {
    for (const [role, routes] of [['family', FAMILY], ['admin', ADMIN]]) {
      await enter(role)
      for (const route of routes) {
        await go(route)
        await page.evaluate(() => document.querySelector('.installcard .link, .installcard button[aria-label]')?.click()).catch(() => {})
        const seen = new Set()
        await emptyCards(page, route, out)
        await edgeCheck(page, route)
        total += await auditPage(page, route, seen, out)
        for (const v of await variants(page)) {
          await v.act()
          await page.waitForTimeout(400)
          await edgeCheck(page, `${route} (${v.name})`)
          total += await auditPage(page, `${route} (${v.name})`, seen, out)
          await page.keyboard.press('Escape').catch(() => {})
          await page.waitForTimeout(150)
        }
      }
    }
    // Resumen at the other computer widths too: equal-height rows stretch cards differently.
    await enter('admin')
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      await go('/demo/direccion')
      await emptyCards(page, `/demo/direccion @${width}`, out)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const route of SITE) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      await settle()
      const seen = new Set()
      total += await auditPage(page, route, seen, out)
      // the service lightboxes
      for (let i = 0; i < 4 && route !== '/descargar'; i++) {
        const cards = await page.$$('.scard')
        if (!cards[i]) break
        await cards[i].click().catch(() => {})
        await page.waitForTimeout(500)
        await edgeCheck(page, `${route} (lightbox ${i + 1})`)
        total += await auditPage(page, `${route} (lightbox ${i + 1})`, seen, out)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    }
    // The shop: the product window (a size chosen, added), the cart and its checkout, on a computer and on a phone.
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto(`${BASE}/tienda`, { waitUntil: 'networkidle' })
      await page.evaluate(() => { try { localStorage.removeItem('hipico.cart') } catch { /* no storage */ } })
      await page.waitForTimeout(500)
      await settle()
      const seen = new Set()
      await edgeCheck(page, `/tienda ${w}×${h}`)
      await page.click('.pcard__photo >> nth=0').catch(() => {})
      await page.waitForTimeout(500)
      await edgeCheck(page, `/tienda ${w}×${h} (producto)`)
      if (w === 1440) total += await auditPage(page, '/tienda (producto)', seen, out)
      await page.click('.sizepill:not(:disabled) >> nth=0').catch(() => {})
      await page.click('.pinfo .shopbtn--main').catch(() => {})
      await page.waitForTimeout(1400)
      await edgeCheck(page, `/tienda ${w}×${h} (carrito)`)
      if (w === 1440) total += await auditPage(page, '/tienda (carrito)', seen, out)
      await page.click('.cartdrw__foot .shopbtn').catch(() => {})
      await page.waitForTimeout(400)
      await page.click('.cartdrw .paycard >> nth=1').catch(() => {})
      await page.waitForTimeout(400)
      await edgeCheck(page, `/tienda ${w}×${h} (pago)`)
      if (w === 1440) total += await auditPage(page, '/tienda (pago)', seen, out)
      await page.evaluate(() => { try { localStorage.removeItem('hipico.cart') } catch { /* no storage */ } })
      // A FreeRide product (always to order) and the language menu.
      await page.goto(`${BASE}/tienda`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
      await settle()
      await page.click('.pcard--fre .pcard__photo >> nth=0').catch(() => {})
      await page.waitForTimeout(500)
      await edgeCheck(page, `/tienda ${w}×${h} (FreeRide)`)
      if (w === 1440) total += await auditPage(page, '/tienda (FreeRide)', seen, out)
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(300)
      if (w === 1440) {
        await page.click('.sbar .langm__btn').catch(() => {})
        await page.waitForTimeout(250)
        total += await auditPage(page, '/tienda (idioma)', seen, out)
        await page.keyboard.press('Escape').catch(() => {})
      }
    }
    // The Clases lightbox at Ivana's sizes and on a phone (both tabs, then details + payment), and the payment window.
    for (const [w, h] of [[1920, 830], [1440, 760], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h })
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
      await settle()
      await page.click('.scard >> nth=0').catch(() => {})
      await page.waitForTimeout(600)
      await edgeCheck(page, `/ Clases ${w}×${h} (Plan mensual)`)
      await page.click('.etab >> nth=1').catch(() => {})
      await page.waitForTimeout(300)
      await edgeCheck(page, `/ Clases ${w}×${h} (Sin plan)`)
      await page.click('.efoot__btn').catch(() => {})
      await page.waitForTimeout(500)
      await edgeCheck(page, `/ Clases ${w}×${h} (datos y pago)`)
      await page.click('.paycard >> nth=1').catch(() => {})
      await page.waitForTimeout(400)
      await edgeCheck(page, `/ Clases ${w}×${h} (transferencia)`)
    }
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h })
      await enter('family')
      await go('/demo/familia/pagos')
      await page.click('.list__row button:has-text("Pagar"), button:has-text("Pagar") >> nth=0').catch(() => {})
      await page.waitForTimeout(600)
      await edgeCheck(page, `/demo/familia/pagos ${w}×${h} (ventana de pago)`)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
  } finally {
    await browser.close()
    server?.kill()
  }
  const byRoute = out.reduce((m, x) => ((m[x.route] ||= []).push(x), m), {})
  console.log(`Checked ${total} interactive elements. Without hover: ${out.length}. Text-level with a background on hover: ${strong.length}.`)
  for (const [route, items] of Object.entries(byRoute)) {
    console.log(`\n${route}`)
    for (const x of items) console.log(`  - ${x.what}${x.cursor !== 'pointer' ? ` (cursor: ${x.cursor})` : ''}`)
  }
  if (strong.length) console.log('\nToo strong (text level, but the hover adds a background):')
  for (const x of strong) console.log(`  - ${x.route}: ${x.what}`)
  console.log(`\nColored elements whose hover isn't their own tint: ${colored.length}.`)
  for (const x of colored) console.log(`  - ${x.route}: ${x.what} (hover ${x.got}, should be ${x.want})`)
  console.log(`\nCards with more than ${EMPTY_MAX} px empty: ${empties.length}.`)
  for (const x of empties) console.log(`  - ${x.route}: ${x.what}`)
  console.log(`\nText, buttons or images closer than ${EDGE_MIN} px to their container's edge: ${edges.length}.`)
  const edgeBy = edges.reduce((m, x) => ((m[x.route] ||= []).push(x.what), m), {})
  for (const [route, items] of Object.entries(edgeBy)) { console.log(`  ${route}`); for (const w of items) console.log(`    - ${w}`) }
  process.exit(out.length || strong.length || empties.length || colored.length || edges.length ? 1 : 0)
}

main().catch((e) => { console.error(e.message || e); process.exit(2) })
