import { motion } from 'framer-motion'
import {
  SiJira, SiConfluence, SiTrello, SiAsana,
  SiSlack, SiNotion, SiMiro, SiClickup,
} from 'react-icons/si'
import { tools } from '../../data/personalDetails'
import styles from './Tools.module.css'

// Add new icons here (and to the import above) when adding tools with a new iconKey in personalDetails.js
const ICONS = {
  SiJira, SiConfluence, SiTrello, SiAsana,
  SiSlack, SiNotion, SiMiro, SiClickup,
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function Tools() {
  return (
    <section id="tools" className={styles.tools}>
      <motion.p
        className={styles.label}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Tools & Platforms I Use
      </motion.p>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.08 }}
      >
        {tools.map((tool) => {
          const IconComponent = ICONS[tool.iconKey]
          return (
            <motion.div
              key={tool.name}
              className={styles.card}
              variants={fadeUp}
              whileHover={{ scale: 1.04 }}
            >
              {IconComponent
                ? <IconComponent className={styles.icon} />
                : <span className={styles.icon}>⚙️</span>
              }
              <span className={styles.toolName}>{tool.name}</span>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
