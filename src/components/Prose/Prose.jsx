import styles from './Prose.module.css'

/**
 * Renders Markdown HTML produced by shared/markdown.js. That pipeline
 * sanitizes the HTML (rehype-sanitize allow-list) at build time / in the
 * admin preview, which is why setting it as HTML here is safe.
 */
export default function Prose({ html, className = '' }) {
  return <div className={`${styles.prose} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
