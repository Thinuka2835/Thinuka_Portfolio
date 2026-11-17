import { Link, useParams } from 'react-router'
import { FiArrowRight, FiArrowUpRight, FiClock } from 'react-icons/fi'
import Prose from '../components/Prose/Prose'
import { entriesOfType, findEntry, formatDate, useEntryHtml } from '../lib/content'
import { useSiteData } from '../lib/siteData'
import { useDocumentMeta } from '../lib/seo'
import { cldSrcSet, cldUrl } from '../../shared/cloudinary.js'
import { externalProps } from '../lib/links'
import NotFoundPage from './NotFoundPage'
import styles from './EntryPage.module.css'

// Breadcrumb trail (mirrors the BreadcrumbList structured data from shared/seo.js)
const PARENT = {
  projects: { href: '/#projects', label: 'Projects' },
  articles: { href: '/articles', label: 'Articles' },
  pages: null,
}
const MORE_LABEL = { projects: 'More projects', articles: 'More articles', pages: null }

export default function EntryPage({ type }) {
  const { slug } = useParams()
  const entry = findEntry(type, slug)
  const { profile } = useSiteData()
  const { html, error } = useEntryHtml(type, entry ? slug : '__missing__')
  useDocumentMeta(entry ? `${entry.title} | ${profile.name}` : null, entry?.description)

  if (!entry) return <NotFoundPage />

  const parent = PARENT[type]
  const related = MORE_LABEL[type] ? entriesOfType(type).filter((e) => e.slug !== slug).slice(0, 3) : []
  const author = entry.author || profile.name

  return (
    <article className={`page ${styles.page}`}>
      <div className={`container ${styles.inner}`}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol>
            <li><Link to="/">Home</Link></li>
            {parent && (
              <li>
                {parent.href.startsWith('/#') ? <a href={parent.href}>{parent.label}</a> : <Link to={parent.href}>{parent.label}</Link>}
              </li>
            )}
            <li aria-current="page">{entry.title}</li>
          </ol>
        </nav>

        <header className={styles.header}>
          {type !== 'pages' && <p className={styles.eyebrow}>{type === 'projects' ? 'Project' : 'Article'}</p>}
          <h1 className={styles.title}>{entry.title}</h1>
          <p className={styles.description}>{entry.description}</p>
          {(entry.date || type !== 'pages') && (
            <p className={styles.meta}>
              {type === 'articles' && <span>By {author}</span>}
              {entry.date && <time dateTime={entry.date}>{formatDate(entry.date)}</time>}
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
            sizes="(min-width: 1000px) 62rem, 100vw"
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
            <Prose html={html} entryKey={`${type}/${slug}`} />
          )}
        </div>

        {entry.link && (
          <a href={entry.link} className="btn btn--primary" {...externalProps(entry.link)}>
            View project <FiArrowUpRight aria-hidden="true" />
          </a>
        )}

        {related.length > 0 && (
          <nav aria-labelledby="related-title" className={styles.related}>
            <h2 id="related-title" className={styles.relatedTitle}>{MORE_LABEL[type]}</h2>
            <ul>
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={r.path} className={styles.relatedLink}>
                    <span className={styles.relatedName}>{r.title}</span>
                    <span className={styles.relatedDesc}>{r.description}</span>
                    <FiArrowRight aria-hidden="true" className={styles.relatedArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </article>
  )
}
