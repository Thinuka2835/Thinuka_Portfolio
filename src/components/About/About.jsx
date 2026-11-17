import { motion } from 'framer-motion'
import { FiArrowRight, FiDownload } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { useSectionLink } from '../../lib/scroll'
import { hasLink, externalProps } from '../../lib/links'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import styles from './About.module.css'

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wraps every occurrence of `word` in the quote with a highlight. */
function HighlightedQuote({ quote, word }) {
  if (!word) return quote
  const parts = quote.split(new RegExp(`(${escapeRegExp(word)})`, 'i'))
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? <mark key={i} className={styles.highlight}>{part}</mark> : part
  )
}

export default function About() {
  const { profile } = useSiteData()
  const sectionLink = useSectionLink()
  const { quote, highlightedWord, bio, resumeUrl } = profile

  return (
    <section id="about" className={`section section--alt ${styles.about}`} aria-labelledby="about-title">
      <motion.div className={`container ${styles.inner}`} variants={stagger(0.12)} {...revealOnView}>
        <div>
          <motion.p className={styles.eyebrow} variants={fadeUp}>
            <span className={styles.bar} aria-hidden="true" />
            About me
          </motion.p>
          <motion.h2 id="about-title" className={styles.quote} variants={fadeUp}>
            <HighlightedQuote quote={quote} word={highlightedWord} />
          </motion.h2>
        </div>

        <motion.div className={styles.body} variants={fadeUp}>
          <p className={styles.bio}>{bio}</p>
          <div className={styles.actions}>
            <a href="/#projects" className="btn btn--primary" onClick={sectionLink('projects')}>
              See my work <FiArrowRight aria-hidden="true" />
            </a>
            {hasLink(resumeUrl) && (
              <a href={resumeUrl} className="btn btn--ghost" {...externalProps(resumeUrl)}>
                <FiDownload aria-hidden="true" /> Download résumé
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
