import { Hono } from 'hono'
import { query } from '../db/client.js'
import { badRequest, conflict, notFound, HttpError } from '../errors.js'
import { createUploadSignature, destroyAsset, verifyUploadResponse } from '../services/cloudinary.js'
import { getContentStore } from '../services/contentStore.js'
import { getProfile, camel } from '../services/siteData.js'
import { cloudinaryConfig } from '../config.js'
import { mediaRegisterSchema, mediaUpdateSchema } from '../validation.js'
import { parse, readJson } from './helpers.js'

export const mediaRoutes = new Hono()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function loadMedia(id) {
  if (!UUID_RE.test(id)) throw notFound('Image not found.')
  const [row] = await query(`select * from media where id = $1`, [id])
  if (!row) throw notFound('Image not found.')
  return row
}

/**
 * Each environment may only overwrite/delete images in its own Cloudinary
 * folder. A preview deployment's database branch contains production's media
 * rows; without this check, deleting there would destroy production images.
 */
function assertManagedHere(media) {
  const { folder } = cloudinaryConfig()
  if (!media.public_id.startsWith(`${folder}/`)) {
    throw conflict(
      `This image lives in another environment’s Cloudinary folder (“${media.public_id.split('/')[0]}”), so it can’t be replaced or deleted from here.`
    )
  }
}

/** Everywhere an image is referenced. Throws if Markdown content can't be checked. */
export async function findMediaUsage(media) {
  const usages = []
  const certs = await query(`select id, title from certifications where image_id = $1`, [media.id])
  for (const cert of certs) usages.push({ kind: 'certification', label: `Certification: ${cert.title}` })

  const profile = await getProfile()
  if (profile.heroImageId === media.id) usages.push({ kind: 'profile', label: 'Profile: hero photo' })

  let entries
  try {
    entries = await getContentStore().list()
  } catch (err) {
    throw new HttpError(503, 'usage_unknown', `Couldn’t check Markdown content for this image, so it wasn’t deleted. (${err.message})`)
  }
  for (const e of entries) {
    if (e.markdown.includes(media.public_id)) usages.push({ kind: 'content', label: `Content: ${e.type}/${e.slug}` })
  }
  return usages
}

mediaRoutes.get('/', async (c) => {
  const rows = await query(`select * from media order by created_at desc`)
  return c.json({ items: rows.map(camel) })
})

// 1) Signed parameters for a direct browser → Cloudinary upload
mediaRoutes.post('/sign', async (c) => {
  const body = await readJson(c)
  if (body?.replaceId) {
    const media = await loadMedia(body.replaceId)
    assertManagedHere(media)
    return c.json(createUploadSignature({ replacePublicId: media.public_id }))
  }
  return c.json(createUploadSignature())
})

// 2) Register a finished upload after verifying Cloudinary's signature
mediaRoutes.post('/', async (c) => {
  const { upload, alt } = parse(mediaRegisterSchema, await readJson(c))
  const v = verifyUploadResponse(upload)
  if (v.problems.length) {
    await destroyAsset(v.publicId).catch(() => {}) // don't keep rejected files around
    throw badRequest(v.problems.join(' '))
  }
  const [row] = await query(
    `insert into media (public_id, version, secure_url, format, width, height, bytes, alt, original_filename, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (public_id) do update set version = excluded.version, secure_url = excluded.secure_url,
       format = excluded.format, width = excluded.width, height = excluded.height, bytes = excluded.bytes, updated_at = now()
     returning *`,
    [v.publicId, v.version, v.secureUrl, v.format, v.width, v.height, v.bytes, alt, v.originalFilename, c.get('admin').id]
  )
  return c.json({ item: camel(row) }, 201)
})

// Replace the file behind an existing image (same public ID, so every reference keeps working)
mediaRoutes.post('/:id/replace', async (c) => {
  const media = await loadMedia(c.req.param('id'))
  assertManagedHere(media)
  const { upload } = parse(mediaRegisterSchema, await readJson(c))
  const v = verifyUploadResponse(upload, { expectPublicId: media.public_id })
  if (v.problems.length) throw badRequest(`${v.problems.join(' ')} The previous version may have been overwritten — upload a valid image to restore it.`)
  const [row] = await query(
    `update media set version = $1, secure_url = $2, format = $3, width = $4, height = $5, bytes = $6, updated_at = now()
     where id = $7 returning *`,
    [v.version, v.secureUrl, v.format, v.width, v.height, v.bytes, media.id]
  )
  return c.json({ item: camel(row) })
})

mediaRoutes.patch('/:id', async (c) => {
  const media = await loadMedia(c.req.param('id'))
  const { alt } = parse(mediaUpdateSchema, await readJson(c))
  const [row] = await query(`update media set alt = $1, updated_at = now() where id = $2 returning *`, [alt, media.id])
  return c.json({ item: camel(row) })
})

mediaRoutes.get('/:id/usage', async (c) => {
  const media = await loadMedia(c.req.param('id'))
  return c.json({ usages: await findMediaUsage(media) })
})

mediaRoutes.delete('/:id', async (c) => {
  const media = await loadMedia(c.req.param('id'))
  assertManagedHere(media)
  const usages = await findMediaUsage(media)
  if (usages.length) throw conflict('This image is still in use. Remove it from these places first.', { usages })
  await destroyAsset(media.public_id) // throws (and keeps the record) if Cloudinary fails
  await query(`delete from media where id = $1`, [media.id])
  return c.json({ ok: true })
})
