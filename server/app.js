// The whole API as one Hono app. Deployed as a single Vercel Function
// (api/index.js) and mounted into the Vite dev/preview server locally.
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { HttpError } from './errors.js'
import { requireAdmin, requireSameOrigin } from './auth/guards.js'
import { authRoutes } from './routes/auth.js'
import { settingsRoutes } from './routes/settings.js'
import { collectionRoutes } from './routes/collections.js'
import { mediaRoutes } from './routes/media.js'
import { contentRoutes } from './routes/content.js'
import { statusRoutes } from './routes/status.js'
import { getPublicSiteData } from './services/siteData.js'

export const app = new Hono().basePath('/api')

app.use('*', async (c, next) => {
  await next()
  c.header('X-Robots-Tag', 'noindex, nofollow')
  c.header('X-Content-Type-Options', 'nosniff')
})

// ── Public ───────────────────────────────────────────────────────────────
app.get('/public/site', async (c) => {
  const data = await getPublicSiteData()
  // Browsers always revalidate (so admin edits show on the next page load);
  // only Vercel's CDN caches, briefly, serving stale while it refreshes.
  c.header('Cache-Control', 'public, no-cache')
  c.header('CDN-Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
  return c.json(data)
})

// ── Admin (everything below is server-side protected) ────────────────────
const admin = new Hono()
admin.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  return next()
})
admin.use('*', bodyLimit({ maxSize: 512 * 1024, onError: (c) => c.json({ error: { code: 'too_large', message: 'Request is too large.' } }, 413) }))
admin.use('*', requireSameOrigin)

// Login/logout must work without a session; every other route requires one.
admin.route('/auth', authRoutes)
admin.use('*', requireAdmin)
admin.route('/settings', settingsRoutes)
admin.route('/collections', collectionRoutes)
admin.route('/media', mediaRoutes)
admin.route('/content', contentRoutes)
admin.route('/', statusRoutes)

app.route('/admin', admin)

// ── Errors ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Not found.' } }, 404))

app.onError((err, c) => {
  if (err instanceof HttpError) {
    if (err.details?.retryAfter) c.header('Retry-After', String(err.details.retryAfter))
    return c.json({ error: { code: err.code, message: err.message, ...err.details } }, err.status)
  }
  console.error('[api] unexpected error:', err)
  return c.json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } }, 500)
})
