// Published Markdown content, generated at build time by vite/content-plugin.js.
// Only published entries exist here — drafts are never part of the bundle.
import { createContext, useContext, useEffect, useState } from 'react'
import { entries, loaders } from 'virtual:content'

export const allEntries = entries
export const entriesOfType = (type) => entries.filter((e) => e.type === type)
export const findEntry = (type, slug) => entries.find((e) => e.type === type && e.slug === slug)

/** Pre-rendering passes an entry's HTML here so it is in the server-rendered page. */
export const EntryHtmlContext = createContext(null)

/** HTML already in the page from pre-rendering (read before React hydrates over it). */
function htmlFromDocument(key) {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-entry="${CSS.escape(key)}"]`)
  return el ? el.innerHTML : null
}

/** Loads the rendered HTML for one entry (each entry is its own lazy chunk). */
export function useEntryHtml(type, slug) {
  const key = `${type}/${slug}`
  const ssr = useContext(EntryHtmlContext)
  const [state, setState] = useState(() => {
    const html = ssr?.key === key ? ssr.html : htmlFromDocument(key)
    return { key, html, error: null }
  })

  const ready = state.key === key && state.html !== null
  useEffect(() => {
    if (ready) return
    let cancelled = false
    const load = loaders[key]
    if (!load) return
    load()
      .then((mod) => !cancelled && setState({ key, html: mod.default?.html ?? '', error: null }))
      .catch((error) => !cancelled && setState({ key, html: null, error }))
    return () => {
      cancelled = true
    }
  }, [key, ready])

  return state.key === key ? state : { key, html: null, error: null }
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
