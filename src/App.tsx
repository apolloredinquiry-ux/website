import { useEffect, useState } from 'react'
import { FaArrowUp } from 'react-icons/fa'
import About from './components/About'
import Background from './components/Background'
import GalleryImage from './components/GalleryImage'
import Hero from './components/Hero'
import { useDisplayName } from './useDiscordPresence'
import useSectionPaging from './useSectionPaging'

export default function App() {
  const [entered, setEntered] = useState(false)
  const name = useDisplayName()

  useSectionPaging(entered)

  useEffect(() => {
    document.title = `@${name} | apollo.ceo`
  }, [name])

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    document.body.style.overflow = entered ? '' : 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [entered])

  const enter = () => {
    const audio = document.querySelector<HTMLAudioElement>('audio[data-track]')
    if (audio) {
      audio.currentTime = 0
      void audio.play().catch(() => {})
    }
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    setEntered(true)
  }

  const backToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }

  return (
    <>
      <Background />

      <main>
        <Hero />
        <About />

        <div className="media-panel" id="gallery">
          <GalleryImage />

          <footer className="site-footer">
            <span className="footer-mark">
              {name}<span className="footer-dot">.</span>
            </span>
            <div className="footer-row">
              <span>© 2026 {name}</span>
              <button className="back-to-top" type="button" onClick={backToTop}>
                Back to top <FaArrowUp aria-hidden="true" />
              </button>
            </div>
          </footer>
        </div>
      </main>

      {!entered && (
        <button
          className="entry-screen"
          type="button"
          aria-label="Click to enter"
          onClick={enter}
        >
          <span className="entry-label">click to enter</span>
        </button>
      )}
    </>
  )
}
