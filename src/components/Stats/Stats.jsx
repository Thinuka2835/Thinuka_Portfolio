import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'
import { stats } from '../../data/personalDetails'
import styles from './Stats.module.css'

function Counter({ value, suffix }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, value])

  return (
    <span ref={ref} className={styles.number}>
      {display}{suffix}
    </span>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function Stats() {
  return (
    <section className={styles.stats}>
      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.1 }}
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} className={styles.card} variants={fadeUp}>
            <Counter value={stat.value} suffix={stat.suffix} />
            <span className={styles.label}>{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
