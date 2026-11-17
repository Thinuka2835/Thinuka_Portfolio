import { useState } from 'react'
import { Link } from 'react-router'
import { entriesOfType } from '../../lib/content'
import { Eyebrow, Reveal, RevealText } from '../Motion/Motion'
import LiquidImage from '../LiquidImage/LiquidImage'
import { cldSrcSet, cldUrl } from '../../../shared/cloudinary.js'
import styles from './Projects.module.css'

const PROJECTS = entriesOfType('projects')

function ProjectCard({ project, index }) {
  const [hovered, setHovered] = useState(false)
  const offset = index % 2 === 1
  const year = project.date ? project.date.slice(0, 4) : null
  return (
    <Reveal
      as="li"
      className={`${styles.item} ${offset ? styles.offset : ''}`}
      y={60}
      dur={620}
      delay={offset ? 120 : 0}
    >
      <article className={styles.card} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <LiquidImage
          className={styles.image}
          hovered={hovered}
          distortion={28}
          src={project.cover ? cldUrl(project.cover.url, { width: 1200, height: 825, crop: 'fill', gravity: 'auto' }) : undefined}
          srcSet={project.cover ? cldSrcSet(project.cover.url, [600, 900, 1200, 1600], { crop: 'fill', gravity: 'auto', aspectRatio: 16 / 11 }) : undefined}
          sizes="(min-width: 768px) 46vw, 92vw"
          alt={project.cover?.alt || ''}
          placeholderLabel={project.title}
        />
        <div className={styles.row}>
          <div>
            <h3 className={styles.name}>
              <Link to={project.path} className={styles.link}>{project.title}</Link>
            </h3>
            <p className={styles.blurb}>{project.description}</p>
          </div>
          <div className={styles.meta}>
            {year && <p className={styles.year}>{year}</p>}
            <p className={styles.outcome}>Case study ↗</p>
          </div>
        </div>
        {project.tags.length > 0 && <p className={styles.category}>{project.tags.join(' · ')}</p>}
      </article>
    </Reveal>
  )
}

export default function Projects() {
  if (PROJECTS.length === 0) return null // hidden until a case study is published
  return (
    <section id="projects" className="section" aria-labelledby="projects-title">
      <div className={styles.header}>
        <div>
          <Eyebrow>Selected Work</Eyebrow>
          <RevealText as="h2" id="projects-title" text="Projects I've led" className={`heading heading--lg ${styles.heading}`} />
        </div>
        <p className="label">{String(PROJECTS.length).padStart(2, '0')} / Projects</p>
      </div>

      <ul className={styles.grid}>
        {PROJECTS.map((p, i) => (
          <ProjectCard key={p.slug} project={p} index={i} />
        ))}
      </ul>
    </section>
  )
}
