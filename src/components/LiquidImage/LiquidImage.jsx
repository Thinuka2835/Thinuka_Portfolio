// Image with a liquid SVG-displacement hover (spring tension 140 / friction 13),
// plus — unless `bare` — a grayscale→colour reveal, accent glow sweep and vignette.
import { useEffect, useId, useRef, useState } from 'react'
import { createSpring } from '../../lib/motion'
import styles from './LiquidImage.module.css'

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches

export default function LiquidImage({
  src,
  srcSet,
  sizes,
  alt = '',
  width,
  height,
  bare = false,
  distortion = 28,
  fit = 'cover',
  position = 'center',
  placeholderLabel,
  hovered: hoveredProp,
  loading = 'lazy',
  fetchPriority,
  className = '',
  style,
}) {
  const rawId = useId()
  const filterId = `liquid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const dispRef = useRef(null)
  const turbRef = useRef(null)
  const [hoverSelf, setHoverSelf] = useState(false)
  const [failed, setFailed] = useState(false)
  const hovered = hoveredProp ?? hoverSelf
  const springs = useRef(null)

  useEffect(() => {
    // Attributes are written imperatively each frame — never via CSS strings
    const scale = createSpring(1, { tension: 140, friction: 13, onUpdate: (v) => dispRef.current?.setAttribute('scale', v.toFixed(2)) })
    const freq = createSpring(0.009, {
      tension: 140,
      friction: 13,
      onUpdate: (v) => turbRef.current?.setAttribute('baseFrequency', Math.max(0.001, v).toFixed(4)),
    })
    springs.current = { scale, freq }
    return () => {
      scale.stop()
      freq.stop()
    }
  }, [])

  useEffect(() => {
    if (!springs.current) return
    const active = hovered && canHover()
    springs.current.scale.set(active ? distortion : 1)
    springs.current.freq.set(active ? 0.022 : 0.009)
  }, [hovered, distortion])

  const showImage = src && !failed
  return (
    <figure
      className={`${styles.figure} ${bare ? styles.bare : ''} ${hovered ? styles.hovered : ''} ${className}`}
      style={style}
      onMouseEnter={() => setHoverSelf(true)}
      onMouseLeave={() => setHoverSelf(false)}
    >
      <svg className={styles.svg} aria-hidden="true" focusable="false">
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0.009" numOctaves="2" result="noise" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {!bare && <div className={styles.placeholder} aria-hidden="true">{!showImage && placeholderLabel && <span>{placeholderLabel}</span>}</div>}

      {showImage && (
        <img
          className={styles.media}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          onError={() => setFailed(true)}
          style={{ filter: `url(#${filterId})`, objectFit: fit, objectPosition: position }}
        />
      )}

      {!bare && (
        <>
          <div className={styles.veil} aria-hidden="true" />
          <div className={styles.glow} aria-hidden="true" />
          <div className={styles.vignette} aria-hidden="true" />
        </>
      )}
    </figure>
  )
}
