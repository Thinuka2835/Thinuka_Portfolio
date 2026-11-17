import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFeed,
  buildHead,
  buildJsonLd,
  buildLlms,
  buildLlmsFull,
  buildManifest,
  buildRobots,
  buildSitemaps,
  clip,
  publicRoutes,
  seoEnv,
} from '../shared/seo.js'
import { getDefaultSiteData } from '../shared/siteDefaults.js'

const prod = seoEnv({ VERCEL_ENV: 'production' })
const preview = seoEnv({ VERCEL_ENV: 'preview' })
const siteData = getDefaultSiteData()

const article = {
  type: 'articles',
  slug: 'rescue-sprint',
  path: '/articles/rescue-sprint',
  title: 'Running a Rescue Sprint',
  description: 'How to recover a slipping delivery plan.',
  date: '2026-10-01',
  updated: '2026-10-05',
  author: null,
  tags: ['Agile'],
  cover: null,
  markdown: '## Why\n\nBody.',
  html: '<h2>Why</h2>',
}
const project = {
  type: 'projects',
  slug: 'migration',
  path: '/projects/migration',
  title: 'Platform Migration',
  description: 'A migration case study.',
  date: null,
  updated: null,
  author: null,
  tags: [],
  cover: { url: 'https://res.cloudinary.com/demo/image/upload/v1/x.jpg', alt: 'Board', width: 1600, height: 900 },
  markdown: 'Body',
  html: '<p>Body</p>',
}
const entries = [article, project]

const ldOf = (head) => JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(head)[1])

describe('environment', () => {
  it('only production is indexable', () => {
    assert.equal(prod.indexable, true)
    assert.equal(preview.indexable, false)
    assert.equal(seoEnv({}).indexable, false)
    assert.equal(seoEnv({ SEO_INDEXABLE: 'true' }).indexable, true)
    assert.equal(prod.url, 'https://thinuka-ransidu.me')
    assert.equal(seoEnv({ SITE_URL: 'https://example.org/' }).url, 'https://example.org')
  })
})

