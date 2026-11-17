// Responsive delivery helpers for Cloudinary image URLs (no SDK needed).
// Works on any `https://res.cloudinary.com/<cloud>/image/upload/...` URL.

const UPLOAD_SEGMENT = '/image/upload/'

export const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.startsWith('https://res.cloudinary.com/') && url.includes(UPLOAD_SEGMENT)

/**
 * Insert a transformation into a Cloudinary delivery URL.
 * Always adds f_auto (best format per browser) and q_auto (smart compression).
 */
export function cldUrl(url, { width, height, crop = 'limit', gravity } = {}) {
  if (!isCloudinaryUrl(url)) return url
  const parts = ['f_auto', 'q_auto']
  if (crop) parts.push(`c_${crop}`)
  if (gravity) parts.push(`g_${gravity}`)
  if (width) parts.push(`w_${Math.round(width)}`)
  if (height) parts.push(`h_${Math.round(height)}`)
  const [head, tail] = url.split(UPLOAD_SEGMENT)
  return `${head}${UPLOAD_SEGMENT}${parts.join(',')}/${tail}`
}

/** srcset string for the given widths (never upscales past the original width). */
export function cldSrcSet(url, widths, opts = {}) {
  if (!isCloudinaryUrl(url)) return undefined
  const max = opts.maxWidth || Infinity
  const ws = [...new Set(widths.map((w) => Math.min(w, max)))]
  return ws
    .map((w) => {
      const h = opts.aspectRatio ? Math.round(w / opts.aspectRatio) : undefined
      return `${cldUrl(url, { ...opts, width: w, height: h })} ${w}w`
    })
    .join(', ')
}
