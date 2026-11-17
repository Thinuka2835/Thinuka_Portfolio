#!/usr/bin/env node
// Copy the default content from src/data/personalDetails.js into an empty
// database. Idempotent: tables that already have rows are left untouched.
import { query, resetDb } from '../server/db/client.js'
import { defaultProfile, seedData } from '../shared/siteDefaults.js'

if (!process.env.DATABASE_URL) {
  console.error('[seed] DATABASE_URL is not set.')
  process.exit(1)
}

async function seedTable(table, columns, rows) {
  const [{ count }] = await query(`select count(*)::int as count from ${table}`)
  if (count > 0) return console.log(`[seed] ${table}: has ${count} row(s), skipped`)
  for (const [i, row] of rows.entries()) {
    const placeholders = columns.map((_, j) => `$${j + 1}`).join(', ')
    await query(`insert into ${table} (${columns.join(', ')}, sort_order) values (${placeholders}, $${columns.length + 1})`, [
      ...columns.map((c) => row[c]),
      i,
    ])
  }
  console.log(`[seed] ${table}: inserted ${rows.length}`)
}

try {
  const [existing] = await query(`select key from site_settings where key = 'profile'`)
  if (existing) console.log('[seed] profile: exists, skipped')
  else {
    await query(`insert into site_settings (key, value) values ('profile', $1)`, [JSON.stringify(defaultProfile)])
    console.log('[seed] profile: inserted')
  }

  await seedTable('social_links', ['platform', 'label', 'url'], seedData.socialLinks.map((s) => ({ label: '', ...s })))
  await seedTable('stats', ['value', 'suffix', 'label'], seedData.stats)
  await seedTable('tools', ['name', 'icon_key'], seedData.tools.map((t) => ({ name: t.name, icon_key: t.iconKey })))
  await seedTable('ticker_items', ['label'], seedData.ticker.map((label) => ({ label })))
  await seedTable('certifications', ['title', 'issuer', 'year'], seedData.gallery)
} catch (err) {
  console.error(`[seed] ${err.message}`)
  if (/relation .* does not exist/.test(err.message)) console.error('[seed] Run `npm run db:migrate` first.')
  process.exitCode = 1
} finally {
  await resetDb()
}