describe('robots.txt', () => {
  it('allows the public site and references the sitemap in production', () => {
    const r = buildRobots(prod)
    assert.match(r, /User-agent: \*\nAllow: \//)
    assert.match(r, /Disallow: \/api\//)
    assert.match(r, /Sitemap: https:\/\/thinuka-ransidu\.me\/sitemap\.xml/)
    assert.ok(!/Disallow: \/\n/.test(r.split('Disallow: /api/')[0]), 'does not block the whole site')
  })
  it('blocks everything on preview/development builds', () => {
    assert.match(buildRobots(preview), /User-agent: \*\nDisallow: \/\n/)
  })
  it('can opt out of AI crawlers deliberately', () => {
    const r = buildRobots(seoEnv({ VERCEL_ENV: 'production', AI_CRAWLERS: 'disallow' }))
    assert.match(r, /User-agent: GPTBot/)
    assert.match(r, /User-agent: ClaudeBot/)
    assert.match(r, /User-agent: Google-Extended\n[\s\S]*Disallow: \//)
  })
})

describe('page <head>', () => {
  it('home: unique title/description, canonical, OG/Twitter, Person+WebSite+ProfilePage', () => {
    const head = buildHead({ route: { kind: 'home', path: '/' }, siteData, entries, env: prod })
    assert.match(head, /<title>Thinuka — Project Manager<\/title>/)
    assert.match(head, /<link rel="canonical" href="https:\/\/thinuka-ransidu\.me\/" \/>/)
    assert.match(head, /name="robots" content="index, follow/)
    for (const p of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'og:url', 'og:type', 'og:site_name', 'og:locale']) {
      assert.match(head, new RegExp(`property="${p}"`), p)
    }
    for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.match(head, new RegExp(`name="${n}"`), n)
    assert.match(head, /og:image" content="https:\/\/thinuka-ransidu\.me\/og-image\.png"/)
    const types = ldOf(head)['@graph'].map((n) => n['@type'])
    assert.deepEqual(types, ['Person', 'WebSite', 'ProfilePage'])
  })

  it('article: BlogPosting with dates, breadcrumbs, article meta and RSS link', () => {
    const route = publicRoutes(entries).find((r) => r.entry === article)
    const head = buildHead({ route, siteData, entries, env: prod, hasFeed: true })
    assert.match(head, /<title>Running a Rescue Sprint \| Thinuka<\/title>/)
    assert.match(head, /article:published_time" content="2026-10-01"/)
    assert.match(head, /article:modified_time" content="2026-10-05"/)
    assert.match(head, /application\/rss\+xml/)
    const graph = ldOf(head)['@graph']
    const post = graph.find((n) => n['@type'] === 'BlogPosting')
    assert.equal(post.datePublished, '2026-10-01')
    assert.equal(post.dateModified, '2026-10-05')
    assert.deepEqual(post.author, { '@id': 'https://thinuka-ransidu.me/#person' })
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList').itemListElement.map((i) => i.name)
    assert.deepEqual(crumbs, ['Home', 'Articles', 'Running a Rescue Sprint'])
  })

  it('project with cover: per-page Cloudinary OG image (1200×630)', () => {
    const route = publicRoutes(entries).find((r) => r.entry === project)
    const head = buildHead({ route, siteData, entries, env: prod })
    assert.match(head, /og:image" content="https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_auto,q_auto,c_fill,g_auto,w_1200,h_630\/v1\/x\.jpg"/)
    assert.match(head, /og:image:alt" content="Board"/)
    assert.ok(!ldOf(head)['@graph'].some((n) => n['@type'] === 'BlogPosting'), 'projects are not BlogPostings')
  })

  it('404 and non-production pages are noindex; 404 has no canonical or JSON-LD', () => {
    const h404 = buildHead({ route: { kind: '404', path: '/404' }, siteData, entries, env: prod })
    assert.match(h404, /name="robots" content="noindex, nofollow"/)
    assert.ok(!/rel="canonical"/.test(h404))
    assert.ok(!/ld\+json/.test(h404))
    const hPrev = buildHead({ route: { kind: 'home', path: '/' }, siteData, entries, env: preview })
    assert.match(hPrev, /name="robots" content="noindex, nofollow"/)
  })

  it('escapes metadata and keeps JSON-LD safe inside <script>', () => {
    const evil = { ...article, title: 'A </script><script>alert(1)</script> & "q"' }
    const route = { kind: 'entry', path: evil.path, entry: evil }
    const head = buildHead({ route, siteData, entries: [evil], env: prod })
    assert.ok(!head.includes('</script><script>alert'))
    assert.match(head, /<title>A &lt;\/script&gt;/)
    assert.doesNotThrow(() => ldOf(head))
  })

  it('verification tags only when configured, only on the home page', () => {
    const env = seoEnv({ VERCEL_ENV: 'production', GOOGLE_SITE_VERIFICATION: 'g-token', BING_SITE_VERIFICATION: 'b-token' })
    const home = buildHead({ route: { kind: 'home', path: '/' }, siteData, entries, env })
    assert.match(home, /google-site-verification" content="g-token"/)
    assert.match(home, /msvalidate\.01" content="b-token"/)
    assert.ok(!/google-site-verification/.test(buildHead({ route: { kind: 'home', path: '/' }, siteData, entries, env: prod })))
  })
})

describe('structured data', () => {
  it('Person is built only from real profile data', () => {
    const person = buildJsonLd({ route: { kind: 'home', path: '/' }, siteData, env: prod })[0]
    assert.equal(person.name, 'Thinuka')
    assert.equal(person.jobTitle, 'Project Manager')
    assert.deepEqual(person.sameAs, siteData.socialLinks.map((s) => s.url))
    assert.ok(!('email' in person), 'no email when none is public')
    assert.ok(!('aggregateRating' in person) && !('review' in person))
  })
})

describe('sitemap.xml', () => {
  it('lists only public URLs with absolute locs, lastmod and images', () => {
    const [{ file, xml }] = buildSitemaps({ entries, siteData, env: prod, heroAsset: '/assets/user-x.webp' })
    assert.equal(file, 'sitemap.xml')
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
    assert.deepEqual(locs, [
      'https://thinuka-ransidu.me/',
      'https://thinuka-ransidu.me/articles',
      'https://thinuka-ransidu.me/articles/rescue-sprint',
      'https://thinuka-ransidu.me/projects/migration',
    ])
    assert.match(xml, /<lastmod>2026-10-05<\/lastmod>/)
    assert.match(xml, /<image:loc>https:\/\/thinuka-ransidu\.me\/assets\/user-x\.webp<\/image:loc>/)
    assert.equal(new Set(locs).size, locs.length, 'no duplicates')
  })
  it('splits into a sitemap index for very large sites', () => {
    const many = Array.from({ length: 45001 }, (_, i) => ({ ...project, slug: `p${i}`, path: `/projects/p${i}`, cover: null }))
    const files = buildSitemaps({ entries: many, siteData, env: prod })
    assert.equal(files[0].file, 'sitemap.xml')
    assert.match(files[0].xml, /<sitemapindex/)
    assert.deepEqual(files.slice(1).map((f) => f.file), ['sitemap-1.xml', 'sitemap-2.xml'])
  })
})

describe('llms.txt, feed and manifest', () => {
  it('llms.txt is factual Markdown built from public data', () => {
    const t = buildLlms({ siteData, entries, env: prod })
    assert.match(t, /^# Thinuka\n\n> Thinuka is a project manager/)
    assert.match(t, /- \[Running a Rescue Sprint\]\(https:\/\/thinuka-ransidu\.me\/articles\/rescue-sprint\)/)
    assert.match(t, /\[GitHub\]\(https:\/\/github\.com\/Thinuka2835\)/)
    assert.ok(!/admin|studio|password|token/i.test(t))
    const full = buildLlmsFull({ siteData, entries, env: prod })
    assert.match(full, /## Skills/)
    assert.match(full, /## Running a Rescue Sprint[\s\S]*## Why/)
  })
  it('feed exists only when articles are published', () => {
    assert.equal(buildFeed({ siteData, entries: [project], env: prod }), null)
    assert.match(buildFeed({ siteData, entries, env: prod }), /<rss version="2\.0"/)
  })
  it('manifest is valid JSON with icons', () => {
    const m = JSON.parse(buildManifest(siteData))
    assert.equal(m.short_name, 'Thinuka')
    assert.ok(m.icons.some((i) => i.sizes === '512x512'))
  })
  it('clips descriptions at a word boundary', () => {
    assert.equal(clip('word '.repeat(60), 30).length <= 30, true)
    assert.match(clip('word '.repeat(60), 30), /…$/)
  })
})
