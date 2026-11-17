function Envelope({ groom, bride, date }) {
  return (
    <div className="envelope">
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
      <span className="envelope-seal" aria-hidden="true" />
    </div>
  )
}

export default Envelope