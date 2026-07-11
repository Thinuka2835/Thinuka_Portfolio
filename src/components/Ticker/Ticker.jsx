import { motion } from 'framer-motion'
import { ticker } from '../../data/personalDetails'
import styles from './Ticker.module.css'

export default function Ticker() {
  // Duplicate items for seamless infinite scroll
  const items = [...ticker, ...ticker]

  return (
    <div className={styles.tickerSection} aria-label="Skills ticker">
      <div className={styles.tickerTrack}>
        {items.map((item, i) => (
          <span key={i} className={styles.tickerItem}>
            {item}
            <span className={styles.separator}>+</span>
          </span>
        ))}
      </div>
    </div>
  )
}
