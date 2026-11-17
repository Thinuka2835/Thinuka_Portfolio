import { useSiteData } from '../../lib/siteData'
import styles from './Ticker.module.css'

function Group({ items, hidden }) {
  return (
    <ul className={styles.group} aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          {item.label}
          <span className={styles.dot} aria-hidden="true" />
        </li>
      ))}
    </ul>
  )
}

/** Infinite marquee of skills: the list is rendered twice and slides -50% in 22s. */
export default function Ticker() {
  const { ticker } = useSiteData()
  if (!ticker.length) return null
  return (
    <section className={styles.marquee} aria-label="Core skills">
      <div className={styles.track}>
        <Group items={ticker} />
        <Group items={ticker} hidden />
      </div>
    </section>
  )
}
