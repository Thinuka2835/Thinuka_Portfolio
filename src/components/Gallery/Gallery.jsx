import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiAward, FiX, FiMaximize2, FiExternalLink } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { lockScroll, unlockScroll } from '../../lib/scroll'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import { hasLink, externalProps } from '../../lib/links'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import SectionHeader from '../SectionHeader/SectionHeader'
import styles from './Gallery.module.css'

function Lightbox({ item, onClose }) {
  const closeRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement
    lockScroll()
    closeRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && dialogRef.current) {
        // Keep keyboard focus inside the dialog
        const focusables = dialogRef.current.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      unlockScroll()
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  return (
    <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FiX aria-hidden="true" />
        </button>
        <div className={styles.modalImage}>
          {item.image ? (
            <img
              src={cldUrl(item.image.url, { width: 900 })}
              srcSet={cldSrcSet(item.image.url, [450, 900, 1350], { maxWidth: item.image.width })}
              sizes="(min-width: 520px) 400px, 90vw"
              alt={item.image.alt || item.title}
              width={item.image.width}
              height={item.image.height}
            />
          ) : (
            <FiAward className={styles.placeholderIconLarge} aria-hidden="true" />
          )}
        </div>
        <h3 id="lightbox-title" className={styles.modalTitle}>{item.title}</h3>
        <p className={styles.modalMeta}>{[item.issuer, item.year].filter(Boolean).join(' · ')}</p>
        {hasLink(item.url) && (
          <a href={item.url} className={`btn btn--ghost btn--sm ${styles.credential}`} {...externalProps(item.url)}>
            View credential <FiExternalLink aria-hidden="true" />
          </a>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function Gallery() {
  const { certifications } = useSiteData()
  const [active, setActive] = useState(null)
  const close = useCallback(() => setActive(null), [])
  if (!certifications.length) return null

  return (
    <section id="gallery" className="section section--alt" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHeader
          id="gallery-title"
          eyebrow="Credentials"
          title="Certifications & achievements"
          intro="Formal training and recognition behind the way I run projects."
        />

        <motion.ul className={styles.grid} variants={stagger(0.07)} {...revealOnView}>
          {certifications.map((item) => (
            <motion.li key={item.id} variants={fadeUp}>
              <button type="button" className={styles.card} onClick={() => setActive(item)} aria-haspopup="dialog">
                <span className={styles.cardIcon}>
                  {item.image ? (
                    <img src={cldUrl(item.image.url, { width: 112, height: 112, crop: 'fill' })} alt="" width="56" height="56" loading="lazy" />
                  ) : (
                    <FiAward aria-hidden="true" />
                  )}
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>{item.title}</span>
                  <span className={styles.cardMeta}>{[item.issuer, item.year].filter(Boolean).join(' · ')}</span>
                </span>
                <FiMaximize2 className={styles.expand} aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <AnimatePresence>{active && <Lightbox key={active.id} item={active} onClose={close} />}</AnimatePresence>
    </section>
  )
}
