import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN, client, ORIGIN, setupTestEnv } from './helpers.js'

let env
before(async () => {
  env = await setupTestEnv()
})
after(async () => env.cleanup())

// Every protected endpoint, with a plausible body
const PROTECTED = [
  ['GET', '/api/admin/auth/session'],
  ['POST', '/api/admin/auth/logout-all'],
  ['POST', '/api/admin/auth/password', { currentPassword: 'x', newPassword: 'y' }],
  ['GET', '/api/admin/status'],
  ['POST', '/api/admin/deploy'],
  ['GET', '/api/admin/settings/profile'],
  ['PUT', '/api/admin/settings/profile', {}],
  ['GET', '/api/admin/collections/social-links'],
  ['POST', '/api/admin/collections/social-links', { platform: 'github', url: 'https://github.com/x' }],
  ['PUT', '/api/admin/collections/stats/00000000-0000-0000-0000-000000000000', {}],
  ['DELETE', '/api/admin/collections/tools/00000000-0000-0000-0000-000000000000'],
  ['POST', '/api/admin/collections/ticker/reorder', { ids: [] }],
  ['GET', '/api/admin/collections/certifications'],
  ['GET', '/api/admin/media'],
  ['POST', '/api/admin/media/sign', {}],
  ['POST', '/api/admin/media', { upload: {} }],
  ['PATCH', '/api/admin/media/00000000-0000-0000-0000-000000000000', { alt: 'x' }],
  ['DELETE', '/api/admin/media/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/admin/content'],
  ['GET', '/api/admin/content/projects/x'],
  ['PUT', '/api/admin/content/projects/x', { frontmatter: {}, body: '', expectedSha: null }],
  ['DELETE', '/api/admin/content/projects/x?sha=' + 'a'.repeat(40)],
  // Things that must not exist at all — still answered 401, never revealing anything
  ['POST', '/api/admin/auth/register', { email: 'evil@example.com', password: 'x' }],
  ['POST', '/api/admin/users', { email: 'evil@example.com' }],
]

describe('authorization', () => {
  it('rejects every admin endpoint without a session (401, no-store)', async () => {
    const anon = client(env.app)
    for (const [method, url, body] of PROTECTED) {
      const res = await anon.raw(method, url, body)
      assert.equal(res.status, 401, `${method} ${url} → ${res.status}`)
      assert.equal(res.json.error.code, 'unauthenticated')
      assert.equal(res.headers.get('cache-control'), 'no-store', `${method} ${url} cache header`)
    }
  })

  it('rejects a forged session cookie', async () => {
    const c = client(env.app)
    c.cookie = 'admin_session=' + 'A'.repeat(43)
    assert.equal((await c.get('/api/admin/status')).status, 401)
  })

  it('has no registration endpoint even for signed-in admins', async () => {
    const c = client(env.app)
    await c.login()
    assert.equal((await c.post('/api/admin/auth/register', { email: 'x@example.com', password: 'y' })).status, 404)
    const [{ count }] = await env.query('select count(*)::int as count from admin_users')
    assert.equal(count, 1)
  })

  it('public site data never includes admin-only data', async () => {
    const res = await client(env.app).get('/api/public/site')
    assert.equal(res.status, 200)
    const text = JSON.stringify(res.json)
    for (const secret of ['password', 'admin_users', 'session', ADMIN.email]) assert.ok(!text.includes(secret), secret)
    assert.match(res.headers.get('x-robots-tag'), /noindex/)
  })
})

