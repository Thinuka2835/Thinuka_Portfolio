import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

let lenis = null
let rafId = null
let lockCount = 0
let pendingScroll = null

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Start inertia-smoothed scrolling. Skipped for users who prefer reduced motion. */
export function initLenis() {
  if (lenis || typeof window === 'undefined' || prefersReducedMotion()) return lenis
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })
  const raf = (time) => {
    lenis?.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
  return lenis
}

export function destroyLenis() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  lenis?.destroy()
  lenis = null
}

/**
 * Smooth-scroll to an element id on the current page. The fixed-header offset
 * comes from each section's CSS `scroll-margin-top` (honoured by Lenis and
 * scrollIntoView). Returns false if the element isn't on this page.
 */
export function scrollToSection(id, { immediate = false } = {}) {
  const el = document.getElementById(id)
  if (!el) return false
  if (lockCount > 0) {
    pendingScroll = id
    return true
  }
  if (lenis) lenis.scrollTo(el, { immediate })
  else el.scrollIntoView({ behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' })
  return true
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

/**
 * Click handler for links to home-page sections that works from any route:
 * scrolls on the home page, otherwise navigates to "/#id".
 */
export function useSectionLink() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useCallback(
    (id, after) => (e) => {
      e.preventDefault()
      after?.()
      if (pathname === '/') {
        if (id === 'hero') scrollToTop()
        else scrollToSection(id)
        window.history.replaceState(null, '', id === 'hero' ? '/' : `/#${id}`)
      } else {
        navigate(id === 'hero' ? '/' : `/#${id}`)
      }
    },
    [navigate, pathname]
  )
}

/** Freeze page scrolling (modals, mobile menu). Calls are reference-counted. */
export function lockScroll() {
  lockCount += 1
  if (lockCount > 1) return
  lenis?.stop()
  document.documentElement.style.overflow = 'hidden'
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount > 0) return
  lenis?.start()
  document.documentElement.style.overflow = ''
  if (pendingScroll) {
    const id = pendingScroll
    pendingScroll = null
    scrollToSection(id)
  }
}
