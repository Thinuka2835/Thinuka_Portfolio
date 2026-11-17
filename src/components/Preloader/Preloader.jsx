// Cinematic intro: counts 0→100 over 2s, fades its labels, then wipes up.
// Shown only on the first load of the home page (never with reduced motion).
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { lockScroll, unlockScroll } from '../../lib/scroll'
import { prefersReducedMotion } from '../../lib/motion'
import styles from './Preloader.module.css'

const COUNT_MS = 2000
const FADE_MS = 300
const GAP_MS = 200
const WIPE_MS = 650

/** Hero entrance baseline: count (2000) + ~500ms of the fade/wipe. */
export const REVEAL_DELAY = 2500

// Decided once per page load, before anything renders (client only)
const willShow =
  typeof window !== 'undefined' && window.location.pathname === '/' && !prefersReducedMotion()
let shown = false

/** True only while this page load's preloader is (or is about to be) on screen. */
export const preloaderActive = () => willShow && !shown

export default function Preloader({ name }) {
  // Same decision on the server (pre-rendering) and in the browser, so hydration
  // matches; reduced-motion users skip it in the effect below (and via CSS).
  const { pathname } = useLocation()
  const [active] = useState(() => !shown && pathname === '/')
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState('count') // count | fade | wipe | done
  const counterRef = useRef(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!active) return
    shown = true
    // Reduced motion: CSS keeps it display:none; don't lock scrolling or animate
    if (prefersReducedMotion()) {
      doneRef.current = true
      return
    }
    lockScroll()
    window.scrollTo(0, 0)
    const start = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / COUNT_MS)
      setCount(Math.round(p * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const t1 = setTimeout(() => setPhase('fade'), COUNT_MS)
    const t2 = setTimeout(() => setPhase('wipe'), COUNT_MS + FADE_MS + GAP_MS)
    const t3 = setTimeout(() => {
      doneRef.current = true
      setPhase('done')
      unlockScroll()
    }, COUNT_MS + FADE_MS + GAP_MS + WIPE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (!doneRef.current) unlockScroll()
    }
  }, [active])

  if (!active || phase === 'done') return null

  return (
    <div data-preloader className={`${styles.preloader} ${phase === 'wipe' ? styles.wipe : ''}`} role="status" aria-label="Loading">
      <div className={styles.bg} aria-hidden="true" />
      <p className={`${styles.brand} ${phase !== 'count' ? styles.fade : ''}`}>{name}</p>
      <p ref={counterRef} className={`${styles.counter} ${phase !== 'count' ? styles.fade : ''}`} aria-hidden="true">
        {count}
        <span className={styles.percent}>%</span>
      </p>
    </div>
  )
}
