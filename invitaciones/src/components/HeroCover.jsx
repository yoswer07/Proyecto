import Envelope from './Envelope.jsx'
import bouquets from '../assets/ramos.jfif'

function HeroCover({ groom, bride, date, isOpening, isOpened, isNameFontReady, onOpen }) {
  const isOpenDisabled = isOpening || !isNameFontReady

  return (
    <section className="page-section hero-section hero-section--cover" id="portada">
      <div className="hero-bouquet hero-bouquet--left" aria-hidden="true">
        <img src={bouquets} alt="" />
      </div>
      <div className="hero-bouquet hero-bouquet--right" aria-hidden="true">
        <img src={bouquets} alt="" />
      </div>
      <div className="hero-content">
        <p className="eyebrow hero-eyebrow">Con alegría te invitamos</p>
        <Envelope
          groom={groom}
          bride={bride}
          date={date}
          isFontReady={isNameFontReady}
          isOpening={isOpening || isOpened}
          isOpenDisabled={isOpenDisabled}
          onOpen={onOpen}
        />
        {!isOpened && (
          <button className="text-link hero-link hero-open-button" disabled={isOpenDisabled} onClick={onOpen} type="button">
            {isOpening ? 'Abriendo la invitación…' : !isNameFontReady ? 'Preparando invitación…' : 'Abrir invitación'}
            {!isOpening && isNameFontReady && <span aria-hidden="true">↓</span>}
          </button>
        )}
      </div>
    </section>
  )
}

export default HeroCover