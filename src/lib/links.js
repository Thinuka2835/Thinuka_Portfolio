/** True when a URL from personalDetails.js has actually been filled in. */
export const hasLink = (url) => typeof url === 'string' && url.trim() !== '' && url.trim() !== '#'

/** True for links that leave the site (these open in a new tab). */
export const isExternal = (url) => /^https?:\/\//i.test(url)

/** Spread onto an <a> to open external links safely in a new tab. */
export const externalProps = (url) =>
  isExternal(url) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
