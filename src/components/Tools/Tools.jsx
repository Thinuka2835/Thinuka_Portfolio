import { FiTool } from 'react-icons/fi'
import {
  SiJira, SiConfluence, SiTrello, SiAsana, SiSlack, SiNotion, SiMiro, SiClickup,
  SiGithub, SiGitlab, SiFigma, SiGooglesheets, SiGoogledrive, SiGooglecalendar,
  SiAirtable, SiLinear, SiZoom, SiBasecamp,
} from 'react-icons/si'
import { useSiteData } from '../../lib/siteData'
import { Eyebrow, Reveal } from '../Motion/Motion'
import styles from './Tools.module.css'

// Every key in shared/toolIcons.js must be imported BY NAME and listed here
// (a test enforces it). Never `import * as SiIcons` — it defeats tree-shaking
// and once bloated the bundle to 5MB+.
const ICONS = {
  SiJira, SiConfluence, SiTrello, SiAsana, SiSlack, SiNotion, SiMiro, SiClickup,
  SiGithub, SiGitlab, SiFigma, SiGooglesheets, SiGoogledrive, SiGooglecalendar,
  SiAirtable, SiLinear, SiZoom, SiBasecamp,
}

/** Toolkit as a numbered list (rendered in the About section's right column). */
export default function Tools() {
  const { tools } = useSiteData()
  if (!tools.length) return null
  return (
    <div>
      <Eyebrow className={styles.eyebrow}>Tools & Platforms I Use</Eyebrow>
      <ul className={styles.list}>
        {tools.map((tool, i) => {
          const Icon = ICONS[tool.iconKey] ?? FiTool
          return (
            <Reveal as="li" key={tool.id} className={styles.item} delay={i * 90} dur={560}>
              <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.name}>{tool.name}</span>
              <Icon className={styles.icon} aria-hidden="true" />
            </Reveal>
          )
        })}
      </ul>
    </div>
  )
}
