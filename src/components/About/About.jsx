import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import { personal } from '../../data/personalDetails'
import styles from './About.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

export default function About() {
  // Highlight the specified word in the quote
  const renderQuote = () => {
    const { quote, highlightedWord } = personal
    if (!highlightedWord) return quote
    const parts = quote.split(new RegExp(`(${highlightedWord})`, 'i'))
    return parts.map((part, i) =>
      part.toLowerCase() === highlightedWord.toLowerCase()
        ? <span key={i} className={styles.highlight}>{part}</span>
        : part
    )
  }

  return (
    <section id="about" className={styles.about}>
      <motion.div
        className={styles.inner}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        transition={{ staggerChildren: 0.15 }}
      >
        <motion.h2 className={styles.quote} variants={fadeUp}>
          {renderQuote()}
        </motion.h2>

        <motion.p className={styles.bio} variants={fadeUp}>
          {personal.bio}
        </motion.p>

        <motion.div variants={fadeUp}>
          <a href="#projects" className="accent-btn" onClick={(e) => {
            e.preventDefault()
            document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            View Projects <FiArrowRight />
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
