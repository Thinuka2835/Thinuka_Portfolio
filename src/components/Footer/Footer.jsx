import { motion } from 'framer-motion'
import { MdEmail } from 'react-icons/md'
import { FiGithub, FiLinkedin } from 'react-icons/fi'
import { personal } from '../../data/personalDetails'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className={styles.footer}>
      <div className={styles.inner}>
        {/* Logo */}
        <a href="#hero" className={styles.logo}>
          {personal.name.split(' ')[0]}
          <span>.</span>
        </a>

        {/* Social Links */}
        <div className={styles.socials}>
          <motion.a
            href={`mailto:${personal.email}`}
            className={styles.socialLink}
            aria-label="Email"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MdEmail />
          </motion.a>
          <motion.a
            href={personal.github}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label="GitHub"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiGithub />
          </motion.a>
          <motion.a
            href={personal.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label="LinkedIn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiLinkedin />
          </motion.a>
        </div>
      </div>

      <p className={styles.copyright}>
        Copyright © {year}, All Rights Reserved
      </p>
    </footer>
  )
}
