// Server entry used only at build time by scripts/prerender.mjs: renders each
// public route to HTML so crawlers (and visitors without JavaScript) get the
// real content. The browser then hydrates the same markup (src/main.jsx).
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { SiteDataProvider } from './lib/siteData'
import { EntryHtmlContext } from './lib/content'
import App from './App'

export function render(url, { siteData, entry = null }) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <SiteDataProvider initialData={siteData}>
          <EntryHtmlContext.Provider value={entry}>
            <App />
          </EntryHtmlContext.Provider>
        </SiteDataProvider>
      </StaticRouter>
    </StrictMode>
  )
}
