import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import gallery from './scripts/gallery-plugin.mjs'

// Supabase keys: only these public names are read. The Vercel ↔ Supabase integration sets the
// NEXT_PUBLIC_* ones automatically; VITE_* can be set by hand. Secret keys are never bundled.
function supabaseEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ''
  const key = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || ''
  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    throw new Error('Refusing to bundle a Supabase SECRET/service_role key. Use the anon (public) key.')
  }
  return { url, key }
}
function jwtRole(key) {
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { return null }
}

// The build's time, shown as the app's version ("17 oct · 10:40", Cancún) and used to tell builds apart.
function buildStamp() {
  const now = new Date()
  const part = (o) => new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Cancun', ...o }).format(now)
  return { label: `${part({ day: 'numeric', month: 'short' }).replace('.', '')} · ${part({ hour: '2-digit', minute: '2-digit', hour12: false })}`, id: String(now.getTime()) }
}

export default defineConfig(({ mode }) => {
  const supabase = supabaseEnv(mode)
  const build = buildStamp()
  return {
  define: {
    __SUPABASE_URL__: JSON.stringify(supabase.url),
    __SUPABASE_KEY__: JSON.stringify(supabase.key),
    __BUILD__: JSON.stringify(build.label),
    __BUILD_ID__: JSON.stringify(build.id),
  },
  plugins: [
    react(),
    gallery(),
    VitePWA({
      // Registered by src/lib/update.js: a new version waits until the app is idle (or "Actualizar"), then reloads.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon-32.png', 'favicon-64.png', 'icons/apple-touch-icon.png', 'logo-white.png', 'logo-green.png'],
      manifest: {
        name: 'Hípico Riviera Maya',
        short_name: 'Hípico',
        description: 'Reservas de clases, planes mensuales, pensión y pagos del club.',
        lang: 'es-MX',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1EAD8',
        theme_color: '#33352A',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  }
})
