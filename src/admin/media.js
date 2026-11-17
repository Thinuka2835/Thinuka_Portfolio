// Direct-to-Cloudinary uploads with progress:
//   1. ask our server for signed params (only admins can)
//   2. upload the file straight to Cloudinary (XHR for progress events)
//   3. hand Cloudinary's response to our server, which verifies its signature
//      and stores the reference in Neon
import { post } from './api'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
const DEFAULT_MAX = 10 * 1024 * 1024

/** Client-side pre-check (the server and Cloudinary enforce this again). */
export function checkFile(file, maxBytes = DEFAULT_MAX) {
  if (!ACCEPTED_TYPES.includes(file.type)) return `“${file.name}” isn’t a supported image (JPG, PNG, WebP, AVIF or GIF).`
  if (file.size > maxBytes) return `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`
  return null
}

function uploadToCloudinary(file, signed, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', signed.apiKey)
    form.append('signature', signed.signature)
    for (const [k, v] of Object.entries(signed.params)) form.append(k, String(v))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', signed.uploadUrl)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.public_id) resolve(xhr.response)
      else reject(new Error(xhr.response?.error?.message || `Cloudinary rejected the upload (${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Upload failed — check your connection.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(form)
  })
}

/** Upload a new image (or replace an existing one) and return the stored media item. */
export async function uploadImage(file, { alt = '', replaceId, onProgress, signal } = {}) {
  const pre = checkFile(file)
  if (pre) throw new Error(pre)
  const signed = await post('/media/sign', replaceId ? { replaceId } : {})
  const sized = checkFile(file, signed.maxBytes)
  if (sized) throw new Error(sized)
  onProgress?.(0)
  const upload = await uploadToCloudinary(file, signed, onProgress, signal)
  const { item } = await post(replaceId ? `/media/${replaceId}/replace` : '/media', { upload, alt })
  return item
}

/** Thumbnail URL for the admin grid. */
export const thumb = (url, w = 400) =>
  url?.includes('/image/upload/') ? url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_fill,w_${w},h_${Math.round(w * 0.75)}/`) : url
