import Cursor from './components/Cursor/Cursor'
import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Ticker from './components/Ticker/Ticker'
import About from './components/About/About'
import Tools from './components/Tools/Tools'
import Projects from './components/Projects/Projects'
import Footer from './components/Footer/Footer'

export default function App() {
  return (
    <>
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        <Ticker />
        <About />
        <Tools />
        <Projects />
      </main>
      <Footer />
    </>
  )
}
