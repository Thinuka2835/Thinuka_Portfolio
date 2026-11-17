// Spring-feel reveal primitives (CSS transitions with spring-equivalent timings).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useInViewOnce } from '../../lib/motion'

/** Fade + slide-up block. `play` overrides the in-view trigger (e.g. hero timing). */
export function Reveal({ as: Tag = 'div', play, y = 16, scale = 1, delay = 0, dur = 560, ease = 'var(--ease-expo)', className = '', style, children, ...rest }) {
  const ref = useRef(null)
  const inView = useInViewOnce(ref, { enabled: play === undefined })
  const on = play ?? inView
  return (
    <Tag
      ref={ref}
      className={`reveal ${on ? 'is-in' : ''} ${className}`}
      style={{ '--y': `${y}px`, '--s': scale, '--delay': `${delay}ms`, '--dur': `${dur}ms`, '--ease': ease, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Split-text reveal.
 *  mode="lines"   words rise together per rendered line (lines measured from layout)
 *  mode="letters" explicit `lines`, letter-by-letter
 *  mode="words"   word-by-word, small rise (replay by changing `key`)
 * Screen readers get the plain text (visually hidden); the split spans are aria-hidden.
 */
export function RevealText({
  as: Tag = 'span',
  text,
  lines,
  mode = 'lines',
  play,
  delay = 0,
  stagger,
  lineDelay = 240,
  dur,
  ease,
  from,
  animateOnMount = false,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null)
  const inView = useInViewOnce(ref, { enabled: play === undefined })
  // animateOnMount: render hidden first, arm next frame (lets a remount replay)
  const [armed, setArmed] = useState(!animateOnMount)
  useEffect(() => {
    if (!animateOnMount) return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)))
    return () => cancelAnimationFrame(raf)
  }, [animateOnMount])
  const on = (play ?? inView) && armed

  const defaults = {
    lines: { stagger: 90, dur: 900, ease: 'var(--ease-expo)', from: '110%' },
    letters: { stagger: 52, dur: 900, ease: 'var(--ease-expo)', from: '100%' },
    words: { stagger: 22, dur: 520, ease: 'var(--ease-quart)', from: '18px' },
  }[mode]
  const st = stagger ?? defaults.stagger
  const vars = { '--dur': `${dur ?? defaults.dur}ms`, '--ease': ease ?? defaults.ease, '--from': from ?? defaults.from }

  // Lines mode: group words by their rendered line, then delay per line
  useLayoutEffect(() => {
    if (mode !== 'lines' || lines) return
    const root = ref.current
    if (!root) return
    const measure = () => {
      const masks = [...root.querySelectorAll('.rt-mask')]
      let line = -1
      let lastTop = null
      for (const m of masks) {
        if (lastTop === null || Math.abs(m.offsetTop - lastTop) > 2) {
          line += 1
          lastTop = m.offsetTop
        }
        m.firstChild.style.setProperty('--d', `${delay + line * st}ms`)
      }
    }
    measure()
    if (on) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [mode, lines, text, delay, st, on])

  const label = text ?? (lines ? lines.join(' ') : undefined)
  let content
  if (lines) {
    content = lines.map((line, li) =>
      mode === 'letters' ? (
        <span key={li} className="rt-line">
          {[...line].map((ch, ci) => (
            <span key={ci} className="rt-unit" style={{ '--d': `${delay + li * lineDelay + ci * st}ms` }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      ) : (
        <span key={li} className="rt-line">
          <span className="rt-unit" style={{ '--d': `${delay + li * st}ms` }}>{line}</span>
        </span>
      )
    )
  } else {
    const words = String(text).split(/\s+/).filter(Boolean)
    content = words.map((w, i) => (
      <span key={i}>
        <span className={mode === 'words' ? 'rt-word' : 'rt-mask'} style={mode === 'words' ? { display: 'inline-block' } : undefined}>
          <span className="rt-unit" style={mode === 'words' ? { '--d': `${delay + i * st}ms` } : undefined}>
            {children ? children(w, i) : w}
          </span>
        </span>
        {i < words.length - 1 ? ' ' : ''}
      </span>
    ))
  }

  return (
    <Tag ref={ref} className={`${on ? 'is-in' : ''} ${className}`} style={vars} {...rest}>
      <span className="visually-hidden">{label}</span>
      <span aria-hidden="true">{content}</span>
    </Tag>
  )
}

/** Uppercase label with an accent dot. */
export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`eyebrow ${className}`}>
      <span className="eyebrow-dot" aria-hidden="true" />
      {children}
    </p>
  )
}
