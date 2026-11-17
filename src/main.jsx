import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// Global styles first, so component CSS Modules can override the shared utilities
import './index.css'
import { SiteDataProvider } from './lib/siteData'
import App from './App'

const app = (
  <StrictMode>
    <BrowserRouter>
      <SiteDataProvider>
        <App />
      </SiteDataProvider>
    </BrowserRouter>
  </StrictMode>
)

const root = document.getElementById('root')
// Production pages are pre-rendered (scripts/prerender.mjs) → hydrate them;
// the dev server serves an empty root → render from scratch.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
