// Where admin Markdown edits are persisted.
//
//   github (production): every save is an atomic commit to the repository via
//     the GitHub Git Data API. The commit triggers a Vercel deployment, and the
//     build turns the Markdown into pages. Nothing is written to Vercel's
//     temporary filesystem.
//   fs (local development only): reads/writes ./content directly so you can
//     review changes with git before committing them yourself.
//
// Both stores identify file versions by their git blob SHA, which the editor
// sends back on save; a mismatch means someone else changed the file → 409.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CONTENT_TYPE_KEYS, contentPath } from '../../shared/content.js'
import { contentConfig } from '../config.js'
import { conflict, ConfigError, HttpError } from '../errors.js'

/** Git's blob id for a file's contents (same value GitHub reports as `sha`). */
export const gitBlobSha = (text) => {
  const buf = Buffer.from(text, 'utf8')
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
}

// ── Filesystem store (local dev) ────────────────────────────────────────
export function createFsStore(rootDir) {
  const abs = (rel) => path.join(rootDir, rel)

  async function readEntry(type, slug) {
    try {
      const markdown = await readFile(abs(contentPath(type, slug)), 'utf8')
      return { type, slug, markdown, sha: gitBlobSha(markdown) }
    } catch (err) {
      if (err.code === 'ENOENT') return null
      throw err
    }
  }

  return {
    kind: 'fs',
    async list() {
      const out = []
      for (const type of CONTENT_TYPE_KEYS) {
        let files = []
        try {
          files = await readdir(abs(type))
        } catch (err) {
          if (err.code !== 'ENOENT') throw err
        }
        for (const f of files.filter((f) => f.endsWith('.md'))) {
          out.push(await readEntry(type, f.slice(0, -3)))
        }
      }
      return out.filter(Boolean)
    },
    get: readEntry,
    async commit({ changes }) {
      // Check every expectation before touching disk
      for (const ch of changes) {
        const current = await readEntry(ch.type, ch.slug)
        assertExpected(ch, current?.sha ?? null)
      }
      for (const ch of changes) {
        const file = abs(contentPath(ch.type, ch.slug))
        if (ch.markdown === null) {
          await rm(file, { force: true })
        } else {
          await mkdir(path.dirname(file), { recursive: true })
          const tmp = `${file}.${process.pid}.tmp`
          await writeFile(tmp, ch.markdown, 'utf8')
          await rename(tmp, file)
        }
      }
      return { commitSha: null, commitUrl: null }
    },
  }
}

function assertExpected(change, currentSha) {
  const expected = change.expectedSha ?? null
  if (expected === currentSha) return
  if (expected === null) throw conflict(`"${change.slug}" already exists. Choose another slug.`, { path: contentPath(change.type, change.slug) })
  if (currentSha === null) throw conflict(`"${change.slug}" no longer exists — it may have been deleted by someone else.`)
  throw conflict('This entry was changed since you opened it. Reload to get the latest version, then re-apply your edits.', {
    path: contentPath(change.type, change.slug),
  })
}

// ── GitHub store (production) ───────────────────────────────────────────
export function createGitHubStore({ repo, token, branch, dir, fetchImpl = fetch }) {
  const [owner, name] = repo.split('/')
  const api = async (method, url, body) => {
    const res = await fetchImpl(url.startsWith('http') ? url : `https://api.github.com${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'portfolio-cms',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = res.status === 204 ? null : await res.json().catch(() => null)
    if (!res.ok) {
      const err = new HttpError(
        res.status === 401 || res.status === 403 ? 502 : res.status === 422 ? 409 : 502,
        'github_error',
        `GitHub request failed (${res.status}): ${json?.message || res.statusText}`
      )
      err.githubStatus = res.status
      throw err
    }
    return json
  }

  const filePath = (type, slug) => `${dir}/${contentPath(type, slug)}`

  async function readAtRef(type, slug, ref) {
    try {
      const json = await api('GET', `/repos/${owner}/${name}/contents/${encodeURI(filePath(type, slug))}?ref=${encodeURIComponent(ref)}`)
      if (Array.isArray(json) || json.type !== 'file') return null
      return { type, slug, markdown: Buffer.from(json.content, 'base64').toString('utf8'), sha: json.sha }
    } catch (err) {
      if (err.githubStatus === 404) return null
      throw err
    }
  }

  return {
    kind: 'github',
    async list() {
      // One GraphQL request returns every file's text in content/<type>/
      const expression = `${branch}:${dir}`
      const json = await api('POST', '/graphql', {
        query: `query($owner: String!, $name: String!, $expr: String!) {
          repository(owner: $owner, name: $name) {
            object(expression: $expr) {
              ... on Tree { entries { name type object { ... on Tree { entries { name type oid object { ... on Blob { text } } } } } } }
            }
          }
        }`,
        variables: { owner, name, expr: expression },
      })
      if (json.errors?.length) throw new HttpError(502, 'github_error', `GitHub: ${json.errors[0].message}`)
      const out = []
      for (const typeDir of json.data?.repository?.object?.entries || []) {
        if (typeDir.type !== 'tree' || !CONTENT_TYPE_KEYS.includes(typeDir.name)) continue
        for (const f of typeDir.object?.entries || []) {
          if (f.type !== 'blob' || !f.name.endsWith('.md')) continue
          out.push({ type: typeDir.name, slug: f.name.slice(0, -3), markdown: f.object?.text ?? '', sha: f.oid })
        }
      }
      return out
    },
    get: (type, slug) => readAtRef(type, slug, branch),
    async commit({ changes, message }) {
      // Retry once if the branch moves between reading and updating it
      for (let attempt = 0; attempt < 3; attempt++) {
        const ref = await api('GET', `/repos/${owner}/${name}/git/ref/heads/${encodeURIComponent(branch)}`)
        const headSha = ref.object.sha
        for (const ch of changes) {
          const current = await readAtRef(ch.type, ch.slug, headSha)
          assertExpected(ch, current?.sha ?? null)
        }
        const headCommit = await api('GET', `/repos/${owner}/${name}/git/commits/${headSha}`)
        const tree = await api('POST', `/repos/${owner}/${name}/git/trees`, {
          base_tree: headCommit.tree.sha,
          tree: changes.map((ch) =>
            ch.markdown === null
              ? { path: filePath(ch.type, ch.slug), mode: '100644', type: 'blob', sha: null }
              : { path: filePath(ch.type, ch.slug), mode: '100644', type: 'blob', content: ch.markdown }
          ),
        })
        const commit = await api('POST', `/repos/${owner}/${name}/git/commits`, {
          message,
          tree: tree.sha,
          parents: [headSha],
        })
        try {
          await api('PATCH', `/repos/${owner}/${name}/git/refs/heads/${encodeURIComponent(branch)}`, {
            sha: commit.sha,
            force: false,
          })
          return { commitSha: commit.sha, commitUrl: commit.html_url || `https://github.com/${owner}/${name}/commit/${commit.sha}` }
        } catch (err) {
          if (err.githubStatus !== 422 || attempt === 2) throw err
        }
      }
      throw conflict('The content branch kept changing. Please try again.')
    },
  }
}

export function getContentStore() {
  const cfg = contentConfig()
  if (cfg.store === 'github') {
    if (!cfg.token || !cfg.repo) throw new ConfigError(cfg.readOnlyReason)
    return createGitHubStore(cfg)
  }
  return createFsStore(path.resolve(process.cwd(), cfg.dir))
}
