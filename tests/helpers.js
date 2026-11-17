// Test harness: in-memory Postgres (PGlite), a temp content directory and
// helpers that call the Hono app directly (no network).
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const ORIGIN = 'http://localhost'
export const ADMIN = { email: 'admin@example.com', password: 'correct-horse-battery-9' }

export async function setupTestEnv() {
  const contentDir = await mkdtemp(path.join(tmpdir(), 'pf-content-'))
  Object.assign(process.env, {
    DATABASE_URL: 'pglite:memory',
    CONTENT_STORE: 'fs',
    CONTENT_DIR: contentDir,
    ADMIN_PATH: '/studio-test',
    CLOUDINARY_CLOUD_NAME: 'demo-cloud',
    CLOUDINARY_API_KEY: '123456',
    CLOUDINARY_API_SECRET: 'test-secret',
    CLOUDINARY_FOLDER: 'portfolio',
  })
  delete process.env.VERCEL
  delete process.env.VERCEL_ENV
  delete process.env.CONTENT_ALLOW_DRAFTS

  const { resetDb, query } = await import('../server/db/client.js')
  await resetDb()
  const { migrate } = await import('../server/db/migrate.js')
  await migrate()
  const { hashPassword } = await import('../server/auth/password.js')
  await query(`insert into admin_users (email, name, password_hash) values ($1, 'Tester', $2)`, [
    ADMIN.email,
    await hashPassword(ADMIN.password),
  ])
  const { app } = await import('../server/app.js')

  return {
    app,
    query,
    contentDir,
    async cleanup() {
      await resetDb()
      await rm(contentDir, { recursive: true, force: true })
    },
  }
}

/** Call the API like a same-origin browser would. */
export function client(app) {
  let cookie = ''
  const call = async (method, url, body, extraHeaders = {}) => {
    const headers = { origin: ORIGIN, ...extraHeaders }
    if (cookie) headers.cookie = cookie
    if (body !== undefined) headers['content-type'] = 'application/json'
    else if (method !== 'GET' && method !== 'DELETE') {
      headers['content-type'] = 'application/json'
      body = {}
    }
    const res = await app.request(`${ORIGIN}${url}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) {
      const [pair] = setCookie.split(';')
      cookie = pair.endsWith('=') ? '' : pair
    }
    const json = await res.json().catch(() => null)
    return { status: res.status, json, headers: res.headers }
  }
  return {
    get: (url, h) => call('GET', url, undefined, h),
    post: (url, body, h) => call('POST', url, body, h),
    put: (url, body, h) => call('PUT', url, body, h),
    patch: (url, body, h) => call('PATCH', url, body, h),
    del: (url, h) => call('DELETE', url, undefined, h),
    raw: call,
    get cookie() {
      return cookie
    },
    set cookie(v) {
      cookie = v
    },
    async login(creds = ADMIN) {
      return call('POST', '/api/admin/auth/login', creds)
    },
  }
}
