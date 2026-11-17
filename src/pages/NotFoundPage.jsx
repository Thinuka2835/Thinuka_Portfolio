import { Link } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { useDocumentMeta } from '../lib/seo'
import { useSiteData } from '../lib/siteData'

export default function NotFoundPage() {
  const { profile } = useSiteData()
  useDocumentMeta(`Page not found | ${profile.name}`)
  return (
    <section className="page" aria-labelledby="nf-title">
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 14vw, 8rem)', fontWeight: 400, color: 'var(--accent)', lineHeight: 1 }}>
          404
        </p>
        <h1 id="nf-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, textTransform: 'uppercase', fontSize: 'var(--fs-h2)', margin: '1rem 0 0.5rem' }}>
          This page doesn’t exist
        </h1>
        <p style={{ color: 'var(--fg-muted)', marginBottom: '2rem' }}>
          It may have been moved or unpublished.
        </p>
        <Link to="/" className="btn btn--primary">
          <FiArrowLeft aria-hidden="true" /> Back to home
        </Link>
      </div>
    </section>
  )
}
