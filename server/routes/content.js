// Markdown content API (admin only).
// Markdown in the repository is the source of truth for long-form content;
// these routes read it and write it back as commits (see contentStore.js).
import { Hono } from 'hono'
import {
  CONTENT_TYPE_KEYS,
  CONTENT_TYPES,
  contentPath,
  parseMarkdownFile,
  serializeMarkdownFile,
  validateFrontmatter,
  SLUG_PATTERN,
} from '../../shared/content.js'
import { adminPath, contentConfig } from '../config.js'
import { query } from '../db/client.js'
import { badRequest, ConfigError, notFound } from '../errors.js'
import { getContentStore, gitBlobSha } from '../services/contentStore.js'
import { contentSaveSchema } from '../validation.js'
import { parse, readJson } from './helpers.js'

export const contentRoutes = new Hono()

function params(c) {
  const type = c.req.param('type')
  const slug = c.req.param('slug')
  if (!CONTENT_TYPE_KEYS.includes(type) || (slug !== undefined && !SLUG_PATTERN.test(slug))) throw notFound()
  return { type, slug }
}

function readableStore() {
  const cfg = contentConfig()
  if (cfg.store === 'fs' && process.env.VERCEL) throw new ConfigError(cfg.readOnlyReason)
  return getContentStore()
}

function writableStore() {
  const cfg = contentConfig()
  if (!cfg.writable) throw new ConfigError(cfg.readOnlyReason)
  return { store: getContentStore(), cfg }
}

function summarize(entry) {
  try {
    const { data } = parseMarkdownFile(entry.markdown)
    return {
      type: entry.type,
      slug: entry.slug,
      sha: entry.sha,
      title: String(data.title ?? entry.slug),
      description: String(data.description ?? ''),
      status: data.status === 'published' ? 'published' : 'draft',
      date: data.date ? String(data.date) : null,
      updated: data.updated ? String(data.updated) : null,
      valid: validateFrontmatter(entry.type, data).success,
    }
  } catch (err) {
    return { type: entry.type, slug: entry.slug, sha: entry.sha, title: entry.slug, status: 'draft', valid: false, error: err.message }
  }
}

async function logEvent(c, action, type, slug, store, commitSha) {
  await query(
    `insert into content_events (action, content_type, slug, store, commit_sha, admin_id) values ($1, $2, $3, $4, $5, $6)`,
    [action, type, slug, store, commitSha, c.get('admin').id]
  )
}

contentRoutes.get('/', async (c) => {
  const entries = await readableStore().list()
  const items = entries.map(summarize).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const events = await query(
    `select e.action, e.content_type, e.slug, e.commit_sha, e.created_at, u.email
       from content_events e left join admin_users u on u.id = e.admin_id
      order by e.created_at desc limit 10`
  )
  return c.json({ items, events })
})

contentRoutes.get('/:type/:slug', async (c) => {
  const { type, slug } = params(c)
  const entry = await readableStore().get(type, slug)
  if (!entry) throw notFound('This entry doesn’t exist (it may have been unpublished).')
  let parsed
  try {
    parsed = parseMarkdownFile(entry.markdown)
  } catch (err) {
    throw badRequest(`The file’s frontmatter is not valid YAML: ${err.message}`)
  }
  return c.json({ type, slug, sha: entry.sha, frontmatter: parsed.data, body: parsed.body })
})

// Create or update (publish). `expectedSha: null` means "create new".
contentRoutes.put('/:type/:slug', async (c) => {
  const { type, slug } = params(c)
  const input = parse(contentSaveSchema, await readJson(c))
  const { store, cfg } = writableStore()

  const fm = validateFrontmatter(type, input.frontmatter)
  if (!fm.success) {
    const fields = {}
    for (const issue of fm.error.issues) fields[`frontmatter.${issue.path.join('.')}`] ??= issue.message
    throw badRequest('Please fix the highlighted fields.', { fields })
  }
  const data = fm.data
  if (data.slug !== slug) throw badRequest('Slug in the URL and in the frontmatter must match.')
  if (type === 'pages' && adminPath() && `/${slug}`.toLowerCase() === adminPath().toLowerCase()) {
    throw badRequest('Please fix the highlighted fields.', { fields: { 'frontmatter.slug': 'This slug is reserved.' } })
  }
  if (data.status === 'draft' && !cfg.allowDrafts) {
    throw badRequest(
      'Drafts can’t be saved: content is committed to a public repository, so a draft would be publicly readable on GitHub. Publish the entry, or keep working on it here (your browser keeps a local copy).',
      { code: 'drafts_disabled' }
    )
  }

  const markdown = serializeMarkdownFile(data, input.body)
  const renaming = input.previousSlug && input.previousSlug !== slug
  if (renaming && !SLUG_PATTERN.test(input.previousSlug)) throw badRequest('Invalid previous slug.')

  const changes = renaming
    ? [
        { type, slug, markdown, expectedSha: null },
        { type, slug: input.previousSlug, markdown: null, expectedSha: input.expectedSha },
      ]
    : [{ type, slug, markdown, expectedSha: input.expectedSha }]

  const isNew = input.expectedSha === null
  const action = data.status === 'draft' ? 'update' : isNew ? 'publish' : 'update'
  const verb = isNew ? 'publish' : renaming ? `rename ${input.previousSlug} →` : 'update'
  const { commitSha, commitUrl } = await store.commit({
    changes,
    message: `content(${type}): ${verb} ${slug}\n\n${data.title}`,
  })
  await logEvent(c, action, type, slug, store.kind, commitSha)

  return c.json({
    type,
    slug,
    sha: gitBlobSha(markdown),
    status: data.status,
    store: store.kind,
    commitSha,
    commitUrl,
    path: `${cfg.dir}/${contentPath(type, slug)}`,
    publicPath: data.status === 'published' ? CONTENT_TYPES[type].route(slug) : null,
  })
})

// Unpublish/delete: removes the file. In this repository's configuration
// (public repo, drafts disabled) unpublishing therefore removes the entry;
// the text remains in git history.
contentRoutes.delete('/:type/:slug', async (c) => {
  const { type, slug } = params(c)
  const sha = c.req.query('sha')
  const action = c.req.query('action') === 'unpublish' ? 'unpublish' : 'delete'
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw badRequest('Missing the version (sha) you are deleting.')
  const { store } = writableStore()
  const { commitSha, commitUrl } = await store.commit({
    changes: [{ type, slug, markdown: null, expectedSha: sha }],
    message: `content(${type}): ${action} ${slug}`,
  })
  await logEvent(c, action, type, slug, store.kind, commitSha)
  return c.json({ ok: true, commitSha, commitUrl })
})
