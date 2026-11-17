import { Link } from 'react-router'
import { FiArrowRight } from 'react-icons/fi'
import { entriesOfType, formatDate } from '../lib/content'
import { useSiteData } from '../lib/siteData'
import { useDocumentMeta } from '../lib/seo'
import styles from './ArticlesPage.module.css'

export default function ArticlesPage() {
  const articles = entriesOfType('articles')
  const { profile } = useSiteData()
  useDocumentMeta(`Articles | ${profile.name}`, `Articles and notes by ${profile.name}.`)

  return (
    <section className="page" aria-labelledby="articles-title">
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Writing</p>
        <h1 id="articles-title" className={styles.title}>Articles</h1>

        {articles.length === 0 ? (
          <p className={styles.empty}>No articles have been published yet.</p>
        ) : (
          <ul className={styles.list}>
            {articles.map((a) => (
              <li key={a.slug}>
                <Link to={a.path} className={styles.item}>
                  <time dateTime={a.date} className={styles.date}>{formatDate(a.date)}</time>
                  <span className={styles.itemTitle}>{a.title}</span>
                  <span className={styles.itemDesc}>{a.description}</span>
                  <span className={styles.more}>
                    Read article <FiArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
