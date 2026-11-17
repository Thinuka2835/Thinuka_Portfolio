import { motion } from 'framer-motion'
import { FiTool } from 'react-icons/fi'
import {
  SiJira, SiConfluence, SiTrello, SiAsana, SiSlack, SiNotion, SiMiro, SiClickup,
  SiGithub, SiGitlab, SiFigma, SiGooglesheets, SiGoogledrive, SiGooglecalendar,
  SiAirtable, SiLinear, SiZoom, SiBasecamp,
} from 'react-icons/si'
import { useSiteData } from '../../lib/siteData'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import SectionHeader from '../SectionHeader/SectionHeader'
import styles from './Tools.module.css'

// Every key in shared/toolIcons.js must be imported BY NAME and listed here
// (a test enforces it). Never `import * as SiIcons` — it defeats tree-shaking
// and once bloated the bundle to 5MB+.
const ICONS = {
  SiJira, SiConfluence, SiTrello, SiAsana, SiSlack, SiNotion, SiMiro, SiClickup,
  SiGithub, SiGitlab, SiFigma, SiGooglesheets, SiGoogledrive, SiGooglecalendar,
  SiAirtable, SiLinear, SiZoom, SiBasecamp,
}

export default function Tools() {
  const { tools } = useSiteData()
  if (!tools.length) return null
  return (
    <section id="tools" className="section" aria-labelledby="tools-title">
      <div className="container">
        <SectionHeader
          id="tools-title"
          eyebrow="Toolkit"
          title="Tools & platforms I use"
          intro="The stack I rely on to plan work, keep teams aligned and ship on schedule."
        />
        <motion.ul className={styles.grid} variants={stagger(0.06)} {...revealOnView}>
          {tools.map((tool) => {
            const Icon = ICONS[tool.iconKey] ?? FiTool
            return (
              <motion.li key={tool.id} className={styles.card} variants={fadeUp}>
                <Icon className={styles.icon} aria-hidden="true" />
                <span className={styles.name}>{tool.name}</span>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </section>
  )
}
