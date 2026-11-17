import { lazy, Suspense, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useParams } from 'react-router'
import { FiExternalLink, FiFileText, FiGrid, FiImage, FiLayers, FiLink, FiAward, FiLogOut, FiMenu, FiUser, FiX, FiSettings } from 'react-icons/fi'
import { useAuth } from './auth'
import { Spinner } from './ui'
import ThemeToggle from '../components/ThemeToggle/ThemeToggle'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ContentListPage from './pages/ContentListPage'
import MediaPage from './pages/MediaPage'
import ProfilePage from './pages/ProfilePage'
import AccountPage from './pages/AccountPage'
import { CertificationsPage, SectionsPage, SocialLinksPage } from './pages/CollectionsPages'

const NAV = [
  { to: '/', label: 'Dashboard', icon: FiGrid, end: true },
  { to: '/content', label: 'Content', icon: FiFileText },
  { to: '/media', label: 'Media', icon: FiImage },
  { to: '/profile', label: 'Profile & settings', icon: FiSettings },
  { to: '/sections', label: 'Home sections', icon: FiLayers },
  { to: '/certifications', label: 'Certifications', icon: FiAward },
  { to: '/social', label: 'Social links', icon: FiLink },
  { to: '/account', label: 'Account', icon: FiUser },
]

// The editor bundles the Markdown pipeline + syntax highlighting; load it on demand
const ContentEditorPage = lazy(() => import('./pages/ContentEditorPage'))

/** Remount the editor per entry so its state never leaks between entries. */
function EditorRoute() {
  const { type, slug } = useParams()
  return (
    <Suspense fallback={<Spinner label="Loading editor…" />}>
      <ContentEditorPage key={`${type}/${slug ?? 'new'}`} />
    </Suspense>
  )
}

function NotFound() {
  return <p className="a-muted">This admin page doesn’t exist.</p>
}

export default function AdminApp() {
  const { status, user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = 'Site admin'
  }, [pathname])

  // Close the mobile menu after navigating
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  if (status === 'loading') return <div className="a-center"><Spinner label="Checking your session…" /></div>
  if (status !== 'signedIn') return <LoginPage />

  return (
    <div className="a-shell">
      <a href="#a-main" className="skip-link">Skip to content</a>
      <header className="a-topbar">
        <button
          type="button"
          className="a-icon-btn a-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="a-sidebar"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
        </button>
        <span className="a-brand">Site admin</span>
        <div className="a-topbar-actions">
          <a className="btn btn--ghost btn--sm a-view-site" href="/" target="_blank" rel="noopener noreferrer">
            View site <FiExternalLink aria-hidden="true" />
          </a>
          <ThemeToggle />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => logout(false)}>
            <FiLogOut aria-hidden="true" /> <span className="a-hide-sm">Sign out</span>
          </button>
        </div>
      </header>

      <nav id="a-sidebar" className={`a-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Admin">
        <ul>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => `a-nav-link ${isActive ? 'is-active' : ''}`}>
                <Icon aria-hidden="true" /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="a-sidebar-user a-muted a-small a-truncate">Signed in as {user.email}</p>
      </nav>

      <main id="a-main" className="a-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/content" element={<ContentListPage />} />
          <Route path="/content/:type/new" element={<EditorRoute />} />
          <Route path="/content/:type/:slug" element={<EditorRoute />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/certifications" element={<CertificationsPage />} />
          <Route path="/social" element={<SocialLinksPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
