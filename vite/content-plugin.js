// Build-time Markdown pipeline.
//
// • `virtual:content` exposes metadata for PUBLISHED entries and a lazy
//   loader per entry (each entry's HTML is its own chunk). Draft files are
//   never read into the bundle, so they can't leak through the public site.
// • index.html gets the theme script and the site data (first-paint JSON).
// Page <head>s, body pre-rendering and SEO files (sitemap, robots, llms.txt,
// feed, manifest) are produced after the build by scripts/prerender.mjs.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  CONTENT_TYPE_KEYS,
  CONTENT_TYPES,
  parseMarkdownFile,
  readingTime,
  validateFrontmatter,
} from '../shared/content.js'
import { renderMarkdown } from '../shared/markdown.js'
import { buildHead, safeJson, seoEnv } from '../shared/seo.js'
import { THEME_INIT_SCRIPT } from './theme-init.js'

const VIRTUAL_INDEX = 'virtual:content'
const VIRTUAL_ENTRY = 'virtual:content-entry/'
const RESOLVED = '\0'
export const META_RE = /<!--meta:start-->[\s\S]*?<!--meta:end-->/

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
        author: fm.author ?? null,
        tags: fm.tags,
        cover: fm.cover ?? null,
        order: fm.order ?? null,
        link: fm.link ?? null,
        readingTime: readingTime(parsed.body),
        html: await renderMarkdown(parsed.body),
        markdown: parsed.body.replace(/<!--[\s\S]*?-->/g, '').trim(), // for llms-full.txt only
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

/** Markdown source directory (CONTENT_DIR, shared with the local content store). */
export const contentDirectory = () => path.resolve(process.env.CONTENT_DIR || 'content')

export function contentPlugin({ contentDir = contentDirectory(), loadSiteData, ssr = false } = {}) {
  let entries = []
  let isBuild = false
  let siteData = null

  return {
    name: 'portfolio-content',

    configResolved(config) {
      isBuild = config.command === 'build'
    },

    async buildStart() {
      entries = await loadContent(contentDir, { strict: isBuild })
      this.addWatchFile?.(contentDir)
      if (isBuild && !ssr) {
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
        // eslint-disable-next-line no-unused-vars
        const meta = entries.map(({ html, markdown, ...m }) => m)
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

    // Theme script for every HTML entry; site data (+ dev-time head) for the public site
    async transformIndexHtml(html, ctx) {
      let out = html.replace('<!--theme-init-->', `<script>${THEME_INIT_SCRIPT}</script>`)
      if (ctx.filename.endsWith('admin.html')) return out
      const data = isBuild ? siteData : await loadSiteData(ctx.server)
      if (!isBuild) {
        // In dev, show the home head; production heads are written per route by prerender.mjs
        const head = buildHead({ route: { kind: 'home', path: '/' }, siteData: data, entries, env: seoEnv() })
        out = out.replace(META_RE, `<!--meta:start-->\n    ${head}\n    <!--meta:end-->`)
      }
      out = out.replace('<!--site-data-->', `<script id="site-data" type="application/json">${safeJson(data)}</script>`)
      return out
    },
  }
}
