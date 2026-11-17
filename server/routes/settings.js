import { Hono } from 'hono'
import { query } from '../db/client.js'
import { badRequest } from '../errors.js'
import { getProfile } from '../services/siteData.js'
import { profileSchema } from '../validation.js'
import { parse, readJson } from './helpers.js'

export const settingsRoutes = new Hono()

settingsRoutes.get('/profile', async (c) => c.json({ profile: await getProfile() }))

settingsRoutes.put('/profile', async (c) => {
  const profile = parse(profileSchema, await readJson(c))
  if (profile.heroImageId) {
    const [m] = await query(`select id from media where id = $1`, [profile.heroImageId])
    if (!m) throw badRequest('Please fix the highlighted fields.', { fields: { heroImageId: 'That image no longer exists.' } })
  }
  await query(
    `insert into site_settings (key, value, updated_by, updated_at) values ('profile', $1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [JSON.stringify(profile), c.get('admin').id]
  )
  return c.json({ profile })
})
