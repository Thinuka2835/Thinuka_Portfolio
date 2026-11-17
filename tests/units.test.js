import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderMarkdown } from '../shared/markdown.js'
import { parseMarkdownFile, serializeMarkdownFile, validateFrontmatter } from '../shared/content.js'
import { resolveAdminRoute } from '../server/adminRoute.js'
import { createGitHubStore, gitBlobSha } from '../server/services/contentStore.js'
import { TOOL_ICON_KEYS } from '../shared/toolIcons.js'
import { validateSocialUrl } from '../shared/socialPlatforms.js'
import { cldUrl } from '../shared/cloudinary.js'

describe('markdown rendering is safe', () => {
  it('strips scripts, handlers, javascript: links and iframes', async () => {
    const html = await renderMarkdown(
      '<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src="https://a.b/c.png" onerror="alert(1)">\n\n<iframe src="https://evil"></iframe>\n\n<a href="https://ok.example" onclick="x()">ok</a>'
    )
    assert.ok(!/<script/i.test(html))
    assert.ok(!/javascript:/i.test(html))
    assert.ok(!/onerror|onclick/i.test(html))
    assert.ok(!/<iframe/i.test(html))
    assert.match(html, /rel="noopener noreferrer nofollow"/)
  })

  it('highlights code and keeps tables', async () => {
    const html = await renderMarkdown('```js\nconst a = 1\n```\n\n| a |\n|---|\n| 1 |')
    assert.match(html, /hljs-keyword/)
    assert.match(html, /<table>/)
  })
})

describe('frontmatter', () => {
  it('round-trips', () => {
    const md = serializeMarkdownFile({ title: 'T: with colon', slug: 't', description: 'd', status: 'published', tags: ['a'] }, 'Body')
    const { data, body } = parseMarkdownFile(md)
    assert.equal(data.title, 'T: with colon')
    assert.deepEqual(data.tags, ['a'])
    assert.equal(body.trim(), 'Body')
  })

  it('requires dates for articles only', () => {
    const base = { title: 'x', slug: 'x', description: 'x', status: 'published' }
    assert.equal(validateFrontmatter('articles', base).success, false)
    assert.equal(validateFrontmatter('projects', base).success, true)
    assert.equal(validateFrontmatter('pages', base).success, true)
  })
})

describe('admin route resolution', () => {
  it('serves the admin shell only at ADMIN_PATH', () => {
    assert.equal(resolveAdminRoute('/studio-x', '/studio-x'), 'admin')
    assert.equal(resolveAdminRoute('/studio-x/content/new', '/studio-x'), 'admin')
    assert.equal(resolveAdminRoute('/studio-xyz', '/studio-x'), 'pass')
    assert.equal(resolveAdminRoute('/admin.html', '/studio-x'), 'block')
    assert.equal(resolveAdminRoute('/admin', '/studio-x'), 'pass')
    assert.equal(resolveAdminRoute('/anything', undefined), 'pass', 'admin disabled when unset')
    assert.equal(resolveAdminRoute('/api', '/api'), 'pass', 'reserved paths rejected')
  })
})

