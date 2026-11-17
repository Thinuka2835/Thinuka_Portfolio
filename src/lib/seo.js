// Keeps <title> and the meta description correct during client-side
// navigation. (Crawlers get the same values from the prerendered HTML.)
import { useEffect } from 'react'

export function useDocumentMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    }
  }, [title, description])
}
