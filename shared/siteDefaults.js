// Converts the default content in src/data/personalDetails.js into the same
// shape the public API returns, so the site renders identically with or
// without a database.
import { personal, socialLinks, ticker, tools, stats, gallery } from '../src/data/personalDetails.js'

const withIds = (prefix, items) => items.map((item, i) => ({ id: `${prefix}-${i + 1}`, ...item }))

export const defaultProfile = {
  name: personal.name,
  greeting: personal.greeting,
  titleLine1: personal.titleLine1,
  titleHighlight: personal.titleHighlight,
  role: personal.role,
  bio: personal.bio,
  quote: personal.quote,
  highlightedWord: personal.highlightedWord,
  availability: personal.availability,
  email: personal.email,
  phone: personal.phone,
  location: personal.location,
  resumeUrl: personal.resumeUrl,
  heroImageId: null,
}

export function getDefaultSiteData() {
  return {
    source: 'defaults',
    profile: { ...defaultProfile, heroImage: null },
    socialLinks: withIds('social', socialLinks.map((s) => ({ label: '', ...s }))),
    stats: withIds('stat', stats),
    tools: withIds('tool', tools),
    ticker: withIds('ticker', ticker.map((label) => ({ label }))),
    certifications: withIds('cert', gallery.map((g) => ({ url: '', image: null, ...g }))),
  }
}

/** Raw defaults used by `npm run db:seed`. */
export const seedData = { personal, socialLinks, ticker, tools, stats, gallery }
