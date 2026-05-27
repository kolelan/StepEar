import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

/** /stepear/ для https://example.ru/stepear/ ; / для корня домена. */
function normalizeBase(path: string | undefined): string {
  if (!path || path === '/') return '/'
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  return `/${trimmed}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'StepEar — Угадай ступень',
          short_name: 'StepEar',
          description: 'Слуховой тренажёр: угадай ступень гаммы',
          theme_color: '#1a1a2e',
          background_color: '#1a1a2e',
          display: 'standalone',
          lang: 'ru',
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
