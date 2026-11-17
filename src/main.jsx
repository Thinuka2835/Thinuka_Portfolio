import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// Global styles first, so component CSS Modules can override the shared utilities
import './index.css'
import { SiteDataProvider } from './lib/siteData'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SiteDataProvider>
        <App />
      </SiteDataProvider>
    </BrowserRouter>
  </StrictMode>
)
