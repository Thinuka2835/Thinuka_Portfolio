import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import styles from './Cursor.module.css'

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, [data-cursor-hover]'
const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export default function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  // Position lives in motion values, so moving the mouse never re-renders React
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const ringX = useSpring(x, { stiffness: 420, damping: 32, mass: 0.4 })
  const ringY = useSpring(y, { stiffness: 420, damping: 32, mass: 0.4 })

  // Only enable for a real mouse/trackpad — re-checked if the input device changes
  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER)
    const update = () => setEnabled(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-custom-cursor')

    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
    }
    const over = (e) => setHovered(Boolean(e.target.closest?.(INTERACTIVE)))
    const down = () => setPressed(true)
    const up = () => setPressed(false)
    const leave = () => setVisible(false)

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    root.addEventListener('pointerleave', leave)

    return () => {
      root.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      root.removeEventListener('pointerleave', leave)
    }
  }, [enabled, x, y])

  if (!enabled) return null

  return (
    <div aria-hidden="true">
      <motion.div
        className={styles.dot}
        style={{ x, y }}
        animate={{ scale: pressed ? 0.5 : hovered ? 0 : 1, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        className={`${styles.ring} ${hovered ? styles.ringHover : ''}`}
        style={{ x: ringX, y: ringY }}
        animate={{ scale: pressed ? 0.8 : hovered ? 1.45 : 1, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </div>
  )
}
