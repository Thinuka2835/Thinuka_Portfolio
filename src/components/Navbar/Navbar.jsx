import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useNavLinks } from '../../data/navigation'
import { useSiteData } from '../../lib/siteData'
import { entriesOfType } from '../../lib/content'
import { lockScroll, unlockScroll, useSectionLink } from '../../lib/scroll'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import styles from './Navbar.module.css'

const HAS_ARTICLES = entriesOfType('articles').length > 0

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const sectionLink = useSectionLink()
  const { profile } = useSiteData()
  const burgerRef = useRef(null)
  const navLinks = useNavLinks()

  // Close the menu on navigation
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

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
    const mq = window.matchMedia('(min-width: 768px)')
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
  const links = [
    ...navLinks.map((l) => ({ ...l, href: `/#${l.id}`, onClick: (after) => sectionLink(l.id, after) })),
    ...(HAS_ARTICLES ? [{ id: 'writing', label: 'Writing', to: '/articles' }] : []),
  ]

  return (
    <header className={styles.header}>
      {/* Mobile menu panel */}
      <div id="mobile-menu" className={`${styles.panel} ${open ? styles.panelOpen : ''}`} aria-hidden={!open} inert={!open}>
        <nav aria-label="Mobile">
          <ul className={styles.panelList}>
            {links.map((l, i) => (
              <li key={l.id} className={styles.panelItem} style={{ '--i': i }}>
                {l.to ? (
                  <Link to={l.to} className={styles.panelLink} onClick={close}>{l.label}</Link>
                ) : (
                  <a href={l.href} className={styles.panelLink} onClick={l.onClick(close)}>{l.label}</a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <nav className={styles.nav} aria-label="Primary">
        {/* The visible name is the link's accessible name (label-in-name) */}
        <Link to="/" className={styles.logo} onClick={sectionLink('hero', close)}>
          <span className={styles.badge} aria-hidden="true">{initials(profile.name)}</span>
          <span className={styles.logoName}>{profile.name}</span>
        </Link>

        <div className={styles.right}>
          <ul className={styles.links}>
            {links.map((l) => (
              <li key={l.id}>
                {l.to ? (
                  <Link to={l.to} className={styles.link} aria-current={pathname.startsWith(l.to) ? 'page' : undefined}>{l.label}</Link>
                ) : (
                  <a href={l.href} className={styles.link} onClick={l.onClick()}>{l.label}</a>
                )}
              </li>
            ))}
          </ul>
          <ThemeToggle className={styles.toggle} />
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
            <span />
          </button>
        </div>
      </nav>
    </header>
  )
}
