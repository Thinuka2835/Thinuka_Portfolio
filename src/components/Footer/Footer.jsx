import { Link } from 'react-router'
import { FiArrowUp, FiMail, FiMapPin } from 'react-icons/fi'
import { navLinks } from '../../data/navigation'
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
  const year = new Date().getFullYear()
  const firstName = profile.name.split(' ')[0]
  const role = `${profile.titleLine1} ${profile.titleHighlight}`.replace(/\.$/, '')

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link to="/" className={styles.logo} onClick={sectionLink('hero')}>
              {firstName}<span>.</span>
            </Link>
            <p className={styles.tagline}>{role} — {profile.role}</p>
            {socialLinks.length > 0 && (
              <ul className={styles.socials} aria-label="Social profiles">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} className={styles.socialLink} aria-label={socialLabel(link)} title={socialLabel(link)} {...externalProps(link.url)}>
                      <SocialIcon platform={link.platform} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <nav aria-label="Footer" className={styles.col}>
            <h2 className={styles.colTitle}>Explore</h2>
            <ul className={styles.links}>
              {navLinks.map(({ id, label }) => (
                <li key={id}>
                  <a href={`/#${id}`} onClick={sectionLink(id)}>{label}</a>
                </li>
              ))}
              {ARTICLES.length > 0 && (
                <li>
                  <Link to="/articles">Writing</Link>
                </li>
              )}
              {PAGES.map((p) => (
                <li key={p.slug}>
                  <Link to={p.path}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {(profile.email || profile.location) && (
            <div className={styles.col}>
              <h2 className={styles.colTitle}>Contact</h2>
              <ul className={styles.contact}>
                {profile.email && (
                  <li>
                    <FiMail aria-hidden="true" />
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>
                  </li>
                )}
                {profile.location && (
                  <li>
                    <FiMapPin aria-hidden="true" />
                    <span>{profile.location}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.bottom}>
          <p>© {year} {profile.name}. All rights reserved.</p>
          <a href="/" className={styles.toTop} onClick={sectionLink('hero')}>
            Back to top <FiArrowUp aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}
