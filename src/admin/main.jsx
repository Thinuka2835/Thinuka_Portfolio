import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '../styles/tokens.css'
import './admin.css'
import { AuthProvider } from './auth'
import AdminApp from './AdminApp'

// The admin is served at the configured ADMIN_PATH (first URL segment).
// It's derived at runtime so the path never has to be compiled into the code.
const basename = `/${window.location.pathname.split('/')[1] || ''}`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <AdminApp />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
