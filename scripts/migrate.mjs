#!/usr/bin/env node
// Apply pending database migrations.
//   npm run db:migrate                 → requires DATABASE_URL
//   node scripts/migrate.mjs --if-configured   (used by the Vercel build: skips when DATABASE_URL is unset)
import { migrate } from '../server/db/migrate.js'
import { resetDb } from '../server/db/client.js'

const ifConfigured = process.argv.includes('--if-configured')
const url = process.env.DATABASE_URL

if (!url) {
  if (ifConfigured) {
    console.warn('[migrate] DATABASE_URL is not set — skipping migrations (the site will use default content).')
    process.exit(0)
  }
  console.error('[migrate] DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

// Optional safety net: refuse to migrate a protected (production) database
// from a non-production deployment. Set PRODUCTION_DATABASE_HOST in your
// Preview/Development environments to your production Neon host.
const env = process.env.VERCEL_ENV || 'development'
const protectedHost = (process.env.PRODUCTION_DATABASE_HOST || '').trim()
if (!url.startsWith('pglite:') && protectedHost && env !== 'production') {
  const host = new URL(url).hostname
  if (host === protectedHost) {
    console.error(`[migrate] Refusing to migrate the production database (${host}) from a ${env} environment.`)
    process.exit(1)
  }
}

const target = url.startsWith('pglite:') ? url : new URL(url).hostname
console.log(`[migrate] ${env} → ${target}`)
try {
  const applied = await migrate({ log: (m) => console.log(`[migrate] ${m}`) })
  console.log(applied.length ? `[migrate] applied ${applied.length} migration(s).` : '[migrate] database is up to date.')
} catch (err) {
  console.error(`[migrate] ${err.message}`)
  process.exitCode = 1
} finally {
  await resetDb()
}
