import { Link, useLocation } from 'react-router'
import { useNavLinks } from '../../data/navigation'
import { useSiteData } from '../../lib/siteData'
import { entriesOfType } from '../../lib/content'
import { useSectionLink } from '../../lib/scroll'
import { externalProps } from '../../lib/links'
import SocialIcon, { socialLabel } from '../SocialIcon/SocialIcon'
import styles from './Footer.module.css'

const ARTICLES = entriesOfType('articles')
const PAGES = entriesOfType('pages')

export default function Footer() {
  const { profile, socialLinks } = useSiteData()
  const sectionLink = useSectionLink()
  const navLinks = useNavLinks()
  const { pathname } = useLocation()
  const year = new Date().getFullYear()
  const title = `${profile.titleLine1} ${profile.titleHighlight}`.replace(/\.$/, '')

  return (
    <footer className={`${styles.footer} ${pathname === '/' ? styles.home : ''}`}>
      <div className={styles.bar}>
        <div className={styles.brand}>
          <p className={styles.signature}>{profile.name}</p>
          <p className={styles.tagline}>{title} — {profile.role}</p>
        </div>

        <nav aria-label="Footer" className={styles.col}>
          <p className="label">Explore</p>
          <ul className={styles.links}>
            {navLinks.map(({ id, label }) => (
              <li key={id}>
                <a href={`/#${id}`} onClick={sectionLink(id)}>
                  <span className={styles.rule} aria-hidden="true" />
                  {label}
                </a>
              </li>
            ))}
            {ARTICLES.length > 0 && (
              <li>
                <Link to="/articles"><span className={styles.rule} aria-hidden="true" />Writing</Link>
              </li>
            )}
            {PAGES.map((p) => (
              <li key={p.slug}>
                <Link to={p.path}><span className={styles.rule} aria-hidden="true" />{p.title}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {socialLinks.length > 0 && (
          <nav aria-label="Social" className={styles.col}>
            <p className="label">Elsewhere</p>
            <ul className={styles.links}>
              {socialLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.url} {...externalProps(link.url)}>
                    <span className={styles.rule} aria-hidden="true" />
                    <SocialIcon platform={link.platform} className={styles.icon} />
                    {socialLabel(link)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={styles.end}>
          <a href="/" className={styles.top} onClick={sectionLink('hero')}>Back to top ↑</a>
          {/* Year may differ between build time and the visitor's clock */}
          <p className="label" suppressHydrationWarning>© {year} {profile.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
