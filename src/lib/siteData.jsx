// Site data (profile, social links, stats, tools, ticker, certifications).
// First paint uses the copy embedded in the HTML at build time; the live copy
// from /api/public/site then replaces it, so admin edits show up within about
// a minute without a redeploy. If the API is unavailable, the embedded data stays.
import { createContext, useContext, useEffect, useState } from 'react'
import { getDefaultSiteData } from '../../shared/siteDefaults.js'

const SiteDataContext = createContext(null)

function readEmbedded() {
  if (typeof document === 'undefined') return getDefaultSiteData()
  try {
    const el = document.getElementById('site-data')
    if (el?.textContent) return JSON.parse(el.textContent)
  } catch {
    /* fall through to defaults */
  }
  return getDefaultSiteData()
}

/** `initialData` is passed during pre-rendering (no document on the server). */
export function SiteDataProvider({ children, initialData }) {
  const [data, setData] = useState(() => initialData ?? readEmbedded())

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/public/site', { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((fresh) => {
        if (fresh?.profile) setData(fresh)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>
}

export const useSiteData = () => useContext(SiteDataContext)
