import { after, before, beforeEach, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { client, setupTestEnv } from './helpers.js'
import { signParams } from '../server/services/cloudinary.js'

let env, c
before(async () => {
  env = await setupTestEnv()
  c = client(env.app)
  await c.login()
})
after(async () => env.cleanup())

const fm = (over = {}) => ({
  title: 'Launch Plan',
  slug: 'launch-plan',
  description: 'How we launched.',
  date: '2026-01-15',
  tags: ['Agile'],
  status: 'published',
  ...over,
})

describe('markdown content (fs store)', () => {
  let sha
  it('publishes a new entry as a Markdown file with frontmatter', async () => {
    const res = await c.put('/api/admin/content/projects/launch-plan', { frontmatter: fm(), body: '# Hello\n\nBody', expectedSha: null })
    assert.equal(res.status, 200, JSON.stringify(res.json))
    sha = res.json.sha
    const file = path.join(env.contentDir, 'projects', 'launch-plan.md')
    const text = readFileSync(file, 'utf8')
    assert.match(text, /^---\ntitle: Launch Plan\nslug: launch-plan\n/)
    assert.match(text, /status: published/)
    assert.match(text, /# Hello/)
    const list = await c.get('/api/admin/content')
    assert.equal(list.json.items.length, 1)
    assert.equal(list.json.events[0].action, 'publish')
  })

  it('refuses drafts when drafts are disabled (public repo)', async () => {
    const res = await c.put('/api/admin/content/articles/secret', { frontmatter: fm({ slug: 'secret', status: 'draft' }), body: 'x', expectedSha: null })
    assert.equal(res.status, 400)
    assert.equal(res.json.error.code, 'drafts_disabled')
    assert.ok(!existsSync(path.join(env.contentDir, 'articles', 'secret.md')))
  })

  it('allows drafts only when explicitly enabled', async () => {
    process.env.CONTENT_ALLOW_DRAFTS = 'true'
    try {
      const res = await c.put('/api/admin/content/articles/wip', { frontmatter: fm({ slug: 'wip', status: 'draft' }), body: 'x', expectedSha: null })
      assert.equal(res.status, 200)
      await c.del(`/api/admin/content/articles/wip?sha=${res.json.sha}`)
    } finally {
      delete process.env.CONTENT_ALLOW_DRAFTS
    }
  })

  it('detects concurrent edits (stale sha → 409) and duplicate creates', async () => {
    const stale = await c.put('/api/admin/content/projects/launch-plan', { frontmatter: fm({ title: 'Edited' }), body: 'x', expectedSha: 'f'.repeat(40) })
    assert.equal(stale.status, 409)
    const dup = await c.put('/api/admin/content/projects/launch-plan', { frontmatter: fm(), body: 'x', expectedSha: null })
    assert.equal(dup.status, 409)
  })

  it('validates frontmatter and slugs', async () => {
    const bad = await c.put('/api/admin/content/projects/ok-slug', { frontmatter: fm({ slug: 'ok-slug', title: '', date: '15/01/2026' }), body: '', expectedSha: null })
    assert.equal(bad.status, 400)
    assert.ok(bad.json.error.fields['frontmatter.title'])
    assert.ok(bad.json.error.fields['frontmatter.date'])
    const mismatch = await c.put('/api/admin/content/projects/a', { frontmatter: fm({ slug: 'b' }), body: '', expectedSha: null })
    assert.equal(mismatch.status, 400)
    const reserved = await c.put('/api/admin/content/pages/projects', { frontmatter: fm({ slug: 'projects' }), body: '', expectedSha: null })
    assert.equal(reserved.status, 400)
    const adminSlug = await c.put('/api/admin/content/pages/studio-test', { frontmatter: fm({ slug: 'studio-test' }), body: '', expectedSha: null })
    assert.equal(adminSlug.status, 400)
    assert.equal((await c.get('/api/admin/content/nope/x')).status, 404)
    assert.equal((await c.get('/api/admin/content/projects/..%2F..%2Fetc')).status, 404)
  })

  it('updates, renames atomically and deletes', async () => {
    const upd = await c.put('/api/admin/content/projects/launch-plan', { frontmatter: fm({ title: 'Launch Plan v2' }), body: 'Updated', expectedSha: sha })
    assert.equal(upd.status, 200)
    const ren = await c.put('/api/admin/content/projects/launch-plan-2026', {
      frontmatter: fm({ slug: 'launch-plan-2026', title: 'Launch Plan v2' }),
      body: 'Updated',
      expectedSha: upd.json.sha,
      previousSlug: 'launch-plan',
    })
    assert.equal(ren.status, 200)
    assert.ok(!existsSync(path.join(env.contentDir, 'projects', 'launch-plan.md')))
    assert.ok(existsSync(path.join(env.contentDir, 'projects', 'launch-plan-2026.md')))
    const got = await c.get('/api/admin/content/projects/launch-plan-2026')
    assert.equal(got.json.frontmatter.title, 'Launch Plan v2')
    const del = await c.del(`/api/admin/content/projects/launch-plan-2026?sha=${got.json.sha}&action=unpublish`)
    assert.equal(del.status, 200)
    assert.ok(!existsSync(path.join(env.contentDir, 'projects', 'launch-plan-2026.md')))
  })

  it('refuses filesystem writes on Vercel (ephemeral, read-only)', async () => {
    process.env.VERCEL = '1'
    try {
      const res = await c.put('/api/admin/content/projects/x', { frontmatter: fm({ slug: 'x' }), body: '', expectedSha: null })
      assert.equal(res.status, 503)
      assert.match(res.json.error.message, /GITHUB_CONTENT_TOKEN/)
    } finally {
      delete process.env.VERCEL
    }
  })
})

describe('collections & settings', () => {
  it('validates social links and hides invalid/hidden ones publicly', async () => {
    const bad = await c.post('/api/admin/collections/social-links', { platform: 'linkedin', url: 'http://linkedin.com/in/x', label: '' })
    assert.equal(bad.status, 400)
    const wrongHost = await c.post('/api/admin/collections/social-links', { platform: 'linkedin', url: 'https://evil.example/in/x', label: '' })
    assert.equal(wrongHost.status, 400)
    const ok = await c.post('/api/admin/collections/social-links', { platform: 'linkedin', url: 'https://www.linkedin.com/in/someone', label: '', visible: false })
    assert.equal(ok.status, 201)
    let site = await c.get('/api/public/site')
    assert.ok(!site.json.socialLinks.some((s) => s.platform === 'linkedin'))
    await c.put(`/api/admin/collections/social-links/${ok.json.item.id}`, { platform: 'linkedin', url: 'https://www.linkedin.com/in/someone', label: '', visible: true })
    site = await c.get('/api/public/site')
    assert.ok(site.json.socialLinks.some((s) => s.platform === 'linkedin'))
  })

  it('creates, reorders and deletes items', async () => {
    const a = await c.post('/api/admin/collections/ticker', { label: 'First' })
    const b = await c.post('/api/admin/collections/ticker', { label: 'Second' })
    await c.post('/api/admin/collections/ticker/reorder', { ids: [b.json.item.id, a.json.item.id] })
    const list = await c.get('/api/admin/collections/ticker')
    assert.deepEqual(list.json.items.map((i) => i.label), ['Second', 'First'])
    assert.equal((await c.del(`/api/admin/collections/ticker/${a.json.item.id}`)).status, 200)
    assert.equal((await c.del(`/api/admin/collections/ticker/${a.json.item.id}`)).status, 404)
    const badIcon = await c.post('/api/admin/collections/tools', { name: 'X', iconKey: 'SiNotARealIcon' })
    assert.equal(badIcon.status, 400)
  })

  it('validates and saves the profile', async () => {
    const bad = await c.put('/api/admin/settings/profile', { name: '' })
    assert.equal(bad.status, 400)
    const profile = (await c.get('/api/admin/settings/profile')).json.profile
    const res = await c.put('/api/admin/settings/profile', { ...profile, availability: 'Booked until March' })
    assert.equal(res.status, 200)
    assert.equal((await c.get('/api/public/site')).json.profile.availability, 'Booked until March')
  })
})

describe('media (Cloudinary)', () => {
  const fakeUpload = (over = {}) => {
    const u = {
      public_id: 'portfolio/abc123',
      version: 1700000000,
      resource_type: 'image',
      format: 'jpg',
      bytes: 50_000,
      width: 1200,
      height: 800,
      secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1700000000/portfolio/abc123.jpg',
      original_filename: 'cert',
      ...over,
    }
    u.signature = signParams({ public_id: u.public_id, version: u.version }, 'test-secret')
    return u
  }
  beforeEach(() => mock.restoreAll())

  it('matches Cloudinary’s documented signature example', () => {
    const params = { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 }
    assert.equal(signParams(params, 'abcd'), 'bfd09f95f331f558cbd1320e67aa8d488770583e')
  })

  it('signs uploads into the configured folder without exposing the secret', async () => {
    const res = await c.post('/api/admin/media/sign', {})
    assert.equal(res.status, 200)
    assert.equal(res.json.params.folder, 'portfolio')
    assert.ok(!JSON.stringify(res.json).includes('test-secret'))
    assert.equal(res.json.signature, signParams(res.json.params, 'test-secret'))
  })

  it('rejects forged or out-of-folder uploads', async () => {
    const forged = { ...fakeUpload(), signature: 'f'.repeat(40) }
    assert.equal((await c.post('/api/admin/media', { upload: forged })).status, 400)
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ result: 'ok' })))
    const elsewhere = fakeUpload({ public_id: 'someone-else/x', secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/someone-else/x.jpg' })
    assert.equal((await c.post('/api/admin/media', { upload: elsewhere })).status, 400)
    const huge = fakeUpload({ public_id: 'portfolio/huge', bytes: 50 * 1024 * 1024 })
    const res = await c.post('/api/admin/media', { upload: huge })
    assert.equal(res.status, 400)
    assert.match(res.json.error.message, /under 10 MB/)
    assert.equal(fetchMock.mock.callCount(), 1, 'oversized upload is deleted from Cloudinary')
  })

  it('registers, protects in-use images from deletion, then deletes', async () => {
    const reg = await c.post('/api/admin/media', { upload: fakeUpload(), alt: 'Certificate' })
    assert.equal(reg.status, 201, JSON.stringify(reg.json))
    const media = reg.json.item
    assert.equal(media.width, 1200)

    const cert = await c.post('/api/admin/collections/certifications', { title: 'PMP', issuer: 'PMI', year: '2024', url: '', imageId: media.id })
    assert.equal(cert.status, 201)
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ result: 'ok' })))
    const blocked = await c.del(`/api/admin/media/${media.id}`)
    assert.equal(blocked.status, 409)
    assert.match(blocked.json.error.usages[0].label, /PMP/)
    assert.equal(fetchMock.mock.callCount(), 0, 'nothing deleted at Cloudinary')

    // Also protected when referenced from Markdown
    await c.put(`/api/admin/collections/certifications/${cert.json.item.id}`, { title: 'PMP', issuer: 'PMI', year: '2024', url: '', imageId: null })
    const page = await c.put('/api/admin/content/pages/about-me', {
      frontmatter: { title: 'About', slug: 'about-me', description: 'x', status: 'published' },
      body: `![x](${media.secureUrl})`,
      expectedSha: null,
    })
    assert.equal(page.status, 200)
    assert.equal((await c.del(`/api/admin/media/${media.id}`)).status, 409)
    await c.del(`/api/admin/content/pages/about-me?sha=${page.json.sha}`)

    const ok = await c.del(`/api/admin/media/${media.id}`)
    assert.equal(ok.status, 200)
    assert.equal(fetchMock.mock.callCount(), 1)
    assert.match(String(fetchMock.mock.calls[0].arguments[0]), /\/image\/destroy$/)
  })

  it('keeps the record when Cloudinary deletion fails', async () => {
    const reg = await c.post('/api/admin/media', { upload: fakeUpload({ public_id: 'portfolio/keep', secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/keep.jpg' }) })
    mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 500 }))
    const res = await c.del(`/api/admin/media/${reg.json.item.id}`)
    assert.equal(res.status, 502)
    const [{ count }] = await env.query('select count(*)::int as count from media where id = $1', [reg.json.item.id])
    assert.equal(count, 1)
  })

  it('never deletes or replaces images from another environment’s folder', async () => {
    const reg = await c.post('/api/admin/media', { upload: fakeUpload({ public_id: 'portfolio/prod-img', secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/prod-img.jpg' }) })
    assert.equal(reg.status, 201)
    process.env.CLOUDINARY_FOLDER = 'portfolio-preview' // e.g. a preview deployment
    const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ result: 'ok' })))
    try {
      assert.equal((await c.del(`/api/admin/media/${reg.json.item.id}`)).status, 409)
      assert.equal((await c.post('/api/admin/media/sign', { replaceId: reg.json.item.id })).status, 409)
      assert.equal(fetchMock.mock.callCount(), 0, 'Cloudinary never called')
    } finally {
      process.env.CLOUDINARY_FOLDER = 'portfolio'
    }
  })

  it('reports missing Cloudinary configuration instead of pretending', async () => {
    const saved = process.env.CLOUDINARY_API_SECRET
    delete process.env.CLOUDINARY_API_SECRET
    try {
      const res = await c.post('/api/admin/media/sign', {})
      assert.equal(res.status, 503)
      assert.equal(res.json.error.code, 'not_configured')
    } finally {
      process.env.CLOUDINARY_API_SECRET = saved
    }
  })
})
