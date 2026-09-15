import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiMail, FiPhone, FiMapPin, FiSend, FiUser, FiMessageSquare } from 'react-icons/fi'
import { personal } from '../../data/personalDetails'
import styles from './Contact.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const details = [
    { icon: FiMail, label: 'Email', value: personal.email, href: `mailto:${personal.email}` },
    { icon: FiPhone, label: 'Phone', value: personal.phone, href: `tel:${personal.phone.replace(/[^+\d]/g, '')}` },
    { icon: FiMapPin, label: 'Location', value: personal.location, href: null },
  ]

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: wire this up to a form backend (e.g. Formspree, EmailJS) — currently UI-only.
    setSubmitted(true)
  }

  return (
    <section id="contact" className={styles.contact}>
      <div className={styles.header}>
        {personal.availability && (
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            {personal.availability}
          </span>
        )}
        <h2 className={styles.heading}>Let's Work Together</h2>
        <p className={styles.subheading}>
          Have a project in mind? Send a message and I'll get back to you soon.
        </p>
      </div>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.12 }}
      >
        <motion.div className={styles.details} variants={fadeUp}>
          {details.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className={styles.detailItem}>
              <span className={styles.detailIcon}><Icon /></span>
              <div>
                <p className={styles.detailLabel}>{label}</p>
                {href
                  ? <a href={href} className={styles.detailValue}>{value}</a>
                  : <p className={styles.detailValue}>{value}</p>
                }
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div className={styles.formWrap} variants={fadeUp}>
          {submitted ? (
            <div className={styles.success}>
              <p className={styles.successTitle}>Thanks, {form.name.split(' ')[0] || 'there'}!</p>
              <p className={styles.successText}>Your message has been noted. I'll get back to you soon.</p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '' }) }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}><FiUser /> Name</span>
                <input
                  type="text" name="name" required
                  value={form.name} onChange={handleChange}
                  placeholder="Your name"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}><FiMail /> Email</span>
                <input
                  type="email" name="email" required
                  value={form.email} onChange={handleChange}
                  placeholder="you@email.com"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}><FiMessageSquare /> Message</span>
                <textarea
                  name="message" required rows={5}
                  value={form.message} onChange={handleChange}
                  placeholder="Tell me about your project..."
                />
              </label>
              <button type="submit" className="accent-btn">
                Send Message <FiSend />
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </section>
  )
}
