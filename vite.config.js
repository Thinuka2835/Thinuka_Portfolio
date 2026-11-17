import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './vite/content-plugin.js'
import { serverPlugin } from './vite/server-plugin.js'

// Site data for the HTML (home meta tags + first-paint data). In dev it is
// loaded through Vite's SSR graph so it shares the API's database connection.
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

export default defineConfig(({ mode }) => {
  // Make .env values available to the server code that runs inside Vite
  // (API in dev/preview, site data at build). Only VITE_* reach the browser.
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) process.env[key] ??= value

  return {
    base: '/',
    plugins: [react(), contentPlugin({ loadSiteData }), serverPlugin()],
    build: {
      rollupOptions: {
        // Separate admin entry: none of the admin code ships in the public bundle
        input: { main: 'index.html', admin: 'admin.html' },
      },
    },
  }
})
