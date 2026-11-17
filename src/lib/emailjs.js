// EmailJS — PUBLIC configuration only.
//
// The service ID, template ID and public key are designed by EmailJS to be
// visible in the browser (they are "VITE_" variables and end up in the bundle).
// Your EmailJS *Private Key* (access token) is a secret: it must NEVER be put
// in a VITE_ variable or anywhere in this frontend. It isn't needed here.
//
// Abuse protection is layered:
//   • EmailJS dashboard → Account → Security: restrict allowed domains/origins
//   • EmailJS template → Settings: enable reCAPTCHA v2 verification
//     (we send the token as `g-recaptcha-response`)
//   • EmailJS dashboard rate limit + SDK limitRate/blockHeadless below
//   • A honeypot field and a minimum fill time in the form
import emailjs from '@emailjs/browser'

export const emailConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
}

export const isEmailConfigured = () => Boolean(emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey)

/** Send the contact message. Resolves only when EmailJS accepted it; rejects otherwise. */
export async function sendContactEmail({ name, email, subject, message, captchaToken }) {
  if (!isEmailConfigured()) {
    const err = new Error('not_configured')
    err.code = 'not_configured'
    throw err
  }
  const params = {
    from_name: name,
    reply_to: email,
    subject,
    message,
    page_url: window.location.href,
  }
  if (captchaToken) params['g-recaptcha-response'] = captchaToken

  const res = await emailjs.send(emailConfig.serviceId, emailConfig.templateId, params, {
    publicKey: emailConfig.publicKey,
    blockHeadless: true,
    limitRate: { id: 'contact-form', throttle: 30_000 },
  })
  if (res?.status !== 200) {
    const err = new Error(res?.text || 'send_failed')
    err.status = res?.status
    throw err
  }
  return res
}

/** Human-readable reason for a failed send. */
export function describeEmailError(err) {
  const status = err?.status
  if (err?.code === 'not_configured') return 'The contact form isn’t set up yet.'
  if (status === 429) return 'You’ve just sent a message — please wait a moment before sending another.'
  if (status === 451) return 'Automated browsers can’t use this form.'
  if (status === 400 && /recaptcha|captcha/i.test(err?.text || '')) return 'The CAPTCHA check failed. Please complete it again.'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'You appear to be offline.'
  return 'The message couldn’t be sent.'
}
