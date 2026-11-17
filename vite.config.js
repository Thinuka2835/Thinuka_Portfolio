import { createHash } from 'node:crypto'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './vite/content-plugin.js'
import { serverPlugin } from './vite/server-plugin.js'

// Site data for the HTML (first-paint data). In dev it is loaded through
// Vite's SSR graph so it shares the API's database connection.
async function loadSiteData(server) {
  let timer
  try {
    const mod = server
      ? await server.ssrLoadModule('/server/services/siteData.js')
      : await import('./server/services/siteData.js')
    // Never let an unreachable database hang the build — fall back to defaults
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('database did not respond within 15s')), 15_000)
    })
    return await Promise.race([mod.getPublicSiteData(), timeout])
  } catch (err) {
    console.warn(`[site-data] using defaults (${err.message})`)
    const { getDefaultSiteData } = await import('./shared/siteDefaults.js')
    return getDefaultSiteData()
  } finally {
    clearTimeout(timer)
  }
}

// Deterministic CSS-module class names, so the server-rendered HTML
// (pre-rendering) and the client bundle always agree on class names.
function scopedName(name, filename) {
  const rel = path.relative(process.cwd(), filename).replace(/\\/g, '/')
  const base = path.basename(filename).split('.')[0]
  const hash = createHash('sha1').update(`${rel}:${name}`).digest('base64url').slice(0, 5)
  return `${base}_${name}_${hash}`
}

export default defineConfig(({ mode, isSsrBuild }) => {
  // Make .env values available to the server code that runs inside Vite
  // (API in dev/preview, site data at build). Only VITE_* reach the browser.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value

  return {
    base: '/',
    plugins: [react(), contentPlugin({ loadSiteData, ssr: isSsrBuild }), serverPlugin()],
    css: {
      modules: { generateScopedName: scopedName },
    },
    build: isSsrBuild
      ? // `vite build --ssr src/entry-server.jsx` — used only by scripts/prerender.mjs
        { outDir: 'dist/.ssr', emptyOutDir: true, copyPublicDir: false }
      : {
          rollupOptions: {
            // Separate admin entry: none of the admin code ships in the public bundle
            input: { main: 'index.html', admin: 'admin.html' },
          },
        },
  }
})
