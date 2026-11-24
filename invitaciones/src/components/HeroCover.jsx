import Envelope from './Envelope.jsx'
import bouquets from '../assets/ramos.jfif'

function HeroCover({ groom, bride, date, isOpening, isOpened, onOpen }) {
  return (
    <section className={`page-section hero-section${!isOpened ? ' hero-section--intro' : ''}`} id="portada">
      <div className="hero-bouquet hero-bouquet--left" aria-hidden="true">
        <img src={bouquets} alt="" />
      </div>
      <div className="hero-bouquet hero-bouquet--right" aria-hidden="true">
        <img src={bouquets} alt="" />
      </div>
      <div className="hero-content">
        <p className="eyebrow hero-eyebrow">Con alegría te invitamos</p>
        <Envelope groom={groom} bride={bride} date={date} isOpening={isOpening || isOpened} onOpen={onOpen} />
        {!isOpened && (
          <button className="text-link hero-link hero-open-button" disabled={isOpening} onClick={onOpen} type="button">
            {isOpening ? 'Abriendo la invitación…' : 'Abrir invitación'}
            {!isOpening && <span aria-hidden="true">↓</span>}
          </button>
        )}
      </div>
    </section>
  )
}

export default HeroCover