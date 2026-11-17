// Decides how a page request relates to the admin UI. Shared by the Vercel
// middleware (production) and the Vite dev/preview server (local), and kept
// dependency-free so it runs in the Edge runtime.
//
// Obscurity only: a configurable, unlinked, noindex admin path makes the
// admin less discoverable, but it is NOT the security boundary — every admin
// API call is authenticated and authorised on the server.

const PATTERN = /^\/[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/
const RESERVED = new Set(['/api', '/assets', '/projects', '/articles'])

export const ADMIN_SHELL = '/admin.html'

export const ADMIN_RESPONSE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'same-origin',
}

export function normalizeAdminPath(raw) {
  const value = (raw || '').trim().replace(/\/+$/, '')
  return PATTERN.test(value) && !RESERVED.has(value.toLowerCase()) ? value : null
}

/** @returns {'admin' | 'block' | 'pass'} */
export function resolveAdminRoute(pathname, rawAdminPath) {
  // The built admin shell is never served at its own URL
  if (pathname === ADMIN_SHELL || pathname === '/admin.html/') return 'block'
  const base = normalizeAdminPath(rawAdminPath)
  if (!base) return 'pass'
  if (pathname === base || pathname.startsWith(`${base}/`)) return 'admin'
  return 'pass'
}
