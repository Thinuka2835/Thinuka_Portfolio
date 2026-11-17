import { useLayoutEffect, useRef, useState } from 'react'
import { useSiteData } from '../../lib/siteData'
import { useDelayedFlag } from '../../lib/motion'
import { Reveal, RevealText } from '../Motion/Motion'
import LiquidImage from '../LiquidImage/LiquidImage'
import { preloaderActive, REVEAL_DELAY } from '../Preloader/Preloader'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import defaultPhoto from '../../assets/user.webp'
import styles from './Hero.module.css'

// Intrinsic size of the bundled default photo (user.webp, a transparent cutout)
const DEFAULT_PHOTO = { url: defaultPhoto, width: 656, height: 1338, alt: '' }

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Shrinks the giant name only when its widest line would overflow the viewport. */
function useFitText(ref, deps) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.setProperty('--fit', '1')
      const avail = el.clientWidth
      const widest = Math.max(...[...el.querySelectorAll('[data-fit-line]')].map((l) => l.scrollWidth))
      el.style.setProperty('--fit', String(widest > avail ? avail / widest : 1))
    }
    fit()
    document.fonts?.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function Quote({ text, word }) {
  if (!word) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(word)})`, 'i'))
  return parts.map((p, i) => (p.toLowerCase() === word.toLowerCase() ? <strong key={i}>{p}</strong> : p))
}

export default function Hero() {
  const { profile } = useSiteData()
  // Waits for the preloader on first load; near-instant on later visits
  const [base] = useState(() => (preloaderActive() ? REVEAL_DELAY : 150))
  const nameOn = useDelayedFlag(base)
  const rolesOn = useDelayedFlag(base + 200)
  const descOn = useDelayedFlag(base + 400)
  const cueOn = useDelayedFlag(base + 900)

  const nameLines = profile.name.split(/\s+/).filter(Boolean)
  const title = `${profile.titleLine1} ${profile.titleHighlight}`.trim()
  const roles = profile.role.split('·').map((r) => r.trim()).filter(Boolean)
  const photo = profile.heroImage || DEFAULT_PHOTO

  const nameRef = useRef(null)
  useFitText(nameRef, [profile.name])

  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-name">
      <div className={styles.top}>
        <RevealText
          as="h2"
          className={styles.roles}
          lines={[title, ...roles]}
          play={rolesOn}
          stagger={80}
          dur={760}
        />
        <Reveal as="p" className={styles.desc} play={descOn} y={16} dur={520}>
          <Quote text={profile.quote} word={profile.highlightedWord} />
        </Reveal>
      </div>

      <div className={styles.portrait}>
        <LiquidImage
          bare
          className={styles.portraitImage}
          src={cldUrl(photo.url, { height: 1600 })}
          srcSet={cldSrcSet(photo.url, [800, 1200, 1600], { maxWidth: photo.width })}
          sizes="(min-width: 1024px) 36vw, (min-width: 640px) 48vw, 80vw"
          alt={photo.alt || `Portrait of ${profile.name}`}
          width={photo.width}
          height={photo.height}
          fit="contain"
          position="center bottom"
          distortion={30}
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <div className={styles.base} aria-hidden="true" />

      <h1 id="hero-name" ref={nameRef} className={styles.name}>
        <RevealText mode="letters" lines={nameLines} play={nameOn} stagger={52} lineDelay={240} dur={900} from="100%" className={styles.nameInner} />
        {/* Hidden copy used only to measure each line's natural width */}
        <span className={styles.measure} aria-hidden="true">
          {nameLines.map((l) => (
            <span key={l} data-fit-line>{l}</span>
          ))}
        </span>
      </h1>

      <Reveal className={styles.cue} play={cueOn} y={0} dur={600}>
        <span className={styles.cueRule} aria-hidden="true" />
        Scroll to enter
      </Reveal>
    </section>
  )
}
