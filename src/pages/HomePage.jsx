import Hero from '../components/Hero/Hero'
import Ticker from '../components/Ticker/Ticker'
import About from '../components/About/About'
import Stats from '../components/Stats/Stats'
import Tools from '../components/Tools/Tools'
import Gallery from '../components/Gallery/Gallery'
import Projects from '../components/Projects/Projects'
import Contact from '../components/Contact/Contact'
import { useSiteData } from '../lib/siteData'
import { useDocumentMeta } from '../lib/seo'

export default function HomePage() {
  const { profile } = useSiteData()
  const role = `${profile.titleLine1} ${profile.titleHighlight}`.replace(/\.$/, '')
  useDocumentMeta(`${profile.name} | ${role}`)

  return (
    <>
      <Hero />
      <Ticker />
      <About />
      <Stats />
      <Tools />
      <Gallery />
      <Projects />
      <Contact />
    </>
  )
}
