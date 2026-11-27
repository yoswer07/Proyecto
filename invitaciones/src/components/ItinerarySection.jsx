import churchEntrance from '../assets/lourdes-entrada.jpg'

function ItinerarySection() {
  return (
    <section className="page-section itinerary-section" id="itinerario">
      <div className="itinerary-photo" aria-hidden="true">
        <img src={churchEntrance} alt="" />
      </div>
      <div className="itinerary-content">
        <div className="section-copy">
          <p className="eyebrow">El día de la boda</p>
          <h2>Un día, muchos momentos</h2>
          <div className="timeline">
            <div className="timeline-item">
              <span className="timeline-time">3:30 PM</span>
              <div><h3>Ceremonia</h3><p>Parroquia Nuestra Señora de Lourdes</p></div>
            </div>
            <div className="timeline-item">
              <span className="timeline-time">5:00 PM</span>
              <div><h3>Celebración</h3><p>Residencia La Familia</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ItinerarySection