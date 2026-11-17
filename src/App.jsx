import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import Preloader from './components/Preloader/Preloader'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import HomePage from './pages/HomePage'
import EntryPage from './pages/EntryPage'
import ArticlesPage from './pages/ArticlesPage'
import NotFoundPage from './pages/NotFoundPage'
import { useSiteData } from './lib/siteData'
import { applyAdaptiveGrid } from './lib/motion'
import { initAnalytics, trackPageView } from './lib/analytics'
import { destroyLenis, initLenis, scrollToSection, scrollToTop } from './lib/scroll'

/** Scroll to the top on page changes, or to #section when the URL has a hash. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1))
    if (id) {
      // Wait a frame so the target section has rendered
      const raf = requestAnimationFrame(() => scrollToSection(id, { immediate: true }) || scrollToTop())
      return () => cancelAnimationFrame(raf)
    }
    scrollToTop()
  }, [pathname, hash])
  // Analytics page view after the page has set its title (no-op unless GA is configured)
  useEffect(() => {
    const t = setTimeout(() => trackPageView(pathname), 0)
    return () => clearTimeout(t)
  }, [pathname])
  return null
}

export default function App() {
  const { profile } = useSiteData()

  useEffect(() => {
    initLenis()
    initAnalytics()
    applyAdaptiveGrid()
    window.addEventListener('resize', applyAdaptiveGrid)
    return () => {
      window.removeEventListener('resize', applyAdaptiveGrid)
      destroyLenis()
    }
  }, [])

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Preloader name={profile.name} />
      <Navbar />
      <ScrollManager />
      <main id="main" tabIndex={-1} className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects/:slug" element={<EntryPage type="projects" />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<EntryPage type="articles" />} />
          <Route path="/:slug" element={<EntryPage type="pages" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