describe('login', () => {
  it('uses one generic message for unknown email and wrong password', async () => {
    const c = client(env.app)
    const a = await c.login({ email: 'nobody@example.com', password: 'whatever-123456' })
    const b = await c.login({ email: ADMIN.email, password: 'wrong-password-123' })
    assert.equal(a.status, 401)
    assert.equal(b.status, 401)
    assert.equal(a.json.error.message, b.json.error.message)
  })

  it('validates input', async () => {
    const res = await client(env.app).login({ email: 'not-an-email', password: '' })
    assert.equal(res.status, 400)
    assert.ok(res.json.error.fields.email)
  })

  it('sets an HttpOnly, SameSite=Strict session cookie and signs out', async () => {
    const c = client(env.app)
    const res = await c.login()
    assert.equal(res.status, 200)
    const cookie = res.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /SameSite=Strict/i)
    assert.match(cookie, /Path=\//)
    assert.equal((await c.get('/api/admin/auth/session')).status, 200)

    const token = c.cookie
    await c.post('/api/admin/auth/logout')
    c.cookie = token // replaying the old cookie must not work
    assert.equal((await c.get('/api/admin/auth/session')).status, 401)
  })

  it('uses a Secure __Host- cookie over HTTPS', async () => {
    const res = await env.app.request('https://example.com/api/admin/auth/login', {
      method: 'POST',
      headers: { origin: 'https://example.com', 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('set-cookie'), /^__Host-admin_session=.*Secure/i)
  })

  it('stores only a hash of the session token', async () => {
    const c = client(env.app)
    await c.login()
    const token = c.cookie.split('=')[1]
    const rows = await env.query('select id from admin_sessions where id = $1', [token])
    assert.equal(rows.length, 0)
  })

  it('rate-limits repeated failures for an account', async () => {
    const c = client(env.app)
    const email = 'ratelimit@example.com'
    for (let i = 0; i < 5; i++) assert.equal((await c.login({ email, password: 'wrong-password-123' })).status, 401)
    const blocked = await c.login({ email, password: 'wrong-password-123' })
    assert.equal(blocked.status, 429)
    assert.ok(blocked.headers.get('retry-after'))
  })
})

describe('CSRF / origin checks', () => {
  it('blocks cross-site and origin-less mutations', async () => {
    const c = client(env.app)
    assert.equal((await c.post('/api/admin/auth/login', ADMIN, { origin: 'https://evil.example' })).status, 403)
    const res = await env.app.request(`${ORIGIN}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ADMIN),
    })
    assert.equal(res.status, 403)
  })

  it('blocks form-encoded bodies (only JSON is accepted)', async () => {
    const res = await env.app.request(`${ORIGIN}/api/admin/auth/login`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
      body: `email=${ADMIN.email}&password=${ADMIN.password}`,
    })
    assert.equal(res.status, 415)
  })

  it('blocks cross-site mutations even with a valid session', async () => {
    const c = client(env.app)
    await c.login()
    const res = await c.put('/api/admin/settings/profile', {}, { origin: 'https://evil.example' })
    assert.equal(res.status, 403)
  })
})

describe('session lifetime', () => {
  it('expires after the absolute lifetime', async () => {
    const c = client(env.app)
    await c.login()
    await env.query(`update admin_sessions set expires_at = now() - interval '1 second'`)
    assert.equal((await c.get('/api/admin/auth/session')).status, 401)
  })

  it('expires after inactivity', async () => {
    const c = client(env.app)
    await c.login()
    await env.query(`update admin_sessions set last_seen_at = now() - interval '3 hours'`)
    assert.equal((await c.get('/api/admin/auth/session')).status, 401)
  })

  it('disabled admins lose access immediately', async () => {
    const c = client(env.app)
    await c.login()
    await env.query(`update admin_users set disabled = true`)
    try {
      assert.equal((await c.get('/api/admin/auth/session')).status, 401)
      assert.equal((await client(env.app).login()).status, 401)
    } finally {
      await env.query(`update admin_users set disabled = false`)
    }
  })

  it('changing the password signs out other sessions', async () => {
    const a = client(env.app)
    const b = client(env.app)
    await a.login()
    await b.login()
    const weak = await a.post('/api/admin/auth/password', { currentPassword: ADMIN.password, newPassword: 'short' })
    assert.equal(weak.status, 400)
    const ok = await a.post('/api/admin/auth/password', { currentPassword: ADMIN.password, newPassword: 'an0ther-strong-passphrase' })
    assert.equal(ok.status, 200)
    assert.equal((await a.get('/api/admin/auth/session')).status, 200)
    assert.equal((await b.get('/api/admin/auth/session')).status, 401)
    // restore
    await a.post('/api/admin/auth/password', { currentPassword: 'an0ther-strong-passphrase', newPassword: ADMIN.password })
  })
})
