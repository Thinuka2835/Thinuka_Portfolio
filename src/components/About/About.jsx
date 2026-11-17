import { FiArrowUpRight } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { hasLink, externalProps } from '../../lib/links'
import { Eyebrow, Reveal, RevealText } from '../Motion/Motion'
import Tools from '../Tools/Tools'
import styles from './About.module.css'

/** "The Story" layout: heading + bio on the left, the toolkit as a numbered list on the right. */
export default function About() {
  const { profile } = useSiteData()
  const heading = `${profile.greeting} ${profile.name}.`.trim()

  return (
    <section id="about" className={`section ${styles.about}`} aria-labelledby="about-title">
      <div className={styles.grid}>
        <div className={styles.left}>
          <Eyebrow>About Me</Eyebrow>
          <RevealText as="h2" id="about-title" text={heading} className={`heading heading--lg ${styles.heading}`} />
          <Reveal as="p" className={styles.bio} dur={520}>
            {profile.bio}
          </Reveal>
          {hasLink(profile.resumeUrl) && (
            <Reveal delay={120} dur={520}>
              <a href={profile.resumeUrl} className={styles.resume} {...externalProps(profile.resumeUrl)}>
                Download résumé <FiArrowUpRight aria-hidden="true" />
              </a>
            </Reveal>
          )}
        </div>
        <div id="tools" className={styles.right}>
          <Tools />
        </div>
      </div>
    </section>
  )
}
