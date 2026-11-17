import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router'
import { FiArrowUpRight } from 'react-icons/fi'
import { navLinks } from '../../data/navigation'
import { useSiteData } from '../../lib/siteData'
import { entriesOfType } from '../../lib/content'
import { lockScroll, unlockScroll, useSectionLink } from '../../lib/scroll'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import styles from './Navbar.module.css'

/** Tracks which home-page section is in the middle of the viewport. */
function useActiveSection(ids, enabled) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    if (!enabled) return
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (!els.length) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids, enabled])
  return enabled ? active : null
}

const SECTION_IDS = ['hero', ...navLinks.map((l) => l.id)]
const HAS_ARTICLES = entriesOfType('articles').length > 0

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const onHome = pathname === '/'
  const active = useActiveSection(SECTION_IDS, onHome)
  const sectionLink = useSectionLink()
  const { profile } = useSiteData()
  const firstName = profile.name.split(' ')[0]
  const burgerRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on navigation
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  // Mobile menu: lock scroll, Escape closes (focus returns to the button), close on desktop resize
  useEffect(() => {
    if (!open) return
    lockScroll()
    const burger = burgerRef.current
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        burger?.focus()
      }
    }
    const mq = window.matchMedia('(min-width: 960px)')
    const onResize = () => mq.matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onResize)
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onResize)
    }
  }, [open])

  const close = () => setOpen(false)
  const links = navLinks.map((l) => ({ ...l, href: `/#${l.id}` }))
  const writingActive = pathname.startsWith('/articles')

  return (
    <header className={`${styles.navbar} ${scrolled || open || !onHome ? styles.solid : ''}`}>
      <nav className={`container ${styles.inner}`} aria-label="Primary">
        <Link to="/" className={styles.logo} onClick={sectionLink('hero', close)} aria-label={`${profile.name} — home`}>
          <span className={styles.logoMark} aria-hidden="true">{firstName.charAt(0)}</span>
          <span aria-hidden="true">{firstName}<span className={styles.logoDot}>.</span></span>
        </Link>

        <ul className={styles.links}>
          {links.map(({ id, label, href }) => (
            <li key={id}>
              <a
                href={href}
                className={`${styles.link} ${active === id ? styles.active : ''}`}
                aria-current={active === id ? 'location' : undefined}
                onClick={sectionLink(id)}
              >
                {label}
              </a>
            </li>
          ))}
          {HAS_ARTICLES && (
            <li>
              <Link to="/articles" className={`${styles.link} ${writingActive ? styles.active : ''}`} aria-current={writingActive ? 'page' : undefined}>
                Writing
              </Link>
            </li>
          )}
        </ul>

        <div className={styles.actions}>
          <ThemeToggle />
          <a href="/#contact" className={`btn btn--primary ${styles.cta}`} onClick={sectionLink('contact')}>
            Let's Talk <FiArrowUpRight aria-hidden="true" />
          </a>
          <button
            ref={burgerRef}
            type="button"
            className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <nav aria-label="Mobile">
              <ul className="container">
                {links.map(({ id, label, href }, i) => (
                  <motion.li key={id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 + i * 0.04 }}>
                    <a href={href} className={`${styles.mobileLink} ${active === id ? styles.active : ''}`} onClick={sectionLink(id, close)}>
                      <span className={styles.mobileIndex}>0{i + 1}</span>
                      {label}
                    </a>
                  </motion.li>
                ))}
                {HAS_ARTICLES && (
                  <li>
                    <Link to="/articles" className={styles.mobileLink} onClick={close}>
                      <span className={styles.mobileIndex}>0{links.length + 1}</span>
                      Writing
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
