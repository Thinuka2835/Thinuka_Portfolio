import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FiPlus } from 'react-icons/fi'
import { CONTENT_TYPES, CONTENT_TYPE_KEYS } from '../../../shared/content.js'
import { get } from '../api'
import { EmptyState, Notice, PageHeader, Spinner } from '../ui'

export default function ContentListPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [type, setType] = useState('all')

  useEffect(() => {
    get('/content')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const items = data?.items.filter((i) => type === 'all' || i.type === type) ?? []

  return (
    <>
      <PageHeader
        title="Content"
        description="Long-form pages written in Markdown: project case studies, articles and standalone pages."
        actions={
          <div className="a-btn-group">
            {CONTENT_TYPE_KEYS.map((t) => (
              <Link key={t} to={`/content/${t}/new`} className="btn btn--ghost btn--sm">
                <FiPlus aria-hidden="true" /> {CONTENT_TYPES[t].singular}
              </Link>
            ))}
          </div>
        }
      />

      <div className="a-tabs" role="group" aria-label="Filter by type">
        {['all', ...CONTENT_TYPE_KEYS].map((t) => (
          <button key={t} type="button" className="a-tab" aria-pressed={type === t} onClick={() => setType(t)}>
            {t === 'all' ? 'All' : CONTENT_TYPES[t].label}
          </button>
        ))}
      </div>

      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : !data ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing here yet">Create your first entry with the buttons above.</EmptyState>
      ) : (
        <table className="a-table">
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={`${i.type}/${i.slug}`}>
                <td data-label="Title">
                  <Link className="a-link a-strong" to={`/content/${i.type}/${i.slug}`}>{i.title}</Link>
                  <div className="a-muted a-small">/{i.type === 'pages' ? '' : `${i.type}/`}{i.slug}</div>
                  {!i.valid && <div className="a-warn-text a-small">Frontmatter has problems — open to fix.</div>}
                </td>
                <td data-label="Type">{CONTENT_TYPES[i.type].singular}</td>
                <td data-label="Status">
                  <span className={`a-badge a-badge--${i.status}`}>{i.status === 'published' ? 'Published' : 'Draft'}</span>
                </td>
                <td data-label="Date">{i.date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
