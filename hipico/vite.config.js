import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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

export default defineConfig(({ mode }) => {
  const supabase = supabaseEnv(mode)
  return {
  define: {
    __SUPABASE_URL__: JSON.stringify(supabase.url),
    __SUPABASE_KEY__: JSON.stringify(supabase.key),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        background_color: '#F6F2E9',
        theme_color: '#2E5339',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  }
})
