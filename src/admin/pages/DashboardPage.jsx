import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FiCheckCircle, FiAlertTriangle, FiExternalLink, FiRefreshCw } from 'react-icons/fi'
import { get, post } from '../api'
import { Notice, PageHeader, Spinner, formatDateTime } from '../ui'

function StatusCard({ ok, title, children }) {
  return (
    <div className={`a-card a-status ${ok ? 'is-ok' : 'is-warn'}`}>
      <p className="a-status-title">
        {ok ? <FiCheckCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
        {title}
        <span className="visually-hidden">{ok ? '(configured)' : '(needs attention)'}</span>
      </p>
      <div className="a-status-body">{children}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)
  const [deploy, setDeploy] = useState(null)

  useEffect(() => {
    get('/status').then(setStatus).catch((e) => setError(e.message))
    get('/content')
      .then((r) => setEvents(r.events))
      .catch(() => {})
  }, [])

  const rebuild = async () => {
    setDeploy({ tone: 'info', text: 'Requesting a rebuild…' })
    try {
      await post('/deploy')
      setDeploy({ tone: 'success', text: 'Rebuild started. The site updates in a couple of minutes.' })
    } catch (e) {
      setDeploy({ tone: 'error', text: e.message })
    }
  }

  if (error) return <Notice tone="error">{error}</Notice>
  if (!status) return <Spinner />
  const c = status.content

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Environment: ${status.environment}`}
        actions={
          status.deployHook && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={rebuild}>
              <FiRefreshCw aria-hidden="true" /> Rebuild site
            </button>
          )
        }
      />
      {deploy && <Notice tone={deploy.tone} onDismiss={() => setDeploy(null)}>{deploy.text}</Notice>}

      <div className="a-grid-cards">
        <StatusCard ok title="Database">
          Connected · {status.database.migrations} migration(s) applied
        </StatusCard>
        <StatusCard ok={c.writable} title="Markdown content">
          {c.store === 'github' ? (
            <>Commits to <code>{c.repo}</code> on <code>{c.branch}</code></>
          ) : (
            <>Local files in <code>content/</code> (development only)</>
          )}
          {!c.writable && <p className="a-warn-text">{c.readOnlyReason}</p>}
          <p className="a-muted">{c.allowDrafts ? 'Drafts can be saved.' : 'Drafts are disabled (public repository) — entries are saved as published.'}</p>
        </StatusCard>
        <StatusCard ok={status.cloudinary.configured} title="Image uploads (Cloudinary)">
          {status.cloudinary.configured ? `Folder “${status.cloudinary.folder}” · max ${Math.round(status.cloudinary.maxBytes / 1048576)} MB` : 'Not configured — set the CLOUDINARY_* variables.'}
        </StatusCard>
        <StatusCard ok={status.emailjs.configured} title="Contact form (EmailJS)">
          {status.emailjs.configured ? `Configured · CAPTCHA ${status.emailjs.captcha ? 'on' : 'off'}` : 'Not configured — the form shows a “not connected” notice.'}
        </StatusCard>
      </div>

      <section className="a-card" aria-labelledby="recent">
        <h2 id="recent" className="a-card-title">Recent publishing</h2>
        {events.length === 0 ? (
          <p className="a-muted">Nothing published from the admin yet. <Link to="/content">Go to content</Link></p>
        ) : (
          <ul className="a-list">
            {events.map((e, i) => (
              <li key={i}>
                <strong>{e.action}</strong> {e.content_type}/{e.slug}
                <span className="a-muted"> · {formatDateTime(e.created_at)}{e.email ? ` · ${e.email}` : ''}</span>
                {e.commit_sha && c.repo && (
                  <a className="a-link" href={`https://github.com/${c.repo}/commit/${e.commit_sha}`} target="_blank" rel="noopener noreferrer">
                    {' '}commit {e.commit_sha.slice(0, 7)} <FiExternalLink aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
