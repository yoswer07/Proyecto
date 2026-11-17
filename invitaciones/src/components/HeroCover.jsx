import Envelope from './Envelope.jsx'

function HeroCover({ groom, bride, date }) {
  return (
    <section className="page-section hero-section" id="portada">
      <div className="hero-content">
        <p className="eyebrow hero-eyebrow">Con alegría te invitamos</p>
        <Envelope groom={groom} bride={bride} date={date} />
        <a className="text-link hero-link" href="#invitacion">
          Abre nuestra invitación <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  )
}

export default HeroCover