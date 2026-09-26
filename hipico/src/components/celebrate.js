// Small booking celebration: horseshoes and confetti burst from a point, under a second.
// Skipped entirely when the visitor prefers reduced motion.
const SHOE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7.6 5.2A7.4 7.4 0 1 0 16.4 5.2" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>'
const COLORS = ['#F4876A', '#2E5339', '#E6735A', '#7C9070']

export function celebrate(x, y) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const layer = document.createElement('div')
  layer.className = 'celebrate'
  layer.setAttribute('aria-hidden', 'true')
  const count = 14
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span')
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
    const dist = 60 + Math.random() * 50
    const shoe = i % 3 === 0
    piece.className = `celebrate__piece ${shoe ? 'is-shoe' : ''}`
    piece.style.cssText = `left:${x}px;top:${y}px;color:${COLORS[i % COLORS.length]};` +
      `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist - 30}px;--rot:${(Math.random() - 0.5) * 540}deg;` +
      `animation-delay:${Math.random() * 60}ms`
    if (shoe) piece.innerHTML = SHOE
    layer.appendChild(piece)
  }
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 950)
}
