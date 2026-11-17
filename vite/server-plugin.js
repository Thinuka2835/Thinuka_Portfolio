// Local stand-in for Vercel: mounts the API (/api/*), applies the admin-route
// rules from server/adminRoute.js and, in `vite preview`, the headers from
// vercel.json plus Vercel's static routing (prerendered pages, 404.html).
// Production does NOT use this file — see api/index.js, middleware.js, vercel.json.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getRequestListener } from '@hono/node-server'
import { ADMIN_RESPONSE_HEADERS, ADMIN_SHELL, resolveAdminRoute } from '../server/adminRoute.js'

function vercelHeaders() {
  try {
    const cfg = JSON.parse(readFileSync(path.resolve('vercel.json'), 'utf8'))
    return cfg.headers || []
  } catch {
    return []
  }
}

/** Minimal version of Vercel's `headers` matching for "/(.*)" and "/prefix/(.*)" sources. */
function headersFor(pathname, rules) {
  const out = {}
  for (const rule of rules) {
    const re = new RegExp(`^${rule.source.replace(/\(\.\*\)/g, '.*')}$`)
    if (re.test(pathname)) for (const h of rule.headers) out[h.key] = h.value
  }
  return out
}

function adminMiddleware(req, res, next) {
  const { pathname } = new URL(req.url, 'http://localhost')
  const decision = resolveAdminRoute(pathname, process.env.ADMIN_PATH)
  if (decision === 'block') {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.end('Not found')
  }
  if (decision === 'admin') {
    for (const [k, v] of Object.entries(ADMIN_RESPONSE_HEADERS)) res.setHeader(k, v)
    req.url = ADMIN_SHELL
  }
  next()
}

export function serverPlugin() {
  return {
    name: 'portfolio-local-server',

    configureServer(server) {
      // API — loaded through Vite so server code edits apply without restarts
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        try {
          const { app } = await server.ssrLoadModule('/server/app.js')
          getRequestListener(app.fetch)(req, res)
        } catch (err) {
          next(err)
        }
      })
      server.middlewares.use(adminMiddleware)
    },

    configurePreviewServer(server) {
      const rules = vercelHeaders()
      const dist = path.resolve(server.config.root, server.config.build.outDir)
      let listener
      server.middlewares.use(async (req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost')
        for (const [k, v] of Object.entries(headersFor(pathname, rules))) res.setHeader(k, v)
        if (pathname.startsWith('/api/')) {
          listener ??= getRequestListener((await import('../server/app.js')).app.fetch)
          return listener(req, res)
        }
        next()
      })
      server.middlewares.use(adminMiddleware)
      // Vercel static routing: /x → x/index.html, unknown → 404.html (status 404)
      server.middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url, 'http://localhost')
        if (req.method !== 'GET' || pathname === '/' || path.extname(pathname) || pathname === ADMIN_SHELL) return next()
        const candidate = path.join(dist, pathname, 'index.html')
        if (existsSync(candidate)) {
          req.url = `${pathname.replace(/\/$/, '')}/index.html`
          return next()
        }
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(path.join(dist, '404.html')))
      })
    },
  }
}
