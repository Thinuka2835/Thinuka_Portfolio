// ─────────────────────────────────────────────────────────────────────────
// Central SEO / GEO configuration and generators.
//
// Everything here is built from real site data (Neon profile, social links,
// skills, tools, stats, certifications) and published Markdown — nothing is
// invented. Used at build time by scripts/prerender.mjs (per-route <head>,
// sitemap, robots.txt, llms.txt, feed, manifest) and in dev by the Vite plugin.
// ─────────────────────────────────────────────────────────────────────────
import { cldUrl } from './cloudinary.js'
import { SOCIAL_PLATFORMS } from './socialPlatforms.js'

/** Production domain (apex is canonical; www redirects to it — see vercel.json). */
export const DEFAULT_SITE_URL = 'https://thinuka-ransidu.me'

/** Known AI/LLM crawlers, used when AI_CRAWLERS=disallow (see SEO.md). */
export const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'Meta-ExternalAgent', 'Amazonbot', 'cohere-ai',
]

export const STATIC_ASSETS = {
  ogImage: '/og-image.png',
  ogImageAlt: (name, title) => `${name} — ${title}`,
}

const SITEMAP_CHUNK = 45000

// ── Environment ──────────────────────────────────────────────────────────
/**
 * indexable: only the production deployment is indexable. Vercel sets
 * VERCEL_ENV; outside Vercel set SEO_INDEXABLE=true for a real production build.
 */
export function seoEnv(env = process.env) {
  const url = (env.SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '')
  const indexable = env.VERCEL_ENV ? env.VERCEL_ENV === 'production' : env.SEO_INDEXABLE === 'true'
  return {
    url,
    indexable,
    lang: 'en',
    locale: (env.SITE_LOCALE || 'en_US').trim(),
    aiCrawlers: (env.AI_CRAWLERS || 'allow').trim().toLowerCase() === 'disallow' ? 'disallow' : 'allow',
    googleVerification: (env.GOOGLE_SITE_VERIFICATION || '').trim(),
    bingVerification: (env.BING_SITE_VERIFICATION || '').trim(),
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** JSON that is safe inside <script> (no "</script>" breakouts). */
export const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '')

const abs = (env, p) => (/^https?:\/\//.test(p) ? p : `${env.url}${p.startsWith('/') ? '' : '/'}${p}`)

/** Shorten to ~max chars at a word boundary (meta descriptions). */
export function clip(text, max = 160) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '')}…`
}

/** Site identity derived from the profile. */
export function identity(siteData) {
  const p = siteData.profile
  const title = `${p.titleLine1} ${p.titleHighlight}`.replace(/\.\s*$/, '').trim()
  const description = clip(p.bio || `${p.name} — ${title}. ${p.role}`)
  return { name: p.name, title, role: p.role, description, profile: p }
}

const xHandle = (socialLinks) => {
  const x = socialLinks.find((s) => s.platform === 'x')
  const m = x && /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/.exec(x.url)
  return m ? `@${m[1]}` : null
}

/** Absolute URL of the portrait used for Person.image / the home image sitemap. */
export function heroImageUrl(siteData, env, heroAsset) {
  const h = siteData.profile.heroImage
  if (h?.url) return cldUrl(h.url, { width: 1200 })
  return heroAsset ? abs(env, heroAsset) : null
}

// ── Routes ───────────────────────────────────────────────────────────────
/** Every public, indexable route (the 404 page is separate and noindex). */
export function publicRoutes(entries) {
  const routes = [{ kind: 'home', path: '/' }]
  if (entries.some((e) => e.type === 'articles')) routes.push({ kind: 'articles', path: '/articles' })
  for (const entry of entries) routes.push({ kind: 'entry', path: entry.path, entry })
  return routes
}

function routeMeta(route, id) {
  switch (route.kind) {
    case 'home':
      return { title: `${id.name} — ${id.title}`, description: id.description }
    case 'articles':
      return { title: `Articles | ${id.name}`, description: clip(`Articles by ${id.name}, ${id.title}.`) }
    case 'entry':
      return { title: `${route.entry.title} | ${id.name}`, description: clip(route.entry.description) }
    default:
      return { title: `Page not found | ${id.name}`, description: 'This page does not exist.' }
  }
}

function ogImage(route, env, id) {
  const cover = route.entry?.cover
  if (cover?.url) {
    return {
      url: cldUrl(cover.url, { width: 1200, height: 630, crop: 'fill', gravity: 'auto' }),
      alt: cover.alt || route.entry.title,
    }
  }
  return { url: abs(env, STATIC_ASSETS.ogImage), alt: STATIC_ASSETS.ogImageAlt(id.name, id.title) }
}

// ── Structured data (JSON-LD) ────────────────────────────────────────────
function personNode(siteData, env, id, heroAsset) {
  const p = id.profile
  const image = heroImageUrl(siteData, env, heroAsset)
  const node = {
    '@type': 'Person',
    '@id': `${env.url}/#person`,
    name: p.name,
    url: `${env.url}/`,
    jobTitle: id.title,
    description: p.bio || undefined,
    image: image || undefined,
    email: p.email ? `mailto:${p.email}` : undefined,
    sameAs: siteData.socialLinks.map((s) => s.url),
    knowsAbout: [...new Set([...siteData.ticker.map((t) => t.label), ...siteData.tools.map((t) => t.name)])],
    hasCredential: siteData.certifications.length
      ? siteData.certifications.map((c) => ({
          '@type': 'EducationalOccupationalCredential',
          name: c.title,
          ...(c.issuer ? { recognizedBy: { '@type': 'Organization', name: c.issuer } } : {}),
          ...(c.url ? { url: c.url } : {}),
        }))
      : undefined,
  }
  return JSON.parse(JSON.stringify(node)) // drop undefined
}

