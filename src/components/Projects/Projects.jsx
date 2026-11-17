import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { FiArrowRight, FiLinkedin } from 'react-icons/fi'
import { useSiteData } from '../../lib/siteData'
import { entriesOfType } from '../../lib/content'
import { externalProps } from '../../lib/links'
import { fadeUp, revealOnView, stagger } from '../../lib/motion'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import SectionHeader from '../SectionHeader/SectionHeader'
import styles from './Projects.module.css'

const PROJECTS = entriesOfType('projects')

function ProjectCard({ project, index }) {
  const number = String(index + 1).padStart(2, '0')
  return (
    <motion.li variants={fadeUp} className={styles.item}>
      <article className={styles.card}>
        <div className={styles.media}>
          {project.cover ? (
            <img
              src={cldUrl(project.cover.url, { width: 800, height: 380, crop: 'fill', gravity: 'auto' })}
              srcSet={cldSrcSet(project.cover.url, [400, 800, 1200], { crop: 'fill', gravity: 'auto', aspectRatio: 800 / 380 })}
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
              alt={project.cover.alt || ''}
              loading="lazy"
            />
          ) : (
            <span className={styles.mediaNum} aria-hidden="true">{number}</span>
          )}
        </div>

        <div className={styles.body}>
          <p className={styles.number}>Project {number}</p>
          <h3 className={styles.title}>
            <Link to={project.path} className={styles.titleLink}>{project.title}</Link>
          </h3>
          <p className={styles.description}>{project.description}</p>
          {project.tags.length > 0 && (
            <ul className={styles.tags} aria-label="Skills and tools">
              {project.tags.map((tag) => (
                <li key={tag} className={styles.tag}>{tag}</li>
              ))}
            </ul>
          )}
          <span className={styles.link} aria-hidden="true">
            Read case study <FiArrowRight />
          </span>
        </div>
      </article>
    </motion.li>
  )
}

export default function Projects() {
  const { socialLinks } = useSiteData()
  const linkedin = socialLinks.find((s) => s.platform === 'linkedin')

  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <div className="container">
        <SectionHeader
          id="projects-title"
          eyebrow="Selected work"
          title="Projects I've led"
          intro="A few initiatives I've taken from first kickoff to final delivery."
        />

        {PROJECTS.length === 0 ? (
          <p className={styles.empty}>Case studies are on their way.</p>
        ) : (
          <motion.ul className={styles.grid} variants={stagger(0.12)} {...revealOnView}>
            {PROJECTS.map((project, i) => (
              <ProjectCard key={project.slug} project={project} index={i} />
            ))}
          </motion.ul>
        )}

        {linkedin && (
          <div className={styles.footer}>
            <a href={linkedin.url} className="btn btn--ghost" {...externalProps(linkedin.url)}>
              <FiLinkedin aria-hidden="true" /> Full history on LinkedIn
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
