function Envelope({ groom, bride, date, isOpening, onOpen }) {
  return (
    <div className={`envelope${isOpening ? ' envelope--opening' : ''}`}>
      <div className="envelope-paper">
        <h1 className="couple-names">
          <span>{groom}</span>
          <span className="names-joining" aria-hidden="true">&amp;</span>
          <span>{bride}</span>
        </h1>
        <span className="floral-divider" aria-hidden="true"><span /></span>
        <p className="hero-date">{date}</p>
      </div>
      <div className="envelope-flap" aria-hidden="true" />
      <button
        aria-label="Abrir la invitación desde el sello"
        className="envelope-seal"
        disabled={isOpening}
        onClick={onOpen}
        type="button"
      />
    </div>
  )
}

export default Envelope