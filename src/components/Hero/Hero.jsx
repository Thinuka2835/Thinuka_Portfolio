import { motion } from 'framer-motion'
import { FiArrowRight, FiArrowDown, FiDownload } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { useSectionLink } from '../../lib/scroll'
import { hasLink, externalProps } from '../../lib/links'
import { fadeUp, stagger } from '../../lib/motion'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import defaultPhoto from '../../assets/user.webp'
import styles from './Hero.module.css'

// Intrinsic size of the bundled default photo (user.webp)
const DEFAULT_PHOTO = { url: defaultPhoto, width: 656, height: 1338, alt: '' }

export default function Hero() {
  const { profile, stats } = useSiteData()
  const sectionLink = useSectionLink()
  const { greeting, name, titleLine1, titleHighlight, role, availability, resumeUrl } = profile
  const photo = profile.heroImage || DEFAULT_PHOTO
  const [statA, statB] = stats

  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.grid} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <motion.div className={styles.copy} variants={stagger(0.12, 0.1)} initial="hidden" animate="visible">
          {availability && (
            <motion.p className={styles.badge} variants={fadeUp}>
              <span className={styles.badgeDot} aria-hidden="true" />
              {availability}
            </motion.p>
          )}

          <motion.p className={styles.greeting} variants={fadeUp}>
            {greeting} <strong>{name}</strong>.
          </motion.p>

          <motion.h1 id="hero-title" className={styles.title} variants={fadeUp}>
            <span className={styles.titleLine}>{titleLine1}</span>{' '}
            <span className={styles.titleBadge}>{titleHighlight}</span>
          </motion.h1>

          {role && (
            <motion.p className={styles.role} variants={fadeUp}>
              {role}
            </motion.p>
          )}

          <motion.div className={styles.actions} variants={fadeUp}>
            <a href="/#contact" className="btn btn--primary" onClick={sectionLink('contact')}>
              Let's Talk <FiArrowRight aria-hidden="true" />
            </a>
            <a href="/#projects" className="btn btn--ghost" onClick={sectionLink('projects')}>
              View Projects
            </a>
            {hasLink(resumeUrl) && (
              <a href={resumeUrl} className={styles.resume} {...externalProps(resumeUrl)}>
                <FiDownload aria-hidden="true" /> Résumé
              </a>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.visual}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.ring} aria-hidden="true" />

          <img
            src={cldUrl(photo.url, { height: 1400 })}
            srcSet={cldSrcSet(photo.url, [700, 1000, 1400], { maxWidth: photo.width })}
            sizes="(min-width: 900px) 40vw, 80vw"
            alt={photo.alt || `Portrait of ${name}`}
            width={photo.width}
            height={photo.height}
            className={styles.photo}
            fetchPriority="high"
            decoding="async"
          />

          {statA && (
            <motion.div className={`${styles.chip} ${styles.chipA}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
              <strong>{statA.value}{statA.suffix}</strong>
              <span>{statA.label}</span>
            </motion.div>
          )}
          {statB && (
            <motion.div className={`${styles.chip} ${styles.chipB}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.05, duration: 0.6 }}>
              <strong>{statB.value}{statB.suffix}</strong>
              <span>{statB.label}</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      <a href="/#about" className={styles.scrollCue} onClick={sectionLink('about')} aria-label="Scroll to About">
        <FiArrowDown aria-hidden="true" />
      </a>
    </section>
  )
}
