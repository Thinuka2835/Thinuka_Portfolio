// Optional Google Analytics 4. Off unless VITE_GA_MEASUREMENT_ID is set
// (never hard-code an ID). Loaded without inline scripts (CSP-safe).
//
// Privacy: Consent Mode starts as "denied" for storage, so GA sends only
// cookieless pings until consent is granted. If you add a consent banner,
// call grantAnalyticsConsent() when the visitor agrees. Only set
// VITE_GA_CONSENT_DEFAULT=granted where that is lawful for your audience.
const ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const CONSENT = import.meta.env.VITE_GA_CONSENT_DEFAULT === 'granted' ? 'granted' : 'denied'

let started = false

function gtag() {
  window.dataLayer.push(arguments) // gtag.js expects the arguments object
}

export function initAnalytics() {
  if (!ID || started || typeof window === 'undefined') return
  started = true
  window.dataLayer = window.dataLayer || []
  window.gtag = gtag
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: CONSENT,
  })
  gtag('js', new Date())
  // Page views are sent manually on every client-side navigation
  gtag('config', ID, { send_page_view: false, anonymize_ip: true })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`
  document.head.appendChild(s)
}

export function trackPageView(path) {
  if (!ID || !started) return
  gtag('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title })
}

export function grantAnalyticsConsent() {
  if (!ID || !started) return
  gtag('consent', 'update', { analytics_storage: 'granted' })
}
