// Build-time Markdown pipeline + prerendered page heads.
//
// • `virtual:content` exposes metadata for PUBLISHED entries and a lazy
//   loader per entry (each entry's HTML is its own chunk). Draft files are
//   never read into the bundle, so they can't leak through the public site.
// • After the build, every public route gets its own HTML file with the right
//   <title>, description, canonical URL and Open Graph/Twitter tags (crawlers
//   don't run JavaScript), plus 404.html, sitemap.xml and robots.txt.
// • The home page HTML embeds the current site data (from Neon, or defaults)
//   so the first paint already shows the right content.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  CONTENT_TYPE_KEYS,
  CONTENT_TYPES,
  parseMarkdownFile,
  readingTime,
  validateFrontmatter,
} from '../shared/content.js'
import { renderMarkdown } from '../shared/markdown.js'
import { cldUrl } from '../shared/cloudinary.js'
import { THEME_INIT_SCRIPT } from './theme-init.js'

const VIRTUAL_INDEX = 'virtual:content'
const VIRTUAL_ENTRY = 'virtual:content-entry/'
const RESOLVED = '\0'

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** JSON that is safe inside <script> (no "</script>" breakouts). */
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '')

export function siteUrl() {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return raw.replace(/\/+$/, '')
}

/** Read, validate and render all published Markdown entries. */
export async function loadContent(contentDir, { strict }) {
  const entries = []
  const problems = []
  for (const type of CONTENT_TYPE_KEYS) {
    let files = []
    try {
      files = (await readdir(path.join(contentDir, type))).filter((f) => f.endsWith('.md'))
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
    for (const file of files) {
      const rel = `${type}/${file}`
      const source = await readFile(path.join(contentDir, type, file), 'utf8')
      let parsed
      try {
        parsed = parseMarkdownFile(source)
      } catch (err) {
        problems.push(`${rel}: ${err.message}`)
        continue
      }
      if (parsed.data.status !== 'published') continue // drafts are skipped entirely
      const result = validateFrontmatter(type, parsed.data)
      if (!result.success) {
        problems.push(`${rel}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
        continue
      }
      const fm = result.data
      if (`${fm.slug}.md` !== file) {
        problems.push(`${rel}: slug "${fm.slug}" doesn't match the file name`)
        continue
      }
      entries.push({
        type,
        slug: fm.slug,
        path: CONTENT_TYPES[type].route(fm.slug),
        title: fm.title,
        description: fm.description,
        date: fm.date ?? null,
        updated: fm.updated ?? null,
        tags: fm.tags,
        cover: fm.cover ?? null,
        order: fm.order ?? null,
        link: fm.link ?? null,
        readingTime: readingTime(parsed.body),
        html: await renderMarkdown(parsed.body),
      })
    }
  }
  if (problems.length) {
    const msg = `Invalid content files:\n  - ${problems.join('\n  - ')}`
    if (strict) throw new Error(msg)
    console.warn(`[content] ${msg}`)
  }
  entries.sort((a, b) =>
    a.type === 'projects' && b.type === 'projects'
      ? (a.order ?? 999) - (b.order ?? 999) || (b.date || '').localeCompare(a.date || '')
      : (b.date || '').localeCompare(a.date || '')
  )
  return entries
}

function metaTags({ title, description, url, image, imageAlt, type = 'website', siteName, publishedTime, noindex }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : '',
    url ? `<link rel="canonical" href="${esc(url)}" />` : '',
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    url ? `<meta property="og:url" content="${esc(url)}" />` : '',
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    image ? `<meta property="og:image:width" content="1200" />` : '',
    image ? `<meta property="og:image:height" content="630" />` : '',
    imageAlt ? `<meta property="og:image:alt" content="${esc(imageAlt)}" />` : '',
    publishedTime ? `<meta property="article:published_time" content="${esc(publishedTime)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
  ]
  return tags.filter(Boolean).join('\n    ')
}

const META_RE = /<!--meta:start-->[\s\S]*?<!--meta:end-->/

export function contentPlugin({ contentDir = path.resolve('content'), loadSiteData } = {}) {
  let entries = []
  let isBuild = false
  let outDir = 'dist'
  let siteData = null

  const homeMeta = (data) => {
    const p = data.profile
    const role = `${p.titleLine1} ${p.titleHighlight}`.replace(/\.$/, '')
    const base = siteUrl()
    return metaTags({
      title: `${p.name} | ${role}`,
      description: `${p.name} — ${role.toLowerCase()}. ${p.role}`.slice(0, 300),
      url: base ? `${base}/` : '',
      image: base ? `${base}/og-default.png` : '/og-default.png',
      imageAlt: `${p.name} — ${role}`,
      siteName: p.name,
    })
  }

  const personJsonLd = (data) => {
    const base = siteUrl()
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: data.profile.name,
      jobTitle: `${data.profile.titleLine1} ${data.profile.titleHighlight}`.replace(/\.$/, ''),
      ...(base ? { url: `${base}/` } : {}),
      sameAs: data.socialLinks.map((s) => s.url),
    }
    return `<script type="application/ld+json">${safeJson(ld)}</script>`
  }

  return {
    name: 'portfolio-content',

    configResolved(config) {
      isBuild = config.command === 'build'
      outDir = path.resolve(config.root, config.build.outDir)
    },

    async buildStart() {
      entries = await loadContent(contentDir, { strict: isBuild })
      this.addWatchFile?.(contentDir)
      if (isBuild) {
        siteData = await loadSiteData()
        console.log(`[content] ${entries.length} published entr${entries.length === 1 ? 'y' : 'ies'}; site data from ${siteData.source}`)
      }
    },

    configureServer(server) {
      server.watcher.add(contentDir)
      const reload = async (file) => {
        if (!file.startsWith(contentDir)) return
        entries = await loadContent(contentDir, { strict: false })
        for (const id of server.moduleGraph.idToModuleMap.keys()) {
          if (id.startsWith(RESOLVED + 'virtual:content')) {
            server.moduleGraph.invalidateModule(server.moduleGraph.getModuleById(id))
          }
        }
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },

    resolveId(id) {
      if (id === VIRTUAL_INDEX || id.startsWith(VIRTUAL_ENTRY)) return RESOLVED + id
    },

    load(id) {
      if (id === RESOLVED + VIRTUAL_INDEX) {
        const meta = entries.map(({ html: _html, ...m }) => m)
        const loaders = entries
          .map((e) => `  ${JSON.stringify(`${e.type}/${e.slug}`)}: () => import(${JSON.stringify(`${VIRTUAL_ENTRY}${e.type}/${e.slug}`)})`)
          .join(',\n')
        return `export const entries = ${JSON.stringify(meta)};\nexport const loaders = {\n${loaders}\n};\n`
      }
      if (id.startsWith(RESOLVED + VIRTUAL_ENTRY)) {
        const key = id.slice((RESOLVED + VIRTUAL_ENTRY).length)
        const entry = entries.find((e) => `${e.type}/${e.slug}` === key)
        if (!entry) return 'export default null'
        return `export default ${JSON.stringify({ html: entry.html })};`
      }
    },

    // Theme script for every HTML entry; meta + data for the public site
    async transformIndexHtml(html, ctx) {
      let out = html.replace('<!--theme-init-->', `<script>${THEME_INIT_SCRIPT}</script>`)
      if (ctx.filename.endsWith('admin.html')) return out
      const data = isBuild ? siteData : await loadSiteData(ctx.server)
      out = out.replace(META_RE, `<!--meta:start-->\n    ${homeMeta(data)}\n    ${personJsonLd(data)}\n    <!--meta:end-->`)
      out = out.replace('<!--site-data-->', `<script id="site-data" type="application/json">${safeJson(data)}</script>`)
      return out
    },

    // Write one HTML file per public route, plus 404/sitemap/robots
    async closeBundle() {
      if (!isBuild) return
      const template = await readFile(path.join(outDir, 'index.html'), 'utf8')
      const base = siteUrl()
      const name = siteData.profile.name
      const write = async (rel, html) => {
        const file = path.join(outDir, rel)
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, html, 'utf8')
      }
      const withMeta = (meta) => template.replace(META_RE, `<!--meta:start-->\n    ${meta}\n    <!--meta:end-->`)

      for (const e of entries) {
        const image = e.cover?.url
          ? cldUrl(e.cover.url, { width: 1200, height: 630, crop: 'fill', gravity: 'auto' })
          : base
            ? `${base}/og-default.png`
            : '/og-default.png'
        const meta = metaTags({
          title: `${e.title} | ${name}`,
          description: e.description,
          url: base ? `${base}${e.path}` : '',
          image,
          imageAlt: e.cover?.alt || e.title,
          type: e.type === 'pages' ? 'website' : 'article',
          siteName: name,
          publishedTime: e.date,
        })
        await write(`${e.path.slice(1)}/index.html`, withMeta(meta))
      }

      const articles = entries.filter((e) => e.type === 'articles')
      if (articles.length) {
        await write(
          'articles/index.html',
          withMeta(
            metaTags({
              title: `Articles | ${name}`,
              description: `Articles and notes by ${name}.`,
              url: base ? `${base}/articles` : '',
              image: base ? `${base}/og-default.png` : '/og-default.png',
              siteName: name,
            })
          )
        )
      }

      await write('404.html', withMeta(metaTags({ title: `Page not found | ${name}`, description: 'This page does not exist.', siteName: name, noindex: true })))

      // Sitemap: public, published routes only — never the admin path
      if (base) {
        const urls = [
          { loc: `${base}/` },
          ...(articles.length ? [{ loc: `${base}/articles` }] : []),
          ...entries.map((e) => ({ loc: `${base}${e.path}`, lastmod: e.updated || e.date })),
        ]
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}</url>`)
          .join('\n')}\n</urlset>\n`
        await write('sitemap.xml', xml)
      }
      await write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\n${base ? `\nSitemap: ${base}/sitemap.xml\n` : ''}`)
    },
  }
}
