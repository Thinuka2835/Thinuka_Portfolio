// Versioned migrations: every db/migrations/NNNN_name.sql file is applied
// once, in order, inside a transaction, and recorded in schema_migrations.
// Never edit a migration that has been applied anywhere — add a new file.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDb } from './client.js'

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations')
const LOCK_ID = 727274 // arbitrary constant for pg_advisory_lock

export async function listMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f)).sort()
  return files.map((file) => ({ version: file.slice(0, 4), file, fullPath: path.join(MIGRATIONS_DIR, file) }))
}

/** Apply pending migrations. Returns the list of versions applied. */
export async function migrate({ log = () => {} } = {}) {
  const db = await getDb()
  const migrations = await listMigrations()

  return db.withClient(async (client) => {
    await client.exec(`create table if not exists schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    )`)
    // Prevent two concurrent deploys from migrating at the same time (Neon)
    if (db.kind === 'neon') await client.query('select pg_advisory_lock($1)', [LOCK_ID])

    try {
      const applied = new Set((await client.query('select version from schema_migrations')).map((r) => r.version))
      const done = []
      for (const m of migrations) {
        if (applied.has(m.version)) continue
        const sql = await readFile(m.fullPath, 'utf8')
        log(`→ applying ${m.file}`)
        await client.exec('begin')
        try {
          await client.exec(sql)
          await client.query('insert into schema_migrations (version, name) values ($1, $2)', [m.version, m.file])
          await client.exec('commit')
        } catch (err) {
          await client.exec('rollback')
          throw new Error(`Migration ${m.file} failed: ${err.message}`, { cause: err })
        }
        done.push(m.version)
      }
      return done
    } finally {
      if (db.kind === 'neon') await client.query('select pg_advisory_unlock($1)', [LOCK_ID])
    }
  })
}
