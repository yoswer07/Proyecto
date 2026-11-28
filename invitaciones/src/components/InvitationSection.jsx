import couple from '../assets/pareja.jpeg'

function InvitationSection() {
  return (
    <section className="page-section invitation-section" id="invitacion">
      <div className="invitation-layout">
        <div className="invitation-photo-space" aria-hidden="true">
          <img src={couple} alt="Pareja" />
        </div>
        <div className="section-copy invitation-copy">
          <p className="eyebrow">Con mucho cariño</p>
          <h2>Queremos que nos acompañes a vivir este día</h2>
          <p>
           El amor se multiplica cuando se comparte. Acompáñanos a celebrar el comienzo de nuestra historia juntos. Nos emociona invitarte a celebrar nuestro matrimonio y hacer de este día un recuerdo inolvidable para todos.
          </p>
          <p className="placeholder">Se aceptan regalitos $$$</p>
        </div>
      </div>
    </section>
  )
}

export default InvitationSection