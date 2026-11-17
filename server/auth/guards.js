// Middleware applied on the server to every protected route. The admin UI's
// own route checks are only for UX — these are what actually enforce access.
import { allowedOrigins } from '../config.js'
import { forbidden, unauthorized, HttpError } from '../errors.js'
import { readSession } from './sessions.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Rejects state-changing requests that don't come from this site (CSRF defence). */
export async function requireSameOrigin(c, next) {
  if (SAFE_METHODS.has(c.req.method)) return next()

  const url = new URL(c.req.url)
  const proto = c.req.header('x-forwarded-proto') || url.protocol.replace(':', '')
  const host = c.req.header('x-forwarded-host') || c.req.header('host') || url.host
  const selfOrigin = `${proto}://${host}`

  let origin = c.req.header('origin')
  if (!origin) {
    try {
      origin = new URL(c.req.header('referer') || '').origin
    } catch {
      origin = null
    }
  }
  if (!origin || (origin !== selfOrigin && !allowedOrigins().includes(origin))) {
    throw forbidden('Cross-site request blocked.')
  }

  // JSON-only API: forms posted from other sites can't send this content type
  if (c.req.method !== 'DELETE' && !(c.req.header('content-type') || '').startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Requests must be JSON.')
  }
  return next()
}

/** Requires a valid admin session; exposes it as c.get('admin') / c.get('session'). */
export async function requireAdmin(c, next) {
  const result = await readSession(c)
  if (!result) throw unauthorized('Your session has expired or you are not signed in.')
  c.set('admin', result.user)
  c.set('session', result.session)
  c.header('Cache-Control', 'no-store')
  return next()
}
