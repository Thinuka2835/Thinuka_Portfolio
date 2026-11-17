// Server-side configuration, read from environment variables at call time
// (so tests can change them). Secrets are only ever read here, on the server.
import { ConfigError } from './errors.js'
import { normalizeAdminPath } from './adminRoute.js'

const env = (name, fallback = '') => (process.env[name] ?? fallback).trim()
const bool = (name) => /^(1|true|yes)$/i.test(env(name))
const int = (name, fallback) => {
  const n = Number.parseInt(env(name), 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** "production" | "preview" | "development" */
export const deploymentEnv = () => env('VERCEL_ENV') || (process.env.NODE_ENV === 'production' ? 'production' : 'development')

// ── Admin route ──────────────────────────────────────────────────────────
/** The configured admin path, or null when unset/invalid (admin UI then unreachable). */
export const adminPath = (raw = process.env.ADMIN_PATH) => normalizeAdminPath(raw)

// ── Sessions ─────────────────────────────────────────────────────────────
export const sessionConfig = () => ({
  ttlHours: int('SESSION_TTL_HOURS', 12), // absolute lifetime
  idleMinutes: int('SESSION_IDLE_MINUTES', 120), // sign out after inactivity
})

/** Extra allowed origins for state-changing requests (the request's own origin is always allowed). */
export const allowedOrigins = () =>
  env('APP_ORIGIN')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)

// ── Cloudinary ───────────────────────────────────────────────────────────
export function cloudinaryConfig({ required = true } = {}) {
  const cfg = {
    cloudName: env('CLOUDINARY_CLOUD_NAME'),
    apiKey: env('CLOUDINARY_API_KEY'),
    apiSecret: env('CLOUDINARY_API_SECRET'),
    folder: env('CLOUDINARY_FOLDER', 'portfolio').replace(/^\/+|\/+$/g, ''),
    maxBytes: int('MEDIA_MAX_BYTES', 10 * 1024 * 1024),
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],
  }
  const configured = Boolean(cfg.cloudName && cfg.apiKey && cfg.apiSecret)
  if (required && !configured) {
    throw new ConfigError('Image uploads are not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET).')
  }
  return { ...cfg, configured }
}

// ── Markdown content store ───────────────────────────────────────────────
export function contentConfig() {
  const token = env('GITHUB_CONTENT_TOKEN')
  const store = env('CONTENT_STORE') || (token ? 'github' : 'fs')
  const branch = env('CONTENT_BRANCH', 'main')
  const productionBranch = env('CONTENT_PRODUCTION_BRANCH', 'main')
  const cfg = {
    store,
    repo: env('GITHUB_CONTENT_REPO'),
    token,
    branch,
    productionBranch,
    dir: env('CONTENT_DIR', 'content').replace(/^\/+|\/+$/g, ''),
    allowDrafts: bool('CONTENT_ALLOW_DRAFTS'),
    writable: true,
    readOnlyReason: null,
  }

  if (store === 'fs' && process.env.VERCEL) {
    cfg.writable = false
    cfg.readOnlyReason =
      'The local filesystem is read-only and temporary on Vercel. Set GITHUB_CONTENT_TOKEN and GITHUB_CONTENT_REPO so edits are committed to GitHub.'
  } else if (store === 'github' && (!cfg.token || !/^[\w.-]+\/[\w.-]+$/.test(cfg.repo))) {
    cfg.writable = false
    cfg.readOnlyReason = 'GitHub content store needs GITHUB_CONTENT_TOKEN and GITHUB_CONTENT_REPO ("owner/name").'
  } else if (
    store === 'github' &&
    deploymentEnv() !== 'production' &&
    branch === productionBranch &&
    !bool('ALLOW_PRODUCTION_CONTENT_WRITES')
  ) {
    // Stops preview deployments / local dev from publishing to the live site by accident
    cfg.writable = false
    cfg.readOnlyReason = `This ${deploymentEnv()} environment would commit to the production branch "${branch}". Set CONTENT_BRANCH to a non-production branch for this environment.`
  } else if (!['fs', 'github'].includes(store)) {
    cfg.writable = false
    cfg.readOnlyReason = `Unknown CONTENT_STORE "${store}" (use "github" or "fs").`
  }
  return cfg
}

// ── Deploys ──────────────────────────────────────────────────────────────
export const deployHookUrl = () => env('VERCEL_DEPLOY_HOOK_URL')
