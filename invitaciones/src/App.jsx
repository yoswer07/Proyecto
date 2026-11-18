import './App.css'
import HeroCover from './components/HeroCover.jsx'
import InvitationSection from './components/InvitationSection.jsx'
import ItinerarySection from './components/ItinerarySection.jsx'
import RsvpSection from './components/RsvpSection.jsx'
import VenueSection from './components/VenueSection.jsx'

const weddingDetails = {
  groom: '[Novio]',
  bride: '[Novia]',
  date: '[Fecha de la boda]',
}

function App() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#portada">Nuestra historia</a>
        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#itinerario">Itinerario</a>
          <a href="#lugar">Lugar</a>
          <a href="#confirmacion">RSVP</a>
        </nav>
      </header>

      <HeroCover
        groom={weddingDetails.groom}
        bride={weddingDetails.bride}
        date={weddingDetails.date}
      />

      <InvitationSection />

      <ItinerarySection />

      <VenueSection />

      <RsvpSection />

      <footer className="site-footer">
        <span>[Nombres de la pareja]</span>
        <span>[Fecha de la boda]</span>
      </footer>
    </main>
  )
}

export default App
