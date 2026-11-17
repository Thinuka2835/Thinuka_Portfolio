import { motion } from 'framer-motion'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import styles from './SectionHeader.module.css'

/** Consistent eyebrow + heading + intro used by every section. */
export default function SectionHeader({ id, eyebrow, title, intro, align = 'center' }) {
  return (
    <motion.header
      className={`${styles.header} ${align === 'left' ? styles.left : ''}`}
      variants={stagger(0.08)}
      {...revealOnView}
    >
      {eyebrow && (
        <motion.p className={styles.eyebrow} variants={fadeUp}>
          <span className={styles.bar} aria-hidden="true" />
          {eyebrow}
        </motion.p>
      )}
      <motion.h2 id={id} className={styles.title} variants={fadeUp}>
        {title}
      </motion.h2>
      {intro && (
        <motion.p className={styles.intro} variants={fadeUp}>
          {intro}
        </motion.p>
      )}
    </motion.header>
  )
}
