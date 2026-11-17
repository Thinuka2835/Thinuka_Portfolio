import { Hono } from 'hono'
import { cloudinaryConfig, contentConfig, deployHookUrl, deploymentEnv } from '../config.js'
import { query } from '../db/client.js'
import { ConfigError, HttpError } from '../errors.js'

export const statusRoutes = new Hono()

// What's configured — booleans and non-secret identifiers only.
statusRoutes.get('/status', async (c) => {
  const content = contentConfig()
  const cloud = cloudinaryConfig({ required: false })
  const [{ migrations }] = await query(`select count(*)::int as migrations from schema_migrations`)
  const counts = await query(
    `select (select count(*)::int from media) as media,
            (select count(*)::int from certifications) as certifications,
            (select count(*)::int from social_links where visible) as social_links`
  )
  return c.json({
    environment: deploymentEnv(),
    database: { connected: true, migrations },
    cloudinary: { configured: cloud.configured, folder: cloud.folder, maxBytes: cloud.maxBytes },
    content: {
      store: content.store,
      repo: content.store === 'github' ? content.repo : null,
      branch: content.store === 'github' ? content.branch : null,
      writable: content.writable,
      readOnlyReason: content.readOnlyReason,
      allowDrafts: content.allowDrafts,
    },
    emailjs: {
      configured: Boolean(process.env.VITE_EMAILJS_SERVICE_ID && process.env.VITE_EMAILJS_TEMPLATE_ID && process.env.VITE_EMAILJS_PUBLIC_KEY),
      captcha: Boolean(process.env.VITE_RECAPTCHA_SITE_KEY),
    },
    deployHook: Boolean(deployHookUrl()),
    counts: counts[0],
  })
})

// Rebuild the site (refreshes baked-in data and Open Graph tags after settings changes)
statusRoutes.post('/deploy', async (c) => {
  const url = deployHookUrl()
  if (!url) throw new ConfigError('No deploy hook configured (VERCEL_DEPLOY_HOOK_URL).')
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) throw new HttpError(502, 'deploy_failed', `Vercel rejected the deploy hook (${res.status}).`)
  return c.json({ ok: true })
})
