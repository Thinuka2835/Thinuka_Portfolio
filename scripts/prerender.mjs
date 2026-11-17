#!/usr/bin/env node
// Static pre-rendering + SEO files. Runs after `vite build` (client) and
// `vite build --ssr src/entry-server.jsx` (server renderer):
//
//   • every public route → its own HTML with the real page content in <body>
//     (crawlers that don't run JavaScript see everything) and a route-specific
//     <head> (title, description, canonical, Open Graph, Twitter, JSON-LD)
//   • 404.html (noindex), sitemap.xml, robots.txt, llms.txt, llms-full.txt,
//     feed.xml (when articles exist) and site.webmanifest
//
// Only published Markdown and public site data are used; the admin path and
// server secrets are checked for and the build fails if any would leak.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { contentDirectory, loadContent, META_RE } from '../vite/content-plugin.js'
import {
  buildFeed,
  buildHead,
  buildLlms,
  buildLlmsFull,
  buildManifest,
  buildRobots,
  buildSitemaps,
  publicRoutes,
  seoEnv,
} from '../shared/seo.js'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const SSR_DIR = path.join(DIST, '.ssr')

const log = (m) => console.log(`[prerender] ${m}`)

async function main() {
  const env = seoEnv()
  const template = await readFile(path.join(DIST, 'index.html'), 'utf8')

  // Use exactly the site data embedded at build time, so hydration matches
  const dataMatch = /<script id="site-data" type="application\/json">([\s\S]*?)<\/script>/.exec(template)
  if (!dataMatch) throw new Error('dist/index.html has no embedded site data')
  const siteData = JSON.parse(dataMatch[1].replace(/\\u003c/g, '<'))

  const entries = await loadContent(contentDirectory(), { strict: true })
  const heroFile = (await readdir(path.join(DIST, 'assets'))).find((f) => /^user-.*\.webp$/.test(f))
  const heroAsset = heroFile ? `/assets/${heroFile}` : null
  const feed = buildFeed({ siteData, entries, env })

  const entryFile = (await readdir(SSR_DIR)).find((f) => /^entry-server\.m?js$/.test(f))
  if (!entryFile) throw new Error('SSR bundle missing — run `vite build --ssr src/entry-server.jsx` first')
  const { render } = await import(pathToFileURL(path.join(SSR_DIR, entryFile)).href)

  const page = (route, url) => {
    const entry = route.entry ? { key: `${route.entry.type}/${route.entry.slug}`, html: route.entry.html } : null
    const body = render(url ?? route.path, { siteData, entry })
    const head = buildHead({ route, siteData, entries, env, heroAsset, hasFeed: Boolean(feed) })
    return template
      .replace(META_RE, `<!--meta:start-->\n    ${head}\n    <!--meta:end-->`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
  }

  const written = []
  const write = async (rel, content) => {
    const file = path.join(DIST, rel)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content, 'utf8')
    written.push(rel)
  }

  for (const route of publicRoutes(entries)) {
    await write(route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`, page(route))
  }
  await write('404.html', page({ kind: '404', path: '/404' }, '/__not-found__'))

  for (const s of buildSitemaps({ entries, siteData, env, heroAsset })) await write(s.file, s.xml)
  await write('robots.txt', buildRobots(env))
  await write('llms.txt', buildLlms({ siteData, entries, env }))
  await write('llms-full.txt', buildLlmsFull({ siteData, entries, env }))
  await write('site.webmanifest', buildManifest(siteData))
  if (feed) await write('feed.xml', feed)

  await rm(SSR_DIR, { recursive: true, force: true })

  // Leak guard: no secret or admin path in anything public
  const secrets = ['ADMIN_PATH', 'DATABASE_URL', 'CLOUDINARY_API_SECRET', 'GITHUB_CONTENT_TOKEN', 'VERCEL_DEPLOY_HOOK_URL']
    .map((k) => [k, (process.env[k] || '').trim()])
    .filter(([, v]) => v.length >= 6)
  for (const rel of written) {
    const text = await readFile(path.join(DIST, rel), 'utf8')
    for (const [k, v] of secrets) {
      if (text.includes(v)) throw new Error(`${rel} contains the value of ${k} — refusing to publish it`)
    }
  }

  log(`${written.length} files · ${env.url} · ${env.indexable ? 'INDEXABLE (production)' : 'noindex (non-production)'}`)
}

main().catch((err) => {
  console.error(`[prerender] ${err.stack || err.message}`)
  process.exit(1)
})
