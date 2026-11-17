import { FiMoon, FiSun } from 'react-icons/fi'
import { setTheme, useTheme } from '../../lib/theme'
import styles from './ThemeToggle.module.css'

export default function ThemeToggle({ className = '' }) {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
    </button>
  )
}
