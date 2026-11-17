// Motion helpers: in-view triggers, a real spring integrator, adaptive grid.
import { useEffect, useState } from 'react'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** True once the element has entered the viewport (threshold 0, plays once). */
export function useInViewOnce(ref, { enabled = true } = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!enabled || inView) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, enabled, inView])
  return inView
}

/** True `delay` ms after mount (hero sequencing). */
export function useDelayedFlag(delay) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return on
}

/**
 * Spring with react-spring semantics (tension = stiffness, friction = damping,
 * mass 1). Retargeting keeps velocity, so hover in/out feels physical.
 */
export function createSpring(value, { tension = 170, friction = 26, onUpdate }) {
  let current = value
  let velocity = 0
  let target = value
  let raf = null
  let last = 0

  const step = (now) => {
    const dt = Math.min(0.064, (now - last) / 1000 || 0.016)
    last = now
    // Sub-steps keep stiff springs stable
    const steps = Math.ceil(dt / 0.004)
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const force = -tension * (current - target) - friction * velocity
      velocity += force * h
      current += velocity * h
    }
    onUpdate(current)
    if (Math.abs(velocity) < 0.0005 && Math.abs(current - target) < 0.0005) {
      current = target
      onUpdate(current)
      raf = null
      return
    }
    raf = requestAnimationFrame(step)
  }

  return {
    set(next) {
      target = next
      if (raf === null) {
        last = performance.now()
        raf = requestAnimationFrame(step)
      }
    },
    stop() {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
    },
  }
}

/** Above 1920px, scale the root font-size up (damped) so the rem layout keeps growing. */
export function applyAdaptiveGrid() {
  const FONT_BASE = 16
  const BASE_W = 1920
  const COEF = 0.6666
  const w = window.innerWidth
  const reduction = ((BASE_W - w) / BASE_W) * 100 * COEF
  const size = FONT_BASE - (FONT_BASE * reduction) / 100
  if (size > FONT_BASE) document.documentElement.style.fontSize = `${size}px`
  else document.documentElement.style.removeProperty('font-size')
}
