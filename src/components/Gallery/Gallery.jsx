import { useRef, useState } from 'react'
import { FiArrowUpRight } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { useInViewOnce } from '../../lib/motion'
import { hasLink, externalProps } from '../../lib/links'
import { Eyebrow, Reveal, RevealText } from '../Motion/Motion'
import LiquidImage from '../LiquidImage/LiquidImage'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import styles from './Gallery.module.css'

/** Certifications in the interactive "Voices" layout: selector list + featured panel. */
export default function Gallery() {
  const { certifications } = useSiteData()
  const [activeIndex, setActiveIndex] = useState(0)
  const panelRef = useRef(null)
  const panelIn = useInViewOnce(panelRef)

  if (!certifications.length) return null
  const active = certifications[Math.min(activeIndex, certifications.length - 1)]
  const meta = [active.issuer, active.year].filter(Boolean).join(' — ')

  return (
    <section id="gallery" className="section" aria-labelledby="gallery-title">
      <div>
        <Eyebrow>Credentials</Eyebrow>
        <RevealText as="h2" id="gallery-title" text="Certifications & achievements" className={`heading ${styles.heading}`} />
      </div>

      <div className={styles.body}>
        <ul className={styles.list}>
          {certifications.map((c, i) => {
            const isActive = i === activeIndex
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`${styles.option} ${isActive ? styles.active : ''}`}
                  aria-pressed={isActive}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  onClick={() => setActiveIndex(i)}
                >
                  <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.who}>
                    <span className={styles.name}>{c.title}</span>
                    <span className={styles.role}>{[c.issuer, c.year].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={styles.rule} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>

        <div ref={panelRef} className={styles.panel} aria-live="polite">
          <blockquote className={styles.quote}>
            {/* Remounts per certificate, so the word reveal replays on every change */}
            <RevealText key={active.id} as="p" mode="words" text={`“${active.title}”`} play={panelIn} animateOnMount className={styles.quoteText} />
            {meta && <footer className={styles.meta}>{meta}</footer>}
            {hasLink(active.url) && (
              <a href={active.url} className={styles.credential} {...externalProps(active.url)}>
                View credential <FiArrowUpRight aria-hidden="true" />
              </a>
            )}
          </blockquote>
          <Reveal className={styles.portrait} play={panelIn} y={0} scale={1.06} dur={640}>
            <LiquidImage
              className={styles.portraitImage}
              distortion={22}
              src={active.image ? cldUrl(active.image.url, { width: 640, height: 800, crop: 'fill', gravity: 'auto' }) : undefined}
              srcSet={active.image ? cldSrcSet(active.image.url, [320, 640, 960], { crop: 'fill', gravity: 'auto', aspectRatio: 4 / 5 }) : undefined}
              sizes="(min-width: 640px) 16rem, 92vw"
              alt={active.image?.alt || active.title}
              placeholderLabel={active.issuer || 'Certified'}
            />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
