// Home-page sections shown in the header and footer. `id` must match a section's id.
// (The admin panel is intentionally never linked from public navigation.)
import { useSiteData } from '../lib/siteData'
import { entriesOfType } from '../lib/content'

export const navLinks = [
  { id: 'about',    label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'impact',   label: 'Impact' },
  { id: 'gallery',  label: 'Certifications' },
  { id: 'contact',  label: 'Contact' },
]

/** Nav links for sections that actually have content (empty sections aren't rendered). */
export function useNavLinks() {
  const { stats, certifications } = useSiteData()
  const hasContent = {
    projects: entriesOfType('projects').length > 0,
    impact: stats.length > 0,
    gallery: certifications.length > 0,
  }
  return navLinks.filter((l) => hasContent[l.id] ?? true)
}
