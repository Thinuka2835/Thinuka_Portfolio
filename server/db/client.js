// Database access — server-side only.
//
//   DATABASE_URL=postgres://…neon.tech/…   → Neon (serverless HTTP driver)
//   DATABASE_URL=pglite:./.data/pglite     → PGlite (embedded Postgres; local dev/tests only)
//   DATABASE_URL=pglite:memory             → in-memory PGlite (tests)
//
// Every query goes through `query(text, params)` with $1, $2… placeholders,
// so values are always sent separately from SQL (no string interpolation).
import { ConfigError } from '../errors.js'

let dbPromise = null

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

async function createNeon(url) {
  const { neon, Pool } = await import('@neondatabase/serverless')
  const sql = neon(url)
  return {
    kind: 'neon',
    query: (text, params = []) => sql.query(text, params),
    // Multi-statement SQL / interactive transactions need a WebSocket client
    async withClient(fn) {
      const pool = new Pool({ connectionString: url })
      const client = await pool.connect()
      try {
        return await fn({
          query: async (text, params = []) => (await client.query(text, params)).rows,
          exec: (text) => client.query(text),
        })
      } finally {
        client.release()
        await pool.end()
      }
    },
  }
}

async function createPglite(location) {
  if (process.env.VERCEL) {
    throw new ConfigError('PGlite is for local development only. Set DATABASE_URL to your Neon connection string.')
  }
  // Variable specifier so the Vercel bundler never traces this dev-only package
  const pkg = '@electric-sql/pglite'
  const { PGlite } = await import(/* @vite-ignore */ pkg)
  const pg = location === 'memory' ? new PGlite() : new PGlite(location)
  await pg.waitReady
  return {
    kind: 'pglite',
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    withClient: (fn) =>
      fn({
        query: async (text, params = []) => (await pg.query(text, params)).rows,
        exec: (text) => pg.exec(text),
      }),
    close: () => pg.close(),
  }
}

export function getDb() {
  if (!dbPromise) {
    const url = process.env.DATABASE_URL
    if (!url) throw new ConfigError('Database is not configured (DATABASE_URL is missing).')
    dbPromise = (url.startsWith('pglite:') ? createPglite(url.slice('pglite:'.length)) : createNeon(url)).catch(
      (err) => {
        dbPromise = null
        throw err
      }
    )
  }
  return dbPromise
}

export async function query(text, params) {
  const db = await getDb()
  return db.query(text, params)
}

/** For tests: drop the cached connection. */
export async function resetDb() {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null)
    await db?.close?.()
  }
  dbPromise = null
}
