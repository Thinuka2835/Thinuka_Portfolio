import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiArrowUpRight } from 'react-icons/fi'
import { personal } from '../../data/personalDetails'
import { scrollToSection } from '../../lib/scroll'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleScroll = scrollToSection

  return (
    <motion.nav
      className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}
      initial={{ y: -80, opacity: 0 }}
      animate={scrolled ? { y: 0, opacity: 1 } : { y: -80, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Logo */}
      <a href="#hero" onClick={(e) => { e.preventDefault(); handleScroll('hero') }} className={styles.logo}>
        {personal.name.split(' ')[0]}
        <span className={styles.logoDot}>.</span>
      </a>

      {/* Nav Links */}
      <div className={styles.navLinks}>
        <a
          href="#contact"
          className={styles.navLink}
          onClick={(e) => { e.preventDefault(); handleScroll('contact') }}
        >
          Let's Talk!
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
    </motion.nav>
  )
}
