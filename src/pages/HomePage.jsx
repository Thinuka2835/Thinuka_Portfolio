import Hero from '../components/Hero/Hero'
import Ticker from '../components/Ticker/Ticker'
import About from '../components/About/About'
import Projects from '../components/Projects/Projects'
import Stats from '../components/Stats/Stats'
import Gallery from '../components/Gallery/Gallery'
import Contact from '../components/Contact/Contact'
import { useSiteData } from '../lib/siteData'
import { useDocumentMeta } from '../lib/seo'

// Hero → Marquee → About (+ toolkit) → Projects → Impact → Certifications → Contact
export default function HomePage() {
  const { profile } = useSiteData()
  const role = `${profile.titleLine1} ${profile.titleHighlight}`.replace(/\.$/, '')
  useDocumentMeta(`${profile.name} | ${role}`)

  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Projects />
      <Stats />
      <Gallery />
      <Contact />
    </>
  )
}