describe('GitHub content store', () => {
  it('commits atomically via the Git Data API and detects conflicts', async () => {
    const calls = []
    const existing = '---\ntitle: Old\n---\n'
    const fakeFetch = async (url, init = {}) => {
      calls.push(`${init.method} ${url.replace('https://api.github.com', '')}`)
      const json = (body, status = 200) => new Response(JSON.stringify(body), { status })
      if (url.includes('/git/ref/heads/main')) return json({ object: { sha: 'head1' } })
      if (url.includes('/contents/content/projects/old.md')) return json({ type: 'file', sha: gitBlobSha(existing), content: Buffer.from(existing).toString('base64') })
      if (url.includes('/contents/')) return json({ message: 'Not Found' }, 404)
      if (url.endsWith('/git/commits/head1')) return json({ tree: { sha: 'tree1' } })
      if (url.endsWith('/git/trees')) return json({ sha: 'tree2' })
      if (url.endsWith('/git/commits')) return json({ sha: 'commit2', html_url: 'https://github.com/o/r/commit/commit2' })
      if (url.includes('/git/refs/heads/main')) return json({})
      throw new Error(`unexpected ${url}`)
    }
    const store = createGitHubStore({ repo: 'o/r', token: 't', branch: 'main', dir: 'content', fetchImpl: fakeFetch })
    const res = await store.commit({
      message: 'rename',
      changes: [
        { type: 'projects', slug: 'new', markdown: 'new', expectedSha: null },
        { type: 'projects', slug: 'old', markdown: null, expectedSha: gitBlobSha(existing) },
      ],
    })
    assert.equal(res.commitSha, 'commit2')
    assert.ok(calls.includes('PATCH /repos/o/r/git/refs/heads/main'))
    assert.equal(calls.filter((c) => c.startsWith('POST /repos/o/r/git/trees')).length, 1, 'one tree → one atomic commit')

    await assert.rejects(
      store.commit({ message: 'x', changes: [{ type: 'projects', slug: 'old', markdown: 'y', expectedSha: 'f'.repeat(40) }] }),
      (err) => err.status === 409
    )
  })
})

describe('misc', () => {
  it('every allowed tool icon is imported by name in Tools.jsx', () => {
    const src = readFileSync(new URL('../src/components/Tools/Tools.jsx', import.meta.url), 'utf8')
    assert.ok(!/^\s*import \* as/m.test(src), 'no wildcard react-icons import')
    for (const key of TOOL_ICON_KEYS) assert.match(src, new RegExp(`\\b${key}\\b`), key)
  })

  it('validates social URLs strictly', () => {
    assert.equal(validateSocialUrl('github', 'https://github.com/someone'), null)
    assert.ok(validateSocialUrl('github', 'javascript:alert(1)'))
    assert.ok(validateSocialUrl('github', 'https://github.com.evil.example/x'))
    assert.equal(validateSocialUrl('website', 'https://example.com'), null)
  })

  it('builds optimized Cloudinary URLs', () => {
    assert.equal(
      cldUrl('https://res.cloudinary.com/c/image/upload/v1/p/x.jpg', { width: 400 }),
      'https://res.cloudinary.com/c/image/upload/f_auto,q_auto,c_limit,w_400/v1/p/x.jpg'
    )
  })
})

describe('build pipeline', () => {
  it('never includes draft Markdown in the site', async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const path = await import('node:path')
    const { loadContent } = await import('../vite/content-plugin.js')
    const dir = await mkdtemp(path.join(tmpdir(), 'pf-build-'))
    try {
      await mkdir(path.join(dir, 'articles'))
      const fm = (slug, status) => `---\ntitle: ${slug}\nslug: ${slug}\ndescription: d\ndate: 2026-01-01\nstatus: ${status}\n---\n\nSecret ${slug} body`
      await writeFile(path.join(dir, 'articles', 'live.md'), fm('live', 'published'))
      await writeFile(path.join(dir, 'articles', 'hidden.md'), fm('hidden', 'draft'))
      await writeFile(path.join(dir, 'articles', 'nostatus.md'), '---\ntitle: x\nslug: nostatus\ndescription: d\ndate: 2026-01-01\n---\nbody')
      const entries = await loadContent(dir, { strict: true })
      assert.deepEqual(entries.map((e) => e.slug), ['live'])
      assert.ok(!JSON.stringify(entries).includes('Secret hidden'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('CSP in vercel.json allows exactly the inline theme script', async () => {
    const { createHash } = await import('node:crypto')
    const { THEME_INIT_SCRIPT } = await import('../vite/theme-init.js')
    const hash = `sha256-${createHash('sha256').update(THEME_INIT_SCRIPT).digest('base64')}`
    const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
    const csp = cfg.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value
    assert.ok(csp.includes(`'${hash}'`), `Update vercel.json CSP script-src to include '${hash}'`)
    assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp), 'no unsafe-inline scripts')
  })
})