function websiteNode(env, id) {
  return {
    '@type': 'WebSite',
    '@id': `${env.url}/#website`,
    url: `${env.url}/`,
    name: id.name,
    description: id.description,
    inLanguage: env.lang,
    publisher: { '@id': `${env.url}/#person` },
    author: { '@id': `${env.url}/#person` },
  }
}

function breadcrumbNode(env, pageUrl, crumbs) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(env, c.path) })),
  }
}

const PARENT = {
  projects: { name: 'Projects', path: '/#projects' },
  articles: { name: 'Articles', path: '/articles' },
}

/** schema.org graph for a route — only types that genuinely describe the page. */
export function buildJsonLd({ route, siteData, env, heroAsset }) {
  if (route.kind === '404') return null
  const id = identity(siteData)
  const meta = routeMeta(route, id)
  const pageUrl = route.path === '/' ? `${env.url}/` : abs(env, route.path)
  const graph = [personNode(siteData, env, id, heroAsset), websiteNode(env, id)]
  const page = {
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: meta.title,
    description: meta.description,
    inLanguage: env.lang,
    isPartOf: { '@id': `${env.url}/#website` },
  }

  if (route.kind === 'home') {
    graph.push({ '@type': 'ProfilePage', ...page, about: { '@id': `${env.url}/#person` }, mainEntity: { '@id': `${env.url}/#person` } })
    return graph
  }

  const crumbs = [{ name: 'Home', path: '/' }]
  if (route.kind === 'articles') {
    crumbs.push({ name: 'Articles', path: '/articles' })
    graph.push({ '@type': 'CollectionPage', ...page, breadcrumb: { '@id': `${pageUrl}#breadcrumb` } }, breadcrumbNode(env, pageUrl, crumbs))
    return graph
  }

  const e = route.entry
  if (PARENT[e.type]) crumbs.push(PARENT[e.type])
  crumbs.push({ name: e.title, path: e.path })
  const image = e.cover?.url ? cldUrl(e.cover.url, { width: 1200 }) : undefined
  graph.push(
    JSON.parse(
      JSON.stringify({
        '@type': 'WebPage',
        ...page,
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
        primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
        datePublished: e.date || undefined,
        dateModified: e.updated || e.date || undefined,
      })
    ),
    breadcrumbNode(env, pageUrl, crumbs)
  )
  if (e.type === 'articles') {
    const author = e.author && e.author !== id.name ? { '@type': 'Person', name: e.author } : { '@id': `${env.url}/#person` }
    graph.push(
      JSON.parse(
        JSON.stringify({
          '@type': 'BlogPosting',
          '@id': `${pageUrl}#article`,
          headline: e.title,
          description: e.description,
          url: pageUrl,
          image,
          datePublished: e.date,
          dateModified: e.updated || e.date,
          author,
          publisher: { '@id': `${env.url}/#person` },
          mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
          keywords: e.tags.length ? e.tags.join(', ') : undefined,
          inLanguage: env.lang,
        })
      )
    )
  }
  return graph
}

