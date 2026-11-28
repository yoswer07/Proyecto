import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

function formatDeadline(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'la fecha indicada en tu invitación'

  return new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

function RsvpSection() {
  const token = new URLSearchParams(window.location.search).get('t')?.trim() ?? ''
  const [viewState, setViewState] = useState(() => {
    if (!token) return 'invalid'
    return isSupabaseConfigured && supabase ? 'loading' : 'unavailable'
  })
  const [invitation, setInvitation] = useState(null)
  const [form, setForm] = useState({ email: '', phone: '', status: '', consent: false })
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [photoUploadUrl, setPhotoUploadUrl] = useState('')

  useEffect(() => {
    if (!token || !supabase) return undefined

    let isCurrent = true

    async function loadInvitation() {
      try {
        const { data, error } = await supabase.functions.invoke('rsvp-invitacion', {
          body: { action: 'lookup', token },
        })

        if (!isCurrent) return
        if (error || !data?.invitation) {
          setViewState('invalid')
          return
        }

        const currentInvitation = data.invitation
        setInvitation(currentInvitation)
        setForm({
          email: currentInvitation.email ?? '',
          phone: currentInvitation.telefono ?? '',
          status: currentInvitation.estado_rsvp === 'pendiente' ? '' : currentInvitation.estado_rsvp,
          consent: false,
        })
        setViewState(currentInvitation.isClosed ? 'closed' : 'ready')
      } catch {
        if (isCurrent) setViewState('unavailable')
      }
    }

    void loadInvitation()
    return () => {
      isCurrent = false
    }
  }, [token])

  function updateField(event) {
    const { name, type, value, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting || isSubmitted) return
    setFeedback('')

    if (!form.status) {
      setFeedback('Selecciona si asistirás o no podrás asistir.')
      return
    }

    if (!form.consent) {
      setFeedback('Autoriza el uso de tus datos de contacto para registrar la respuesta.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('rsvp-invitacion', {
        body: {
          action: 'save',
          token,
          email: form.email,
          telefono: form.phone,
          estado_rsvp: form.status,
          consent: form.consent,
        },
      })

      if (error?.context?.status === 409) {
        setViewState('closed')
        setFeedback('El plazo para confirmar asistencia ya terminó.')
        return
      }

      if (error || !data?.invitation) {
        setFeedback(data?.error ?? 'No se pudo guardar la respuesta. Inténtalo de nuevo.')
        return
      }

      setInvitation(data.invitation)
      setPhotoUploadUrl(data.photoUploadUrl ?? '')
      setFeedback(data.emailSent
        ? data.organizerCopySent === false
          ? 'Respuesta guardada y correo enviado; no se pudo enviar la copia al organizador.'
          : 'Respuesta guardada. Enviamos la confirmación a tu correo.'
        : 'Respuesta guardada, pero no se pudo enviar el correo de confirmación.')
        setIsSubmitted(true)
    } catch {
      setFeedback('No se pudo conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isClosed = viewState === 'closed' || Boolean(invitation?.isClosed)

  return (
    <section className="page-section rsvp-section" id="confirmacion">
      <div className="rsvp-content">
        <p className="eyebrow">Esperamos verte</p>

        {viewState === 'loading' && <p role="status">Buscando tu invitación…</p>}

        {viewState === 'unavailable' && (
          <div className="rsvp-state-message" role="alert">
            <h2>No pudimos cargar la invitación</h2>
            <p>Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
        )}

        {viewState === 'invalid' && (
          <div className="rsvp-state-message" role="alert">
            <h2>Este enlace de invitación no es válido</h2>
            <p>Contacta a los novios para que te compartan tu enlace personal.</p>
          </div>
        )}

        {invitation && (
          <>
            <h2>
              {isClosed
                ? `Hola, ${invitation.nombre_mostrar}. El plazo para confirmar terminó.`
                : `¡Hola, ${invitation.nombre_mostrar}! Confirma tu asistencia`}
            </h2>
            <p className="rsvp-intro">
              Las confirmaciones se reciben hasta el {formatDeadline(invitation.fecha_limite_rsvp)}.
            </p>

            {invitation.acompanantes.length > 0 ? (
              <div className="rsvp-companions">
                <h3>Acompañantes asignados</h3>
                <ul>
                  {invitation.acompanantes.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                </ul>
                <p>Si hay algún inconveniente con los acompañantes aquí listados, contáctame.</p>
              </div>
            ) : (
              <p className="rsvp-companions-note">Esta invitación no tiene acompañantes asignados.</p>
            )}

            {isClosed && (
              <p className="rsvp-feedback" role="status">
                Ya no aceptamos confirmaciones para esta invitación.
              </p>
            )}

            {!isClosed && viewState === 'ready' && !isSubmitted && (
              <form className="rsvp-form" onSubmit={handleSubmit}>
                <div className="rsvp-fields">
                  <label className="rsvp-field" htmlFor="guest-email">
                    <span>Correo electrónico</span>
                    <input
                      autoComplete="email"
                      disabled={isSubmitting}
                      id="guest-email"
                      name="email"
                      onChange={updateField}
                      required
                      type="email"
                      value={form.email}
                    />
                  </label>
                  <label className="rsvp-field" htmlFor="guest-phone">
                    <span>Teléfono con código de país</span>
                    <input
                      autoComplete="tel"
                      disabled={isSubmitting}
                      id="guest-phone"
                      name="phone"
                      onChange={updateField}
                      placeholder="+58 412 123 4567"
                      required
                      type="tel"
                      value={form.phone}
                    />
                  </label>
                </div>

                <fieldset className="rsvp-status-options">
                  <legend>Tu respuesta</legend>
                  <label>
                    <input
                      checked={form.status === 'confirmado'}
                      disabled={isSubmitting}
                      name="status"
                      onChange={updateField}
                      required
                      type="radio"
                      value="confirmado"
                    />
                    <span>Sí, asistiré</span>
                  </label>
                  <label>
                    <input
                      checked={form.status === 'no_asiste'}
                      disabled={isSubmitting}
                      name="status"
                      onChange={updateField}
                      required
                      type="radio"
                      value="no_asiste"
                    />
                    <span>No podré asistir</span>
                  </label>
                </fieldset>

                <label className="rsvp-consent">
                  <input
                    checked={form.consent}
                    disabled={isSubmitting}
                    name="consent"
                    onChange={updateField}
                    type="checkbox"
                  />
                  <span>Autorizo el uso de mi correo y teléfono para gestionar mi respuesta y enviarme la confirmación.</span>
                </label>

                <button className="rsvp-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Guardando…' : invitation.estado_rsvp === 'pendiente' ? 'Confirmar respuesta' : 'Actualizar respuesta'}
                </button>
                <p aria-live="polite" className="rsvp-feedback" role="status">{feedback}</p>
              </form>
            )}

            {!isClosed && viewState === 'ready' && isSubmitted && (
              <div className="rsvp-submitted-state">
                <p aria-live="polite" className="rsvp-feedback" role="status">{feedback}</p>
              </div> 
            )}

            {invitation.estado_rsvp === 'confirmado' && photoUploadUrl && (
              <div className="rsvp-ticket" aria-live="polite">
                <p className="eyebrow">Puedes compartir tus recuerdos en el siguiente QR o enlace.</p>
                <QRCodeSVG value={photoUploadUrl} size={208} level="M" includeMargin />
                <p>El mismo QR y enlace están disponibles para todas las personas invitadas.</p>
                <a className="rsvp-upload-link" href={photoUploadUrl} rel="noreferrer" target="_blank">
                  Comparte tus recuerdos ↗
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default RsvpSection