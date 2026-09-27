import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

// QR codes are made in the browser (no outside service), with the highest error correction (H, ~30%)
// so the club logo in the centre never stops it from scanning.
const GREEN = '#2E5339'
const LOGO_SHARE = 0.22 // logo box width ÷ QR width (well inside what level H recovers)
const QUIET = 4 // blank modules around the code, as the standard asks

/** The link families open: the club's page, with the download buttons. */
export const appLink = () => (typeof window === 'undefined' ? '' : `${window.location.origin}/`)

function matrix(value) {
  const qr = qrcode(0, 'H')
  qr.addData(value)
  qr.make()
  const n = qr.getModuleCount()
  return { n, dark: (r, c) => qr.isDark(r, c) }
}

/** Logo box in module units, snapped to whole modules and centred. */
function logoBox(n) {
  let size = Math.round(n * LOGO_SHARE)
  if ((n - size) % 2) size += 1
  const start = (n - size) / 2
  return { start, size }
}

export function QrSvg({ value, size = 240, logo = true, className = '', title }) {
  const { n, path, box } = useMemo(() => {
    const m = matrix(value)
    const b = logoBox(m.n)
    let d = ''
    for (let r = 0; r < m.n; r++) {
      for (let c = 0; c < m.n; c++) {
        const inLogo = logo && r >= b.start - 1 && r < b.start + b.size + 1 && c >= b.start - 1 && c < b.start + b.size + 1
        if (m.dark(r, c) && !inLogo) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`
      }
    }
    return { n: m.n, path: d, box: b }
  }, [value, logo])
  const total = n + QUIET * 2
  return (
    <svg className={`qr ${className}`} width={size} height={size} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={title || value} shapeRendering="crispEdges">
      <rect width={total} height={total} fill="#fff" />
      <path d={path} fill={GREEN} />
      {logo && (
        <>
          <rect x={box.start + QUIET} y={box.start + QUIET} width={box.size} height={box.size} rx={box.size * 0.18} fill={GREEN} />
          <image href="/logo-white.png" x={box.start + QUIET + box.size * 0.14} y={box.start + QUIET + box.size * 0.1}
            width={box.size * 0.72} height={box.size * 0.8} preserveAspectRatio="xMidYMid meet" />
        </>
      )}
    </svg>
  )
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = src
})

/** A PNG of the QR (with the logo), ready to download or print. */
export async function qrPngUrl(value, px = 1024) {
  const m = matrix(value)
  const b = logoBox(m.n)
  const total = m.n + QUIET * 2
  const unit = Math.floor(px / total)
  const side = unit * total
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, side, side)
  ctx.fillStyle = GREEN
  for (let r = 0; r < m.n; r++) {
    for (let c = 0; c < m.n; c++) {
      const inLogo = r >= b.start - 1 && r < b.start + b.size + 1 && c >= b.start - 1 && c < b.start + b.size + 1
      if (m.dark(r, c) && !inLogo) ctx.fillRect((c + QUIET) * unit, (r + QUIET) * unit, unit, unit)
    }
  }
  const x = (b.start + QUIET) * unit
  const w = b.size * unit
  ctx.beginPath()
  ctx.roundRect(x, x, w, w, w * 0.18)
  ctx.fill()
  try {
    const logo = await loadImage('/logo-white.png')
    const lw = w * 0.72
    const lh = w * 0.8
    const scale = Math.min(lw / logo.width, lh / logo.height)
    ctx.drawImage(logo, x + (w - logo.width * scale) / 2, x + (w - logo.height * scale) / 2, logo.width * scale, logo.height * scale)
  } catch { /* the code still scans without the logo */ }
  return canvas.toDataURL('image/png')
}
