import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const MAX_COMPANIONS = 1
const MAX_CHILDREN = 12

function RsvpSection() {
  const [form, setForm] = useState({
    guestName: '',
    email: '',
    phone: '',
    companionCount: 0,
    childCount: 0,
    companions: [],
    children: [],
    consent: false,
  })
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticket, setTicket] = useState(null)

  function updateField(event) {
    const { name, type, value, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function updateCount(countField, namesField, value, maxCount) {
    const parsedCount = Number.parseInt(value, 10)
    const count = Number.isNaN(parsedCount)
      ? 0
      : Math.min(Math.max(parsedCount, 0), maxCount)

    setForm((current) => ({
      ...current,
      [countField]: count,
      [namesField]: Array.from(
        { length: count },
        (_, index) => current[namesField][index] ?? '',
      ),
    }))
  }

  function updateGuestName(namesField, index, value) {
    setForm((current) => {
      const names = [...current[namesField]]
      names[index] = value
      return { ...current, [namesField]: names }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')

    if (!isSupabaseConfigured || !supabase) {
      setFeedback('La conexión con Supabase todavía no está configurada.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-rsvp', {
        body: {
          guestName: form.guestName,
          email: form.email,
          phone: form.phone,
          companionName: form.companions[0] ?? null,
          childrenNames: form.children,
          consent: form.consent,
        },
      })

      if (error || !data?.qrToken) {
        setFeedback('No se pudo guardar la confirmación. Inténtalo más tarde.')
        return
      }

      const qrUrl = new URL(window.location.href)
      qrUrl.searchParams.set('invite', data.qrToken)
      qrUrl.hash = 'fotos'
      setTicket({ guestName: data.guestName, qrUrl: qrUrl.toString() })
      setFeedback('Confirmación guardada. El QR solo se muestra en esta sesión.')
    } catch {
      setFeedback('No se pudo conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-section rsvp-section" id="confirmacion">
      <div className="rsvp-content">
        <p className="eyebrow">Esperamos verte</p>
        <h2>¿Nos acompañas?</h2>
        <p className="rsvp-intro">Completa tus datos y los nombres de las personas que asistirán contigo.</p>

        <form className="rsvp-form" onSubmit={handleSubmit}>
          <div className="rsvp-fields">
            <label className="rsvp-field rsvp-field--wide" htmlFor="guest-name">
              <span>Nombre del invitado principal</span>
              <input
                autoComplete="name"
                id="guest-name"
                name="guestName"
                onChange={updateField}
                disabled={isSubmitting || Boolean(ticket)}
                required
                value={form.guestName}
              />
            </label>
            <label className="rsvp-field" htmlFor="guest-email">
              <span>Correo electrónico</span>
              <input
                autoComplete="email"
                id="guest-email"
                name="email"
                onChange={updateField}
                disabled={isSubmitting || Boolean(ticket)}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="rsvp-field" htmlFor="guest-phone">
              <span>WhatsApp con código de país</span>
              <input
                autoComplete="tel"
                id="guest-phone"
                name="phone"
                onChange={updateField}
                disabled={isSubmitting || Boolean(ticket)}
                placeholder="+58 412 123 4567"
                required
                type="tel"
                value={form.phone}
              />
            </label>
          </div>

          <fieldset className="rsvp-counts">
            <legend>Personas que asistirán contigo</legend>
            <label className="rsvp-field" htmlFor="companion-count">
              <span>Acompañantes adultos</span>
              <input
                id="companion-count"
                disabled={isSubmitting || Boolean(ticket)}
                max={MAX_COMPANIONS}
                min="0"
                onChange={(event) => updateCount('companionCount', 'companions', event.target.value, MAX_COMPANIONS)}
                step="1"
                type="number"
                value={form.companionCount}
              />
            </label>
            <label className="rsvp-field" htmlFor="child-count">
              <span>Hijos</span>
              <input
                id="child-count"
                disabled={isSubmitting || Boolean(ticket)}
                max={MAX_CHILDREN}
                min="0"
                onChange={(event) => updateCount('childCount', 'children', event.target.value, MAX_CHILDREN)}
                step="1"
                type="number"
                value={form.childCount}
              />
            </label>
          </fieldset>

          {form.companions.length > 0 && (
            <fieldset className="rsvp-guest-list">
              <legend>Nombres de acompañantes</legend>
              {form.companions.map((name, index) => (
                <label className="rsvp-field" htmlFor={`companion-${index}`} key={`companion-${index}`}>
                  <span>Acompañante {index + 1}</span>
                  <input
                    id={`companion-${index}`}
                    onChange={(event) => updateGuestName('companions', index, event.target.value)}
                    disabled={isSubmitting || Boolean(ticket)}
                    required
                    value={name}
                  />
                </label>
              ))}
            </fieldset>
          )}

          {form.children.length > 0 && (
            <fieldset className="rsvp-guest-list">
              <legend>Nombres de los hijos</legend>
              {form.children.map((name, index) => (
                <label className="rsvp-field" htmlFor={`child-${index}`} key={`child-${index}`}>
                  <span>Hijo {index + 1}</span>
                  <input
                    id={`child-${index}`}
                    onChange={(event) => updateGuestName('children', index, event.target.value)}
                    disabled={isSubmitting || Boolean(ticket)}
                    required
                    value={name}
                  />
                </label>
              ))}
            </fieldset>
          )}

          <label className="rsvp-consent">
            <input
              checked={form.consent}
              disabled={isSubmitting || Boolean(ticket)}
              name="consent"
              onChange={updateField}
              required
              type="checkbox"
            />
            <span>Autorizo el uso de estos datos para gestionar la asistencia y el acceso a la invitación.</span>
          </label>

          <button className="rsvp-submit" disabled={isSubmitting || Boolean(ticket)} type="submit">
            {isSubmitting ? 'Guardando…' : ticket ? 'Confirmación registrada' : 'Confirmar y crear QR'}
          </button>
          <p aria-live="polite" className="rsvp-feedback" role="status">{feedback}</p>
        </form>

        {ticket && (
          <div className="rsvp-ticket" aria-live="polite">
            <p className="eyebrow">Entrada personal</p>
            <h3>{ticket.guestName}</h3>
            <QRCodeSVG value={ticket.qrUrl} size={208} level="M" includeMargin />
            <p>Guarda este QR. Se perderá al cerrar o recargar esta página.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default RsvpSection