// ── <head> ───────────────────────────────────────────────────────────────
export function buildHead({ route, siteData, entries = [], env, heroAsset, hasFeed = false }) {
  const id = identity(siteData)
  const meta = routeMeta(route, id)
  const is404 = route.kind === '404'
  const canonical = is404 ? null : route.path === '/' ? `${env.url}/` : abs(env, route.path)
  const image = ogImage(route, env, id)
  const isArticle = route.entry?.type === 'articles'
  const handle = xHandle(siteData.socialLinks)
  const robots = !env.indexable || is404 ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'
  const jsonLd = buildJsonLd({ route, siteData, env, heroAsset })
  const hasArticles = hasFeed && entries.some((e) => e.type === 'articles')

  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta name="author" content="${esc(route.entry?.author || id.name)}" />`,
    canonical && `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="${isArticle ? 'article' : route.kind === 'home' ? 'profile' : 'website'}" />`,
    `<meta property="og:site_name" content="${esc(id.name)}" />`,
    `<meta property="og:locale" content="${esc(env.locale)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    canonical && `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image.url)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(image.alt)}" />`,
    route.kind === 'home' && `<meta property="profile:first_name" content="${esc(id.name.split(' ')[0])}" />`,
    isArticle && route.entry.date && `<meta property="article:published_time" content="${esc(route.entry.date)}" />`,
    isArticle && (route.entry.updated || route.entry.date) && `<meta property="article:modified_time" content="${esc(route.entry.updated || route.entry.date)}" />`,
    isArticle && `<meta property="article:author" content="${esc(route.entry.author || id.name)}" />`,
    ...(isArticle ? route.entry.tags.map((t) => `<meta property="article:tag" content="${esc(t)}" />`) : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    handle && `<meta name="twitter:site" content="${esc(handle)}" />`,
    handle && `<meta name="twitter:creator" content="${esc(handle)}" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(image.url)}" />`,
    `<meta name="twitter:image:alt" content="${esc(image.alt)}" />`,
    route.kind === 'home' && env.googleVerification && `<meta name="google-site-verification" content="${esc(env.googleVerification)}" />`,
    route.kind === 'home' && env.bingVerification && `<meta name="msvalidate.01" content="${esc(env.bingVerification)}" />`,
    hasArticles && `<link rel="alternate" type="application/rss+xml" title="${esc(`${id.name} — Articles`)}" href="${esc(abs(env, '/feed.xml'))}" />`,
    jsonLd && `<script type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': jsonLd })}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}

// ── sitemap.xml ──────────────────────────────────────────────────────────
/** Returns [{ file, xml }]: one sitemap, or an index + chunks for very large sites. */
export function buildSitemaps({ entries, siteData, env, heroAsset }) {
  const id = identity(siteData)
  const latest = (list) => list.map((e) => e.updated || e.date).filter(Boolean).sort().pop()
  const articles = entries.filter((e) => e.type === 'articles')
  const urls = publicRoutes(entries).map((r) => {
    if (r.kind === 'home') {
      const img = heroImageUrl(siteData, env, heroAsset)
      return { loc: `${env.url}/`, images: img ? [{ loc: img, title: `${id.name} — ${id.title}` }] : [] }
    }
    if (r.kind === 'articles') return { loc: abs(env, r.path), lastmod: latest(articles) }
    const e = r.entry
    return {
      loc: abs(env, e.path),
      lastmod: e.updated || e.date || undefined,
      images: e.cover?.url ? [{ loc: cldUrl(e.cover.url, { width: 1200 }), title: e.cover.alt || e.title }] : [],
    }
  })

  const urlset = (list) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${list
      .map(
        (u) =>
          `  <url>\n    <loc>${esc(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${esc(u.lastmod)}</lastmod>` : ''}${(u.images || [])
            .map((i) => `\n    <image:image><image:loc>${esc(i.loc)}</image:loc></image:image>`)
            .join('')}\n  </url>`
      )
      .join('\n')}\n</urlset>\n`

  if (urls.length <= SITEMAP_CHUNK) return [{ file: 'sitemap.xml', xml: urlset(urls) }]

  const chunks = []
  for (let i = 0; i < urls.length; i += SITEMAP_CHUNK) chunks.push(urls.slice(i, i + SITEMAP_CHUNK))
  const files = chunks.map((c, i) => ({ file: `sitemap-${i + 1}.xml`, xml: urlset(c) }))
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files
    .map((f) => `  <sitemap><loc>${esc(abs(env, `/${f.file}`))}</loc></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`
  return [{ file: 'sitemap.xml', xml: index }, ...files]
}

// ── robots.txt ───────────────────────────────────────────────────────────
export function buildRobots(env) {
  if (!env.indexable) {
    // Preview / development builds: keep out of search results entirely
    return '# Non-production build — not for indexing\nUser-agent: *\nDisallow: /\n'
  }
  const lines = [
    '# https://www.robotstxt.org — public site. The admin is protected by authentication',
    '# and served with "X-Robots-Tag: noindex"; it is deliberately not listed here.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
  ]
  if (env.aiCrawlers === 'disallow') {
    lines.push('# AI crawlers opted out (AI_CRAWLERS=disallow)')
    for (const bot of AI_CRAWLERS) lines.push(`User-agent: ${bot}`)
    lines.push('Disallow: /', '')
  }
  lines.push(`Sitemap: ${env.url}/sitemap.xml`, '')
  return lines.join('\n')
}

// ── llms.txt / llms-full.txt ─────────────────────────────────────────────
const TYPE_HEADINGS = { projects: 'Projects', articles: 'Articles', pages: 'Pages' }

function contactLines(siteData) {
  const p = siteData.profile
  const out = []
  if (p.email) out.push(`- Email: [${p.email}](mailto:${p.email})`)
  if (p.location) out.push(`- Location: ${p.location}`)
  for (const s of siteData.socialLinks) out.push(`- [${s.label || SOCIAL_PLATFORMS[s.platform]?.label || s.platform}](${s.url})`)
  out.push(`- Contact form: ${'{url}'}/#contact`)
  return out
}

