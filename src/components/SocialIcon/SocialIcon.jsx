import { FiFacebook, FiGithub, FiGlobe, FiInstagram, FiLinkedin, FiYoutube } from 'react-icons/fi'
import { FaXTwitter } from 'react-icons/fa6'
import { SiBehance, SiDribbble, SiMedium } from 'react-icons/si'
import { SOCIAL_PLATFORMS } from '../../../shared/socialPlatforms.js'

// Imported by name (tree-shaken) — add new platforms here and in shared/socialPlatforms.js
const ICONS = {
  github: FiGithub,
  linkedin: FiLinkedin,
  x: FaXTwitter,
  instagram: FiInstagram,
  facebook: FiFacebook,
  youtube: FiYoutube,
  medium: SiMedium,
  behance: SiBehance,
  dribbble: SiDribbble,
  website: FiGlobe,
}

export const socialLabel = (link) => link.label || SOCIAL_PLATFORMS[link.platform]?.label || 'Profile'

export default function SocialIcon({ platform, ...props }) {
  const Icon = ICONS[platform] || FiGlobe
  return <Icon aria-hidden="true" {...props} />
}
