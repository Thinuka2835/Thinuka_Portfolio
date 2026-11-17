import { Link, useParams } from 'react-router'
import { FiArrowLeft, FiArrowUpRight, FiClock } from 'react-icons/fi'
import Prose from '../components/Prose/Prose'
import { findEntry, formatDate, useEntryHtml } from '../lib/content'
import { useSiteData } from '../lib/siteData'
import { useDocumentMeta } from '../lib/seo'
import { cldSrcSet, cldUrl } from '../../shared/cloudinary.js'
import { externalProps } from '../lib/links'
import NotFoundPage from './NotFoundPage'
import styles from './EntryPage.module.css'

const BACK = {
  projects: { to: '/#projects', label: 'All projects' },
  articles: { to: '/articles', label: 'All articles' },
  pages: { to: '/', label: 'Home' },
}

export default function EntryPage({ type }) {
  const { slug } = useParams()
  const entry = findEntry(type, slug)
  const { profile } = useSiteData()
  const { html, error } = useEntryHtml(type, entry ? slug : '__missing__')
  useDocumentMeta(entry ? `${entry.title} | ${profile.name}` : null, entry?.description)

  if (!entry) return <NotFoundPage />

  const back = BACK[type]
  return (
    <article className={`page ${styles.page}`}>
      <div className={`container ${styles.inner}`}>
        <Link to={back.to} className={styles.back}>
          <FiArrowLeft aria-hidden="true" /> {back.label}
        </Link>

        <header className={styles.header}>
          {type !== 'pages' && <p className={styles.eyebrow}>{type === 'projects' ? 'Project' : 'Article'}</p>}
          <h1 className={styles.title}>{entry.title}</h1>
          <p className={styles.description}>{entry.description}</p>
          {(entry.date || type !== 'pages') && (
            <p className={styles.meta}>
              {entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}
              {entry.date && type !== 'pages' && <span aria-hidden="true">·</span>}
              {type !== 'pages' && (
                <span>
                  <FiClock aria-hidden="true" /> {entry.readingTime} min read
                </span>
              )}
              {entry.updated && <span>Updated <time dateTime={entry.updated}>{formatDate(entry.updated)}</time></span>}
            </p>
          )}
          {entry.tags.length > 0 && (
            <ul className={styles.tags} aria-label="Tags">
              {entry.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </header>

        {entry.cover && (
          <img
            className={styles.cover}
            src={cldUrl(entry.cover.url, { width: 1400 })}
            srcSet={cldSrcSet(entry.cover.url, [600, 900, 1400, 1800], { maxWidth: entry.cover.width })}
            sizes="(min-width: 1000px) 920px, 100vw"
            alt={entry.cover.alt || ''}
            width={entry.cover.width}
            height={entry.cover.height}
            fetchPriority="high"
          />
        )}

        <div className={styles.body} aria-busy={html === null && !error}>
          {error ? (
            <p className={styles.error} role="alert">
              This page couldn’t be loaded. Please check your connection and refresh.
            </p>
          ) : html === null ? (
            <div className={styles.skeleton} aria-label="Loading content">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <Prose html={html} />
          )}
        </div>

        {entry.link && (
          <a href={entry.link} className="btn btn--primary" {...externalProps(entry.link)}>
            View project <FiArrowUpRight aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}
