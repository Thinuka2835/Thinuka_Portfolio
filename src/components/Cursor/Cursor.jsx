import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import styles from './Cursor.module.css'

export default function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const move = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
      if (!visible) setVisible(true)
    }

    const down = () => setClicked(true)
    const up = () => setClicked(false)

    const over = (e) => {
      const tag = e.target.tagName.toLowerCase()
      const interactive = e.target.closest('a, button, [role="button"], input, textarea, select, [data-cursor-hover]')
      if (interactive || tag === 'a' || tag === 'button') {
        setHovered(true)
      }
    }

    const out = () => setHovered(false)

    const leave = () => setVisible(false)
    const enter = () => setVisible(true)

    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup', up)
    window.addEventListener('mouseover', over)
    window.addEventListener('mouseout', out)
    document.addEventListener('mouseleave', leave)
    document.addEventListener('mouseenter', enter)

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('mouseover', over)
      window.removeEventListener('mouseout', out)
      document.removeEventListener('mouseleave', leave)
      document.removeEventListener('mouseenter', enter)
    }
  }, [visible])

  // Hide on touch devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null

  return (
    <>
      {/* Dot (instant) */}
      <motion.div
        className={styles.dot}
        style={{ left: pos.x, top: pos.y }}
        animate={{
          scale: clicked ? 0.5 : 1,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.08 }}
      />

      {/* Ring (follows with delay) */}
      <motion.div
        className={`${styles.ring} ${hovered ? styles.ringHover : ''}`}
        animate={{
          x: pos.x - (hovered ? 24 : 18),
          y: pos.y - (hovered ? 24 : 18),
          width: hovered ? 48 : 36,
          height: hovered ? 48 : 36,
          opacity: visible ? 1 : 0,
          scale: clicked ? 0.85 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 250,
          damping: 22,
          mass: 0.5,
        }}
      />
    </>
  )
}
