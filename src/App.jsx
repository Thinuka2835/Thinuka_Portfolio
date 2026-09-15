import { useEffect } from 'react'
import Cursor from './components/Cursor/Cursor'
import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Ticker from './components/Ticker/Ticker'
import About from './components/About/About'
import Stats from './components/Stats/Stats'
import Tools from './components/Tools/Tools'
import Gallery from './components/Gallery/Gallery'
import Projects from './components/Projects/Projects'
import Contact from './components/Contact/Contact'
import Footer from './components/Footer/Footer'
import { initLenis } from './lib/scroll'

export default function App() {
  useEffect(() => {
    initLenis()
  }, [])

  return (
    <>
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        <Ticker />
        <About />
        <Stats />
        <Tools />
        <Gallery />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
