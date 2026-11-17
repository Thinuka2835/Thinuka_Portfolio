// Content model for long-form Markdown (projects, articles, pages).
// Shared by the build (vite/content-plugin.js), the server (content API)
// and the admin editor, so validation is identical everywhere.
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { z } from 'zod'

export const CONTENT_TYPES = {
  projects: { label: 'Projects', singular: 'Project', route: (slug) => `/projects/${slug}` },
  articles: { label: 'Articles', singular: 'Article', route: (slug) => `/articles/${slug}` },
  pages:    { label: 'Pages',    singular: 'Page',    route: (slug) => `/${slug}` },
}
export const CONTENT_TYPE_KEYS = Object.keys(CONTENT_TYPES)

/** Slugs a top-level page may not use, because real routes/files live there. */
export const RESERVED_PAGE_SLUGS = new Set([
  'api', 'assets', 'projects', 'articles', 'admin', 'admin.html', 'index', 'index.html',
  '404', '404.html', 'sitemap.xml', 'robots.txt', 'favicon.svg', 'og-default.png',
])

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isoDate = z
  .string()
  .regex(DATE_PATTERN, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Not a real date')

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => {
    try {
      return new URL(s).protocol === 'https:'
    } catch {
      return false
    }
  }, 'Must be a full https:// URL')

export const coverSchema = z.object({
  url: httpsUrl,
  alt: z.string().trim().max(300).default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  publicId: z.string().max(300).optional(),
})

export const frontmatterSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  slug: z.string().trim().min(1).max(80).regex(SLUG_PATTERN, 'Lowercase letters, numbers and single hyphens only'),
  description: z.string().trim().min(1, 'Description is required').max(300),
  date: isoDate.optional(),
  updated: isoDate.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  cover: coverSchema.optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  // projects only
  order: z.number().int().min(0).max(999).optional(),
  link: httpsUrl.optional(),
})

/** Validate frontmatter for a given type. Returns { success, data, error } like zod. */
export function validateFrontmatter(type, data) {
  const schema = frontmatterSchema.superRefine((fm, ctx) => {
    if (type === 'articles' && !fm.date) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: 'Date is required' })
    }
    if (type === 'pages' && RESERVED_PAGE_SLUGS.has(fm.slug)) {
      ctx.addIssue({ code: 'custom', path: ['slug'], message: 'This slug is reserved for another route' })
    }
  })
  return schema.safeParse(data)
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/** Split a Markdown file into { data, body }. Throws on malformed YAML. */
export function parseMarkdownFile(source) {
  const match = FRONTMATTER_RE.exec(source)
  if (!match) return { data: {}, body: source }
  const data = parseYaml(match[1]) ?? {}
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be a YAML mapping')
  return { data, body: source.slice(match[0].length) }
}

const FIELD_ORDER = ['title', 'slug', 'description', 'date', 'updated', 'status', 'tags', 'order', 'link', 'cover']

/** Serialize { data, body } back to a Markdown file with stable key order. */
export function serializeMarkdownFile(data, body) {
  const ordered = {}
  for (const key of FIELD_ORDER) {
    const v = data[key]
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue
    ordered[key] = v
  }
  const yaml = stringifyYaml(ordered, { lineWidth: 0 }).trimEnd()
  const text = body.replace(/^\s*\n/, '').replace(/\s*$/, '\n')
  return `---\n${yaml}\n---\n\n${text}`
}

/** Path of a content file relative to the content directory. */
export const contentPath = (type, slug) => `${type}/${slug}.md`

/** Rough reading time in minutes. */
export function readingTime(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}
