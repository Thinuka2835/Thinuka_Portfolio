import { ticker } from '../../data/personalDetails'
import styles from './Ticker.module.css'

function Group({ hidden }) {
  return (
    <ul className={styles.group} aria-hidden={hidden || undefined}>
      {ticker.map((item) => (
        <li key={item} className={styles.item}>
          {item}
          <span className={styles.separator} aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  )
}

export default function Ticker() {
  // Two identical groups translate by -50% for a seamless loop; the copy is hidden from screen readers.
  return (
    <section className={styles.ticker} aria-label="Core skills">
      <div className={styles.track}>
        <Group />
        <Group hidden />
      </div>
    </section>
  )
}
