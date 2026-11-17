// Theme state. The initial theme is applied before React loads (vite/theme-init.js).
// An explicit choice is remembered; until then the site follows the OS setting live.
import { useSyncExternalStore } from 'react'

const KEY = 'theme'
const listeners = new Set()

export const getTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')

function apply(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  listeners.forEach((fn) => fn())
}

export function setTheme(theme) {
  apply(theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage blocked: the choice lasts for this page view */
  }
}

function hasExplicitChoice() {
  try {
    return ['light', 'dark'].includes(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

// Follow OS changes until the user picks a theme themselves
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!hasExplicitChoice()) apply(e.matches ? 'light' : 'dark')
  })
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const useTheme = () => useSyncExternalStore(subscribe, getTheme, () => 'dark')
