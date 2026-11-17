// Vercel Routing Middleware: serves the admin UI only at ADMIN_PATH, marks it
// noindex, and hides the raw /admin.html shell. API calls and static assets
// skip this middleware entirely (see matcher).
import { rewrite } from '@vercel/functions/middleware'
import { ADMIN_RESPONSE_HEADERS, ADMIN_SHELL, resolveAdminRoute } from './server/adminRoute.js'

export const config = {
  matcher: ['/((?!api/|assets/|favicon\\.svg|og-default\\.png|robots\\.txt|sitemap\\.xml).*)'],
}

export default function middleware(request) {
  const url = new URL(request.url)
  const decision = resolveAdminRoute(url.pathname, process.env.ADMIN_PATH)

  if (decision === 'block') {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    })
  }
  if (decision === 'admin') {
    return rewrite(new URL(ADMIN_SHELL, url), { headers: ADMIN_RESPONSE_HEADERS })
  }
  // 'pass': return nothing → the request continues to the static site
}
