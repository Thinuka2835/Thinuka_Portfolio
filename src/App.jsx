import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router'
import Cursor from './components/Cursor/Cursor'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import HomePage from './pages/HomePage'
import EntryPage from './pages/EntryPage'
import ArticlesPage from './pages/ArticlesPage'
import NotFoundPage from './pages/NotFoundPage'
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
  return null
}

export default function App() {
  useEffect(() => {
    initLenis()
    return destroyLenis
  }, [])

  return (
    // reducedMotion="user" turns off transform animations for users who ask for it
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">Skip to content</a>
      <Cursor />
      <Navbar />
      <ScrollManager />
      <main id="main" tabIndex={-1}>
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
    </MotionConfig>
  )
}
