import Lenis from 'lenis'

let lenis = null

export function initLenis() {
  if (lenis) return lenis

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  return lenis
}

export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) {
    lenis.scrollTo(el)
  } else {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
