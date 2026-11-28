import { useEffect, useRef, useState } from 'react'
import './App.css'
import nationalTheme from './assets/piano.mp3'
import HeroCover from './components/HeroCover.jsx'
import InvitationSection from './components/InvitationSection.jsx'
import ItinerarySection from './components/ItinerarySection.jsx'
import MusicControl, { MUSIC_VOLUME } from './components/MusicControl.jsx'
import RsvpSection from './components/RsvpSection.jsx'
import VenueSection from './components/VenueSection.jsx'

const OPENING_DURATION_MS = 1_250
const SCROLL_DURATION_MS = 4_500

function easeInOutCubic(progress) {
  return progress < 0.5
    ? 4 * progress ** 3
    : 1 - ((-2 * progress + 2) ** 3) / 2
}

const weddingDetails = {
  groom: 'Yoswer Avendaño',
  bride: 'Maria Rodriguez',
  date: '26/12/2026',
}

function App() {
  const audioRef = useRef(null)
  const [isOpening, setIsOpening] = useState(false)
  const [isInvitationOpen, setIsInvitationOpen] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [isNameFontReady, setIsNameFontReady] = useState(
    () => typeof document === 'undefined' || !document.fonts?.load,
  )

  useEffect(() => {
    let isMounted = true

    if (!document.fonts?.load) return undefined

    document.fonts
      .load('400 22px "Dancing Script"', `${weddingDetails.groom} ${weddingDetails.bride}`)
      .catch(() => [])
      .then(() => {
        if (isMounted) setIsNameFontReady(true)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isOpening) return undefined

    const openingTimer = window.setTimeout(() => setIsInvitationOpen(true), OPENING_DURATION_MS)
    return () => window.clearTimeout(openingTimer)
  }, [isOpening])

  useEffect(() => {
    if (!isInvitationOpen) return undefined

    let animationFrameId
    const scrollTimer = window.setTimeout(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const invitationSection = document.getElementById('invitacion')
      if (!invitationSection) return

      if (prefersReducedMotion) {
        invitationSection.scrollIntoView({ behavior: 'auto', block: 'start' })
        return
      }

      const startY = window.scrollY
      const targetY = startY + invitationSection.getBoundingClientRect().top
      const startTime = performance.now()

      function animateScroll(currentTime) {
        const progress = Math.min((currentTime - startTime) / SCROLL_DURATION_MS, 1)
        const easedProgress = easeInOutCubic(progress)
        window.scrollTo(0, startY + (targetY - startY) * easedProgress)

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animateScroll)
        }
      }

      animationFrameId = window.requestAnimationFrame(animateScroll)
    }, 160)

    return () => {
      window.clearTimeout(scrollTimer)
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId)
    }
  }, [isInvitationOpen])

  function openInvitation() {
    if (isOpening || isInvitationOpen) return

    setIsOpening(true)
    const audio = audioRef.current
    if (audio) {
      audio.volume = MUSIC_VOLUME
      audio.play().catch(() => {})
    }
  }

  return (
    <>
      <audio
        loop
        onPause={() => setIsMusicPlaying(false)}
        onPlay={() => setIsMusicPlaying(true)}
        preload="auto"
        ref={audioRef}
        src={nationalTheme}
      />
      <main className={!isInvitationOpen ? 'invitation-page invitation-page--intro' : 'invitation-page'}>
        <HeroCover
          groom={weddingDetails.groom}
          bride={weddingDetails.bride}
          date={weddingDetails.date}
          isOpening={isOpening}
          isOpened={isInvitationOpen}
          isNameFontReady={isNameFontReady}
          onOpen={openInvitation}
        />

        {isInvitationOpen && (
          <>
            <header className="site-header">
              <a className="wordmark" href="#portada">Nuestra historia</a>
              <nav className="site-nav" aria-label="Navegación principal">
                <a href="#itinerario">Itinerario</a>
                <a href="#lugar">Lugar</a>
                <a href="#confirmacion">RSVP</a>
              </nav>
            </header>

            <InvitationSection />

            <ItinerarySection />

            <VenueSection />

            <RsvpSection />

            <footer className="site-footer">
              <span>{weddingDetails.groom} & {weddingDetails.bride}</span>
              <span>{weddingDetails.date}</span>
            </footer>
          </>
        )}
      </main>
      {isInvitationOpen && <MusicControl audioRef={audioRef} isPlaying={isMusicPlaying} />}
    </>
  )
}

export default App
