import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiAward, FiX } from 'react-icons/fi'
import { gallery } from '../../data/personalDetails'
import styles from './Gallery.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

export default function Gallery() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!active) return
    const onKey = (e) => { if (e.key === 'Escape') setActive(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <section id="gallery" className={styles.gallery}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.plus}>+</span>
          Certifications & Achievements
          <span className={styles.plus}>+</span>
        </h2>
      </div>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.08 }}
      >
        {gallery.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            className={styles.card}
            variants={fadeUp}
            whileHover={{ y: -6 }}
            onClick={() => setActive(item)}
          >
            <div className={styles.cardImage}>
              {item.image
                ? <img src={item.image} alt={item.title} />
                : <FiAward className={styles.placeholderIcon} />
              }
            </div>
            <div className={styles.cardBody}>
              <p className={styles.cardTitle}>{item.title}</p>
              <p className={styles.cardMeta}>{item.issuer} · {item.year}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {active && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActive(null)}
                aria-label="Close"
              >
                <FiX />
              </button>
              <div className={styles.modalImage}>
                {active.image
                  ? <img src={active.image} alt={active.title} />
                  : <FiAward className={styles.placeholderIconLarge} />
                }
              </div>
              <h3 className={styles.modalTitle}>{active.title}</h3>
              <p className={styles.modalMeta}>{active.issuer} · {active.year}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
