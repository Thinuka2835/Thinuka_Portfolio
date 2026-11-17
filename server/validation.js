// Request validation schemas (zod). Every write endpoint parses its body
// through one of these before anything reaches the database.
import { z } from 'zod'
import { SOCIAL_PLATFORM_KEYS, validateSocialUrl } from '../shared/socialPlatforms.js'
import { TOOL_ICON_KEYS } from '../shared/toolIcons.js'

const text = (max, { min = 0 } = {}) => z.string().trim().min(min).max(max)
const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === '' || /^https:\/\//i.test(s), 'Must be empty or start with https://')
  .refine((s) => {
    if (s === '') return true
    try {
      new URL(s)
      return true
    } catch {
      return false
    }
  }, 'Not a valid URL')
const uuid = z.string().uuid()

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().max(256),
})

export const profileSchema = z.object({
  name: text(80, { min: 1 }),
  greeting: text(80),
  titleLine1: text(40, { min: 1 }),
  titleHighlight: text(40, { min: 1 }),
  role: text(200),
  bio: text(2000),
  quote: text(300),
  highlightedWord: text(40),
  availability: text(80),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]),
  phone: text(40).regex(/^[+\d\s().-]*$/, 'Digits, spaces and + ( ) - . only'),
  location: text(120),
  resumeUrl: optionalHttpsUrl,
  heroImageId: uuid.nullable(),
})

const sortable = { visible: z.boolean().default(true) }

export const collections = {
  'social-links': {
    table: 'social_links',
    columns: ['platform', 'label', 'url', 'visible'],
    schema: z
      .object({
        platform: z.enum(SOCIAL_PLATFORM_KEYS),
        label: text(60),
        url: z.string().trim().max(500),
        ...sortable,
      })
      .superRefine((v, ctx) => {
        const err = validateSocialUrl(v.platform, v.url)
        if (err) ctx.addIssue({ code: 'custom', path: ['url'], message: err })
      }),
  },
  stats: {
    table: 'stats',
    columns: ['value', 'suffix', 'label', 'visible'],
    schema: z.object({
      value: z.coerce.number().int().min(0).max(1_000_000),
      suffix: text(4),
      label: text(60, { min: 1 }),
      ...sortable,
    }),
  },
  tools: {
    table: 'tools',
    columns: ['name', 'icon_key', 'visible'],
    schema: z.object({ name: text(60, { min: 1 }), iconKey: z.enum(TOOL_ICON_KEYS), ...sortable }),
  },
  ticker: {
    table: 'ticker_items',
    columns: ['label', 'visible'],
    schema: z.object({ label: text(60, { min: 1 }), ...sortable }),
  },
  certifications: {
    table: 'certifications',
    columns: ['title', 'issuer', 'year', 'url', 'image_id', 'visible'],
    schema: z.object({
      title: text(150, { min: 1 }),
      issuer: text(100),
      year: text(10).regex(/^(\d{4})?$/, 'Use a 4-digit year'),
      url: optionalHttpsUrl,
      imageId: uuid.nullable().default(null),
      ...sortable,
    }),
  },
}

export const reorderSchema = z.object({ ids: z.array(uuid).min(1).max(500) })

export const mediaRegisterSchema = z.object({
  upload: z.record(z.string(), z.unknown()),
  alt: text(300).default(''),
})

export const mediaUpdateSchema = z.object({ alt: text(300) })

export const contentSaveSchema = z.object({
  frontmatter: z.record(z.string(), z.unknown()),
  body: z.string().max(200_000),
  expectedSha: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
  previousSlug: z.string().max(80).optional(),
})
