import { motion } from 'framer-motion'
import { FiArrowUpRight } from 'react-icons/fi'
import { projects, personal } from '../../data/personalDetails'
import styles from './Projects.module.css'

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

function ProjectCard({ project }) {
  return (
    <motion.div
      className={styles.card}
      variants={cardVariants}
      whileHover={{ y: -6 }}
    >
      {/* Image area */}
      <div className={styles.cardImage}>
        {project.image
          ? <img src={project.image} alt={project.title} />
          : (
            <div className={styles.cardImagePlaceholder}>
              <span className={styles.placeholderNum}>{project.number}</span>
              <span className={styles.placeholderTitle}>{project.title.split('—')[0]?.trim()}</span>
            </div>
          )
        }
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.arrowBtn}
          aria-label={`View ${project.title}`}
        >
          <FiArrowUpRight />
        </a>
      </div>

      {/* Card body */}
      <div className={styles.cardBody}>
        <p className={styles.cardNumber}>{project.number}.</p>
        <h3 className={styles.cardTitle}>{project.title}</h3>
        <div className={styles.tagList}>
          {project.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function Projects() {
  return (
    <section id="projects" className={styles.projects}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span className={styles.plus}>+</span>
          Projects Led
          <span className={styles.plus}>+</span>
        </h2>
      </div>

      <motion.div
        className={styles.grid}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        transition={{ staggerChildren: 0.15 }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </motion.div>

      <div className={styles.footer}>
        <a
          href={personal.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="accent-btn"
        >
          View full profile <FiArrowUpRight />
        </a>
      </div>
    </section>
  )
}
