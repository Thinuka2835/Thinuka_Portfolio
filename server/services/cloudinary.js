// Cloudinary signed uploads without the SDK.
//
// Flow: admin asks the server for signed params → browser uploads the file
// straight to Cloudinary (with progress) → browser hands Cloudinary's JSON
// response back → server verifies Cloudinary's signature on that response
// before trusting any of it. The API secret never leaves the server.
import { createHash } from 'node:crypto'
import { cloudinaryConfig } from '../config.js'
import { badRequest, HttpError } from '../errors.js'

const sha1 = (s) => createHash('sha1').update(s).digest('hex')

/** Cloudinary's signature: sha1 of sorted "key=value" pairs joined with "&", plus the secret. */
export function signParams(params, apiSecret) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(',') : params[k]}`)
    .join('&')
  return sha1(toSign + apiSecret)
}

/** Signed params for a new upload (into the configured folder) or a replacement. */
export function createUploadSignature({ replacePublicId } = {}) {
  const cfg = cloudinaryConfig()
  const params = {
    timestamp: Math.floor(Date.now() / 1000),
    allowed_formats: cfg.allowedFormats.join(','),
  }
  if (replacePublicId) {
    Object.assign(params, { public_id: replacePublicId, overwrite: 'true', invalidate: 'true' })
  } else {
    params.folder = cfg.folder
  }
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    apiKey: cfg.apiKey,
    params,
    signature: signParams(params, cfg.apiSecret),
    maxBytes: cfg.maxBytes,
    allowedFormats: cfg.allowedFormats,
  }
}

/**
 * Validate an upload response the browser received from Cloudinary.
 * Returns the trusted fields, or throws.
 */
export function verifyUploadResponse(upload, { expectPublicId } = {}) {
  const cfg = cloudinaryConfig()
  if (!upload || typeof upload !== 'object') throw badRequest('Missing upload result.')
  const { public_id: publicId, version, signature } = upload
  if (typeof publicId !== 'string' || !version || typeof signature !== 'string') {
    throw badRequest('Upload result is incomplete.')
  }
  // Cloudinary signs public_id + version in every upload response
  const expected = signParams({ public_id: publicId, version }, cfg.apiSecret)
  if (expected !== signature) throw new HttpError(400, 'invalid_signature', 'Upload could not be verified.')

  if (expectPublicId ? publicId !== expectPublicId : !publicId.startsWith(`${cfg.folder}/`)) {
    throw badRequest('Upload was stored in an unexpected location.')
  }
  const format = String(upload.format || '').toLowerCase()
  const problems = []
  if (upload.resource_type !== 'image') problems.push('Only images can be uploaded.')
  if (!cfg.allowedFormats.includes(format)) problems.push(`Unsupported format "${format}".`)
  if (!(upload.bytes > 0) || upload.bytes > cfg.maxBytes) {
    problems.push(`Images must be under ${Math.round(cfg.maxBytes / 1024 / 1024)} MB.`)
  }
  if (!Number.isInteger(upload.width) || !Number.isInteger(upload.height)) problems.push('Missing image dimensions.')
  if (typeof upload.secure_url !== 'string' || !upload.secure_url.startsWith('https://res.cloudinary.com/')) {
    problems.push('Unexpected image URL.')
  }

  return {
    problems,
    publicId,
    version: Number(version),
    secureUrl: upload.secure_url,
    format,
    width: upload.width,
    height: upload.height,
    bytes: upload.bytes,
    originalFilename: typeof upload.original_filename === 'string' ? upload.original_filename.slice(0, 200) : null,
  }
}

/** Delete an asset from Cloudinary. Resolves to "ok" or "not found"; throws otherwise. */
export async function destroyAsset(publicId) {
  const cfg = cloudinaryConfig()
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' }
  const body = new URLSearchParams({ ...params, api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) })
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`, { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !['ok', 'not found'].includes(json.result)) {
    throw new HttpError(502, 'cloudinary_error', `Cloudinary could not delete the image (${json.error?.message || json.result || res.status}).`)
  }
  return json.result
}
