import { motion } from 'framer-motion'
import * as SiIcons from 'react-icons/si'
import { tools } from '../../data/personalDetails'
import styles from './Tools.module.css'

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
        Technologies I've worked with
      </motion.p>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.08 }}
      >
        {tools.map((tool) => {
          const IconComponent = SiIcons[tool.iconKey]
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
