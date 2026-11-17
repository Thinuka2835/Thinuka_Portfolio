// Vercel Function entry. vercel.json rewrites /api/* here; Hono routes by the
// original URL. Uses the Web-standard (Request → Response) handler signature.
import { app } from '../server/app.js'

const handler = (request) => app.fetch(request)

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
