import { useSiteData } from '../../lib/siteData'
import { Eyebrow, Reveal, RevealText } from '../Motion/Motion'
import styles from './Stats.module.css'

/** "Impact" — the career stats as a bordered 1/2/4-column figure grid. */
export default function Stats() {
  const { stats } = useSiteData()
  if (!stats.length) return null
  return (
    <section id="impact" className="section" aria-labelledby="impact-title">
      <div>
        <Eyebrow>By The Numbers</Eyebrow>
        <RevealText as="h2" id="impact-title" text="Career highlights" className={`heading ${styles.heading}`} />
      </div>
      <dl className={styles.grid}>
        {stats.map((stat, i) => (
          <Reveal key={stat.id} className={styles.cell} delay={i * 110} dur={560}>
            {/* dt before dd for valid markup; CSS `order` shows the figure first */}
            <dt className={styles.label}>{stat.label}</dt>
            <dd className={styles.figure}>
              {stat.value}
              {stat.suffix}
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
