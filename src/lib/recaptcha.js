// Google reCAPTCHA v2 ("I'm not a robot") loader. Only used when
// VITE_RECAPTCHA_SITE_KEY is set; EmailJS verifies the token server-side
// when reCAPTCHA is enabled in the template settings.
let loading = null

export function loadRecaptcha() {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    window.__onRecaptchaLoad = () => resolve(window.grecaptcha)
    const s = document.createElement('script')
    s.src = 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit'
    s.async = true
    s.defer = true
    s.onerror = () => {
      loading = null
      reject(new Error('reCAPTCHA failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}
