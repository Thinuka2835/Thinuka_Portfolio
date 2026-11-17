import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate, useReducedMotion } from 'framer-motion'
import { useSiteData } from '../../lib/siteData'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import styles from './Stats.module.css'

function Counter({ value, suffix }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const controls = animate(0, value, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value, reduceMotion])

  return (
    <span ref={ref} className={styles.number}>
      {/* Screen readers get the final value, not every animation frame */}
      <span aria-hidden="true">{reduceMotion ? value : display}{suffix}</span>
      <span className="visually-hidden">{value}{suffix}</span>
    </span>
  )
}

export default function Stats() {
  const { stats } = useSiteData()
  if (!stats.length) return null
  return (
    <section className={`section section--alt ${styles.stats}`} aria-label="Career highlights">
      <motion.ul className={`container ${styles.grid}`} variants={stagger(0.1)} {...revealOnView}>
        {stats.map((stat) => (
          <motion.li key={stat.id} className={styles.card} variants={fadeUp}>
            <Counter value={stat.value} suffix={stat.suffix} />
            <span className={styles.label}>{stat.label}</span>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}