/** /llms.txt — concise overview in the llmstxt.org format. */
export function buildLlms({ siteData, entries, env }) {
  const id = identity(siteData)
  const p = id.profile
  const lines = [
    `# ${id.name}`,
    '',
    `> ${id.name} is a ${id.title.toLowerCase()} (${id.role}). ${p.quote}`.trim(),
    '',
    p.bio,
    '',
    '## Pages',
    '',
    `- [Home](${env.url}/): profile, specialties, toolkit${siteData.certifications.length ? ', certifications' : ''} and contact details`,
  ]
  if (entries.some((e) => e.type === 'articles')) lines.push(`- [Articles](${env.url}/articles): all published articles`)
  for (const type of ['projects', 'articles', 'pages']) {
    const list = entries.filter((e) => e.type === type)
    if (!list.length) continue
    lines.push('', `## ${TYPE_HEADINGS[type]}`, '')
    for (const e of list) lines.push(`- [${e.title}](${abs(env, e.path)}): ${e.description}`)
  }
  lines.push('', '## Contact', '', ...contactLines(siteData).map((l) => l.replace('{url}', env.url)))
  lines.push('', '## Optional', '', `- [Full public content](${env.url}/llms-full.txt): skills, toolkit and the full text of published pages`, '')
  return lines.join('\n')
}

