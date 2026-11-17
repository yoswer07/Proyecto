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

function SectionMarker({ number, title }) {
  return (
    <div className="section-marker" aria-label={`Sección ${number}: ${title}`}>
      <span className="section-marker__number">{number}</span>
      <span className="section-marker__title">{title}</span>
    </div>
  )
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

      <section className="page-section photos-section" id="fotos">
        <SectionMarker number="06" title="Fotos" />
        <div className="section-copy photos-copy">
          <p className="eyebrow">Recuerdos compartidos</p>
          <h2>Sube tus fotos de la celebración</h2>
          <p>Después de confirmar, cada invitado recibirá un QR personal para abrir la página de fotos.</p>
          <div className="qr-preview" aria-label="Espacio reservado para el QR personal">
            <span>QR personal</span>
            <small>Se asignará a cada invitado</small>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>[Nombres de la pareja]</span>
        <span>[Fecha de la boda]</span>
      </footer>
    </main>
  )
}

export default App
