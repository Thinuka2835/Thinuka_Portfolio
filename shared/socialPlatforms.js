// Social platforms the site knows how to label and draw an icon for.
// URLs are never invented: a profile only appears once an admin saves a valid URL.
export const SOCIAL_PLATFORMS = {
  github:    { label: 'GitHub',     hosts: ['github.com'] },
  linkedin:  { label: 'LinkedIn',   hosts: ['linkedin.com'] },
  x:         { label: 'X (Twitter)', hosts: ['x.com', 'twitter.com'] },
  instagram: { label: 'Instagram',  hosts: ['instagram.com'] },
  facebook:  { label: 'Facebook',   hosts: ['facebook.com'] },
  youtube:   { label: 'YouTube',    hosts: ['youtube.com', 'youtu.be'] },
  medium:    { label: 'Medium',     hosts: ['medium.com'] },
  behance:   { label: 'Behance',    hosts: ['behance.net'] },
  dribbble:  { label: 'Dribbble',   hosts: ['dribbble.com'] },
  website:   { label: 'Website',    hosts: null }, // any https URL
}

export const SOCIAL_PLATFORM_KEYS = Object.keys(SOCIAL_PLATFORMS)

/** Returns an error message, or null when `url` is a valid https URL for `platform`. */
export function validateSocialUrl(platform, url) {
  const def = SOCIAL_PLATFORMS[platform]
  if (!def) return 'Unknown platform'
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return 'Enter a full URL, e.g. https://…'
  }
  if (parsed.protocol !== 'https:') return 'URL must start with https://'
  if (def.hosts) {
    const host = parsed.hostname.replace(/^www\./, '')
    const ok = def.hosts.some((h) => host === h || host.endsWith(`.${h}`))
    if (!ok) return `URL must be on ${def.hosts.join(' or ')}`
  }
  return null
}

/** True when a social link should be shown publicly. */
export const isDisplayableSocial = (link) =>
  Boolean(link && link.visible !== false && link.url && validateSocialUrl(link.platform, link.url) === null)
