// Shared Framer Motion presets so every section reveals the same way.

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const stagger = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
})

/** Props for a container that reveals its children once it scrolls into view. */
export const revealOnView = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.15 },
}