/** /llms-full.txt — the same public facts plus full published content. */
export function buildLlmsFull({ siteData, entries, env }) {
  const id = identity(siteData)
  const p = id.profile
  const lines = [
    `# ${id.name} — ${id.title}`,
    '',
    `Website: ${env.url}/`,
    '',
    '## Overview',
    '',
    p.bio,
    '',
    p.quote,
    '',
    '## Specialties',
    '',
    ...id.role.split('·').map((r) => `- ${r.trim()}`).filter((l) => l !== '- '),
  ]
  if (siteData.ticker.length) lines.push('', '## Skills', '', ...siteData.ticker.map((t) => `- ${t.label}`))
  if (siteData.tools.length) lines.push('', '## Tools and platforms', '', ...siteData.tools.map((t) => `- ${t.name}`))
  if (siteData.stats.length) lines.push('', '## Career highlights', '', ...siteData.stats.map((s) => `- ${s.value}${s.suffix} ${s.label}`))
  if (siteData.certifications.length) {
    lines.push('', '## Certifications and achievements', '')
    for (const c of siteData.certifications) {
      lines.push(`- ${c.title}${c.issuer ? ` — ${c.issuer}` : ''}${c.year ? ` (${c.year})` : ''}${c.url ? ` — ${c.url}` : ''}`)
    }
  }
  for (const e of entries) {
    lines.push('', '---', '', `## ${e.title}`, '', `URL: ${abs(env, e.path)}`)
    if (e.date) lines.push(`Published: ${e.date}${e.updated ? ` (updated ${e.updated})` : ''}`)
    if (e.tags.length) lines.push(`Tags: ${e.tags.join(', ')}`)
    lines.push('', e.description, '', e.markdown)
  }
  lines.push('', '## Contact', '', ...contactLines(siteData).map((l) => l.replace('{url}', env.url)), '')
  return lines.join('\n')
}

// ── RSS feed (only when articles are published) ──────────────────────────
export function buildFeed({ siteData, entries, env }) {
  const articles = entries.filter((e) => e.type === 'articles')
  if (!articles.length) return null
  const id = identity(siteData)
  const rfc822 = (d) => new Date(`${d}T00:00:00Z`).toUTCString()
  const items = articles
    .map(
      (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(abs(env, a.path))}</link>
      <guid isPermaLink="true">${esc(abs(env, a.path))}</guid>
      <description>${esc(a.description)}</description>
      <pubDate>${rfc822(a.date)}</pubDate>
${a.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(`${id.name} — Articles`)}</title>
    <link>${esc(`${env.url}/articles`)}</link>
    <description>${esc(`Articles by ${id.name}, ${id.title}.`)}</description>
    <language>${env.lang}</language>
    <atom:link href="${esc(`${env.url}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${rfc822(articles[0].updated || articles[0].date)}</lastBuildDate>
${items}
  </channel>
</rss>
`
}

// ── Web app manifest ─────────────────────────────────────────────────────
export function buildManifest(siteData) {
  const id = identity(siteData)
  return JSON.stringify(
    {
      name: `${id.name} — ${id.title}`,
      short_name: id.name.split(' ')[0],
      description: id.description,
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'browser',
      background_color: '#08080a',
      theme_color: '#08080a',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2
  )
}
