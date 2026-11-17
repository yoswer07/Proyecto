const venue = {
  name: 'Parroquia Nuestra Señora de Lourdes',
  address: '3JJP+6QQ, Barquisimeto 3001, Lara, Venezuela',
  coordinates: '10.0805759, -69.3630248',
  mapEmbedUrl: 'https://www.google.com/maps?q=10.0805759,-69.3630248&z=17&output=embed',
  directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=10.0805759%2C-69.3630248',
}

function VenueSection() {
  return (
    <section className="page-section venue-section" id="lugar">
      <div className="venue-content">
        <div className="venue-heading">
          <div>
            <p className="eyebrow">Cómo llegar</p>
            <h2>{venue.name}</h2>
          </div>
          <div className="venue-address">
            <p>{venue.address}</p>
            <span>GPS: {venue.coordinates}</span>
          </div>
        </div>
        <div className="venue-map-frame">
          <iframe
            src={venue.mapEmbedUrl}
            title={`Mapa de ${venue.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <a className="venue-directions" href={venue.directionsUrl} target="_blank" rel="noreferrer">
          Abrir indicaciones en Google Maps <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  )
}

export default VenueSection