import logoImg from '../assets/logo.jpeg'

function Envelope({ groom, bride, date, isFontReady, isOpening, isOpenDisabled, onOpen }) {
  return (
    <div className={`envelope${isOpening ? ' envelope--opening' : ''}`}>
      <div className="envelope-paper">
        <h1 className={`couple-names${isFontReady ? '' : ' couple-names--font-loading'}`}>
          <span>{groom}</span>
          <span className="names-joining" aria-hidden="true">&amp;</span>
          <span>{bride}</span>
        </h1>
        <span className="floral-divider" aria-hidden="true"><span /></span>
        <p className="hero-date">{date}</p>
      </div>
      <div className="envelope-flap" aria-hidden="true" />
      <img
        alt=""
        aria-hidden="true"
        className="envelope-seal-logo"
        src={logoImg}
      />
      <button
        aria-label="Abrir la invitación desde el sello"
        className="envelope-seal"
        disabled={isOpenDisabled}
        onClick={onOpen}
        type="button"
      />
    </div>
  )
}

export default Envelope