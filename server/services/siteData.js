// Assembles the public site data from Neon (falls back to the defaults in
// src/data/personalDetails.js when no database is configured).
import { defaultProfile, getDefaultSiteData } from '../../shared/siteDefaults.js'
import { isDisplayableSocial } from '../../shared/socialPlatforms.js'
import { isDatabaseConfigured, query } from '../db/client.js'

export const camel = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]))

export const mediaToPublic = (m) =>
  m && { id: m.id, url: m.secure_url ?? m.secureUrl, width: m.width, height: m.height, alt: m.alt }

export async function getProfile() {
  const [row] = await query(`select value from site_settings where key = 'profile'`)
  return { ...defaultProfile, ...(row?.value || {}) }
}

export async function getPublicSiteData() {
  if (!isDatabaseConfigured()) return getDefaultSiteData()

  const visible = (table, cols) =>
    query(`select ${cols} from ${table} where visible = true order by sort_order, created_at`)

  const [profile, socialLinks, stats, tools, ticker, certifications] = await Promise.all([
    getProfile(),
    visible('social_links', 'id, platform, label, url, visible'),
    visible('stats', 'id, value, suffix, label'),
    visible('tools', 'id, name, icon_key'),
    visible('ticker_items', 'id, label'),
    query(`select c.id, c.title, c.issuer, c.year, c.url,
                  m.id as m_id, m.secure_url, m.width, m.height, m.alt
             from certifications c left join media m on m.id = c.image_id
            where c.visible = true order by c.sort_order, c.created_at`),
  ])

  let heroImage = null
  if (profile.heroImageId) {
    const [m] = await query(`select id, secure_url, width, height, alt from media where id = $1`, [profile.heroImageId])
    heroImage = mediaToPublic(m) || null
  }

  return {
    source: 'database',
    profile: { ...profile, heroImage },
    socialLinks: socialLinks.filter(isDisplayableSocial).map(({ id, platform, label, url }) => ({ id, platform, label, url })),
    stats,
    tools: tools.map(camel),
    ticker,
    certifications: certifications.map((c) => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      year: c.year,
      url: c.url,
      image: c.m_id ? { id: c.m_id, url: c.secure_url, width: c.width, height: c.height, alt: c.alt } : null,
    })),
  }
}
