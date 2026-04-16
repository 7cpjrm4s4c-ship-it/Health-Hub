import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType:    'autoUpdate',
      injectRegister: 'auto',
      includeAssets:  ['icons/*.png', 'favicon.ico'],

      manifest: {
        name:             'Health Hub',
        short_name:       'Health Hub',
        description:      'Dein persönlicher Health Data Hub',
        theme_color:      '#080808',
        background_color: '#080808',
        display:          'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation:      'portrait',
        start_url:        base,
        scope:            base,
        categories:       ['health', 'medical', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },

      workbox: {
        globPatterns:          ['**/*.{js,css,html,png,svg,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback:      'index.html',

        runtimeCaching: [
          // Navigation
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler:    'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // JS bundles
          {
            urlPattern: ({ request }) => request.destination === 'script',
            handler:    'StaleWhileRevalidate',
            options: {
              cacheName:  'js-assets',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          // CSS
          {
            urlPattern: ({ request }) => request.destination === 'style',
            handler:    'StaleWhileRevalidate',
            options: {
              cacheName:  'css-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          // Images
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler:    'CacheFirst',
            options: {
              cacheName:  'images',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // API – future sync readiness (Shortcuts bridge, health imports, AI)
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler:    'NetworkFirst',
            options: {
              cacheName:             'api',
              networkTimeoutSeconds: 2,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
})
