import { motion } from 'framer-motion'
import { FiArrowUpRight } from 'react-icons/fi'
import { personal } from '../../data/personalDetails'
import { scrollToSection } from '../../lib/scroll'
import styles from './Hero.module.css'
import heroPhoto from '../../assets/user.png'

const textVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.13, duration: 0.65, ease: 'easeOut' }
  })
}

const blobVariants = {
  animate: {
    scale:    [1, 1.12, 0.97, 1.08, 1],
    rotate:   [0, 8, -6, 4, 0],
    transition: { duration: 12, repeat: Infinity, ease: 'easeInOut' }
  }
}

const photoVariants = {
  hidden:  { opacity: 0, y: 60, scale: 0.92 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { delay: 0.5, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

const handleScroll = scrollToSection

export default function Hero() {
  const { greeting, name, titleLine1, titleHighlight, role } = personal

  return (
    <section id="hero" className={styles.hero}>

      {/* ── Centered text block ── */}
      <div className={styles.textBlock}>
        <motion.p
          className={styles.greeting}
          custom={0} initial="hidden" animate="visible" variants={textVariants}
        >
          — {greeting} {name}.
        </motion.p>

        <motion.h1
          className={styles.heroTitle}
          custom={1} initial="hidden" animate="visible" variants={textVariants}
        >
          <span className={styles.titleLine1}>{titleLine1} &amp;</span>
          <span className={styles.titleBadge}>{titleHighlight}</span>
        </motion.h1>
      </div>

      {/* ── Photo + Blob ── */}
      <motion.div
        className={styles.photoWrap}
        variants={photoVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Animated blob behind photo */}
        <motion.div
          className={styles.blob}
          variants={blobVariants}
          animate="animate"
        >
          <div className={styles.blobPurple} />
          <div className={styles.blobOrange} />
        </motion.div>

        {/* Portrait */}
        <img
          src={heroPhoto}
          alt={name}
          className={styles.photo}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      </motion.div>

      {/* ── Bottom bar: Logo left, Nav links right ── */}
      <motion.div
        className={styles.bottomBar}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
      >
        <a
          href="#hero"
          className={styles.logo}
          onClick={(e) => { e.preventDefault(); handleScroll('hero') }}
        >
          <span className={styles.logoIcon}>{name.charAt(0)}</span>
          <span className={styles.logoText}>
            {name.split(' ')[0]}<span className={styles.logoPlus}>.</span>
          </span>
        </a>

        <div className={styles.navLinks}>
          <a
            href="#contact"
            className={styles.navLink}
            onClick={(e) => { e.preventDefault(); handleScroll('contact') }}
          >
            Lets Talk!
            <span className={styles.arrowCircle}><FiArrowUpRight /></span>
          </a>
          <a
            href="#projects"
            className={styles.navLink}
            onClick={(e) => { e.preventDefault(); handleScroll('projects') }}
          >
            View Projects
            <span className={styles.arrowCircle}><FiArrowUpRight /></span>
          </a>
        </div>
      </motion.div>

    </section>
  )
}
