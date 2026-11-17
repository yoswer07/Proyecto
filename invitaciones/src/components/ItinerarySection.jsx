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
              <span className="timeline-time">[Hora]</span>
              <div><h3>Ceremonia</h3><p>[Lugar de la ceremonia]</p></div>
            </div>
            <div className="timeline-item">
              <span className="timeline-time">[Hora]</span>
              <div><h3>Celebración</h3><p>[Lugar de la celebración]</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ItinerarySection