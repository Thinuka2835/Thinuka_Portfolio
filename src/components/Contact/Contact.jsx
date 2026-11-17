import { useEffect, useId, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { FiMail, FiPhone, FiMapPin, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { describeEmailError, emailConfig, isEmailConfigured, sendContactEmail } from '../../lib/emailjs'
import { loadRecaptcha } from '../../lib/recaptcha'
import { useTheme } from '../../lib/theme'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import SectionHeader from '../SectionHeader/SectionHeader'
import styles from './Contact.module.css'

const EMPTY = { name: '', email: '', subject: '', message: '', website: '' }
const LIMITS = { name: 100, email: 150, subject: 150, message: 5000 }
const MIN_FILL_MS = 3000

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Please enter your name.'
  if (!form.email.trim()) errors.email = 'Please enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errors.email = 'Please enter a valid email address.'
  if (!form.subject.trim()) errors.subject = 'Please add a subject.'
  if (form.message.trim().length < 10) errors.message = 'Please write at least 10 characters.'
  for (const [k, max] of Object.entries(LIMITS)) {
    if (form[k].length > max) errors[k] = `Please keep this under ${max} characters.`
  }
  return errors
}

function Field({ id, label, error, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

export default function Contact() {
  const { profile } = useSiteData()
  const theme = useTheme()
  const uid = useId()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  // idle | sending | sent | error
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const sendingRef = useRef(false) // blocks double-submits even before re-render
  const startedAt = useRef(0)
  const formRef = useRef(null)
  const captchaRef = useRef(null)
  const captchaWidget = useRef(null)
  const sectionRef = useRef(null)
  const inView = useInView(sectionRef, { once: true, margin: '200px' })
  const [captchaState, setCaptchaState] = useState(emailConfig.recaptchaSiteKey ? 'loading' : 'off')

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  // Load reCAPTCHA only when the contact section is about to be seen
  useEffect(() => {
    if (!emailConfig.recaptchaSiteKey || !inView || captchaWidget.current !== null) return
    let cancelled = false
    loadRecaptcha()
      .then((g) => {
        if (cancelled || !captchaRef.current) return
        captchaWidget.current = g.render(captchaRef.current, { sitekey: emailConfig.recaptchaSiteKey, theme })
        setCaptchaState('ready')
      })
      .catch(() => !cancelled && setCaptchaState('failed'))
    return () => {
      cancelled = true
    }
  }, [inView, theme])

  const details = [
    profile.email && { icon: FiMail, label: 'Email', value: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { icon: FiPhone, label: 'Phone', value: profile.phone, href: `tel:${profile.phone.replace(/[^+\d]/g, '')}` },
    profile.location && { icon: FiMapPin, label: 'Location', value: profile.location },
  ].filter(Boolean)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const fail = (message) => {
    setErrorMessage(message)
    setStatus('error')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sendingRef.current) return

    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) {
      formRef.current?.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    // Bots: hidden honeypot filled, or form completed implausibly fast
    if (form.website || Date.now() - startedAt.current < MIN_FILL_MS) {
      return fail('The message couldn’t be sent. Please try again in a moment.')
    }

    let captchaToken
    if (emailConfig.recaptchaSiteKey) {
      captchaToken = captchaWidget.current !== null ? window.grecaptcha?.getResponse(captchaWidget.current) : ''
      if (!captchaToken) {
        setErrors((er) => ({ ...er, captcha: 'Please confirm you’re not a robot.' }))
        return
      }
    }

    sendingRef.current = true
    setStatus('sending')
    try {
      await sendContactEmail({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        captchaToken,
      })
      setStatus('sent')
    } catch (err) {
      fail(describeEmailError(err))
    } finally {
      sendingRef.current = false
      if (captchaWidget.current !== null) window.grecaptcha?.reset(captchaWidget.current)
    }
  }

  const reset = () => {
    setForm(EMPTY)
    setErrors({})
    setStatus('idle')
    startedAt.current = Date.now()
  }

  const firstName = form.name.trim().split(' ')[0] || 'there'
  const configured = isEmailConfigured()
  const ids = Object.fromEntries(['name', 'email', 'subject', 'message'].map((k) => [k, `${uid}-${k}`]))
  const describedBy = (k) => (errors[k] ? `${ids[k]}-error` : undefined)

  return (
    <section ref={sectionRef} id="contact" className="section section--alt" aria-labelledby="contact-title">
      <div className="container">
        <SectionHeader
          id="contact-title"
          eyebrow="Contact"
          title="Let's work together"
          intro="Have a project in mind or a team that needs a steady hand? Send a message and I'll get back to you soon."
        />

        <motion.div className={styles.grid} variants={stagger(0.12)} {...revealOnView}>
          <motion.div className={styles.aside} variants={fadeUp}>
            {profile.availability && (
              <p className={styles.badge}>
                <span className={styles.badgeDot} aria-hidden="true" />
                {profile.availability}
              </p>
            )}
            {details.length > 0 && (
              <ul className={styles.details}>
                {details.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className={styles.detailItem}>
                    <span className={styles.detailIcon}><Icon aria-hidden="true" /></span>
                    <span>
                      <span className={styles.detailLabel}>{label}</span>
                      {href ? <a href={href} className={styles.detailValue}>{value}</a> : <span className={styles.detailValue}>{value}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div className={styles.formWrap} variants={fadeUp}>
            <div aria-live="polite" aria-atomic="true">
              {status === 'sent' && (
                <div className={styles.result}>
                  <FiCheckCircle className={styles.resultIcon} aria-hidden="true" />
                  <p className={styles.resultTitle}>Thanks, {firstName}!</p>
                  <p className={styles.resultText}>Your message was sent. I’ll reply to {form.email.trim()} as soon as I can.</p>
                  <button type="button" className="btn btn--ghost" onClick={reset}>
                    Write another message
                  </button>
                </div>
              )}
            </div>

            {status !== 'sent' && (
              <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby={!configured ? `${uid}-unconfigured` : undefined}>
                {!configured && (
                  <p id={`${uid}-unconfigured`} className={styles.notice}>
                    <FiAlertCircle aria-hidden="true" />
                    <span>
                      The contact form isn’t connected yet.
                      {profile.email && (
                        <> Please email <a href={`mailto:${profile.email}`}>{profile.email}</a> directly.</>
                      )}
                    </span>
                  </p>
                )}

                <div className={styles.row}>
                  <Field id={ids.name} label="Name" error={errors.name}>
                    <input id={ids.name} name="name" type="text" autoComplete="name" maxLength={LIMITS.name} value={form.name} onChange={handleChange} aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} required />
                  </Field>
                  <Field id={ids.email} label="Email" error={errors.email}>
                    <input id={ids.email} name="email" type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} value={form.email} onChange={handleChange} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} required />
                  </Field>
                </div>
                <Field id={ids.subject} label="Subject" error={errors.subject}>
                  <input id={ids.subject} name="subject" type="text" maxLength={LIMITS.subject} value={form.subject} onChange={handleChange} aria-invalid={Boolean(errors.subject)} aria-describedby={describedBy('subject')} required />
                </Field>
                <Field id={ids.message} label="Message" error={errors.message}>
                  <textarea id={ids.message} name="message" rows={6} maxLength={LIMITS.message} value={form.message} onChange={handleChange} aria-invalid={Boolean(errors.message)} aria-describedby={describedBy('message')} data-lenis-prevent required />
                </Field>

                {/* Honeypot: invisible to people, tempting to bots */}
                <div className={styles.honeypot} aria-hidden="true">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
                </div>

                {captchaState !== 'off' && (
                  <div className={styles.captcha}>
                    <div ref={captchaRef} />
                    {captchaState === 'failed' && <p className={styles.fieldError}>The CAPTCHA couldn’t load. Check your connection or disable blockers for this site.</p>}
                    {errors.captcha && <p className={styles.fieldError} role="alert">{errors.captcha}</p>}
                  </div>
                )}

                {status === 'error' && (
                  <p className={styles.error} role="alert">
                    <FiAlertCircle aria-hidden="true" />
                    <span>
                      {errorMessage}{' '}
                      {profile.email ? (
                        <>You can also email <a href={`mailto:${profile.email}`}>{profile.email}</a>.</>
                      ) : (
                        'Please try again later.'
                      )}
                    </span>
                  </p>
                )}

                <button type="submit" className="btn btn--primary" disabled={status === 'sending' || !configured} aria-disabled={status === 'sending' || !configured}>
                  {status === 'sending' ? 'Sending…' : 'Send message'} <FiSend aria-hidden="true" />
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
