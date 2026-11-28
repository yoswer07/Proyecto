import { createClient } from 'npm:@supabase/supabase-js@2'

const localHosts = new Set(['localhost', '127.0.0.1'])
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+[1-9]\d{7,14}$/

function isAllowedOrigin(origin) {
  try {
    const url = new URL(origin)
    return allowedOrigins.has(origin) || (url.protocol === 'http:' && localHosts.has(url.hostname))
  } catch {
    return false
  }
}

function jsonResponse(body, status, origin) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  })

  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info')
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }

  return new Response(JSON.stringify(body), { status, headers })
}

function normalizeText(value, maxLength) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null
}

function getSharedPhotoUrl() {
  const configuredUrl = Deno.env.get('PHOTO_UPLOAD_URL')
  if (!configuredUrl) return null

  try {
    const url = new URL(configuredUrl)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function buildQrImageUrl(photoUploadUrl) {
  const url = new URL('https://quickchart.io/qr')
  url.searchParams.set('text', photoUploadUrl)
  url.searchParams.set('size', '220')
  url.searchParams.set('margin', '2')
  return url.toString()
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  let secretKey = null
  const secretKeysValue = Deno.env.get('SUPABASE_SECRET_KEYS')

  if (secretKeysValue) {
    try {
      secretKey = JSON.parse(secretKeysValue).default ?? null
    } catch {
      return { error: 'La clave de acceso de Supabase no está configurada correctamente.' }
    }
  }

  secretKey ??= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !secretKey) {
    return { error: 'La función no está configurada en Supabase.' }
  }

  return {
    client: createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  }
}

async function sendEmailJsTemplate({ to, templateParams }) {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  const templateId = Deno.env.get('EMAILJS_GUEST_TEMPLATE_ID')
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGINS')?.split(',')[0]?.trim()

  if (!serviceId || !publicKey || !templateId) {
    throw new Error('EmailJS no está configurado')
  }

  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (allowedOrigin) headers.set('Origin', allowedOrigin)

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: { to_email: to, ...templateParams },
    }),
  })

  if (!response.ok) {
    throw new Error(`EmailJS rechazó el envío (${response.status})`)
  }
}

function makeTemplateParams(invitation, email, phone, photoUploadUrl) {
  const companions = invitation.acompanantes ?? []
  const isConfirmed = invitation.estado_rsvp === 'confirmado'

  const statusMessage = isConfirmed
    ? '¡Gracias por confirmar! Tu asistencia quedó registrada y nos alegra mucho que nos acompañes.'
    : 'Gracias por avisarnos. Actualizamos tu invitación y lamentamos que no puedas acompañarnos.'

  const companionNote = companions.length > 0
    ? 'Si hay algún inconveniente con los acompañantes aquí listados, contáctame.'
    : ''

  return {
    name: invitation.nombre_mostrar,
    guest_name: invitation.nombre_mostrar,
    message: `${statusMessage} ${companionNote}`.trim(),
    qr_code_url: isConfirmed ? buildQrImageUrl(photoUploadUrl) : '',
    invite_url: isConfirmed ? photoUploadUrl : '',
    qr_token: isConfirmed
      ? 'Puedes compartir tus recuerdos del evento escaneando el siguiente QR o ingresando al enlace'
      : '',
    guest_email: email,
    guest_phone: phone,
    companion_name: companions.length > 0 ? companions.join(', ') : 'Sin acompañantes asignados',
  }
}

async function sendRsvpEmails({ invitation, email, phone, photoUploadUrl }) {
  const organizerEmail = normalizeText(Deno.env.get('ORGANIZER_EMAIL'), 254)?.toLowerCase()
  const templateParams = makeTemplateParams(invitation, email, phone, photoUploadUrl)

  await sendEmailJsTemplate({ to: email, templateParams })

  if (!organizerEmail || organizerEmail === email) {
    return { emailSent: true, organizerCopySent: Boolean(organizerEmail) }
  }

  await new Promise((resolve) => setTimeout(resolve, 1_100))
  try {
    await sendEmailJsTemplate({ to: organizerEmail, templateParams })
    return { emailSent: true, organizerCopySent: true }
  } catch (error) {
    console.error('Organizer email delivery failed:', error instanceof Error ? error.message : 'unknown')
    return { emailSent: true, organizerCopySent: false }
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')

  if (!origin || !isAllowedOrigin(origin)) {
    return jsonResponse({ error: 'Origen no permitido.' }, 403, null)
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: jsonResponse({}, 200, origin).headers })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405, origin)
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonResponse({ error: 'Se requiere contenido JSON.' }, 415, origin)
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 16_384) {
    return jsonResponse({ error: 'La solicitud excede el tamaño permitido.' }, 413, origin)
  }

  let payload
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).length > 16_384) {
      return jsonResponse({ error: 'La solicitud excede el tamaño permitido.' }, 413, origin)
    }
    payload = JSON.parse(body)
  } catch {
    return jsonResponse({ error: 'El contenido JSON no es válido.' }, 400, origin)
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse({ error: 'La solicitud no es válida.' }, 400, origin)
  }

  const action = payload.action
  const token = normalizeText(payload.token, 64)
  if (!['lookup', 'save'].includes(action) || !token || !tokenPattern.test(token)) {
    return jsonResponse({ error: 'El enlace de invitación no es válido.' }, 400, origin)
  }

  const service = getServiceClient()
  if (service.error) return jsonResponse({ error: service.error }, 503, origin)

  const { data: invitation, error: lookupError } = await service.client
    .from('invitaciones')
    .select('nombre_mostrar, estado_rsvp, email, telefono, acompanantes, fecha_limite_rsvp')
    .eq('token', token)
    .maybeSingle()

  if (lookupError) {
    console.error('Invitation lookup failed:', lookupError.code ?? 'unknown')
    return jsonResponse({ error: 'No se pudo consultar la invitación.' }, 500, origin)
  }

  if (!invitation) {
    return jsonResponse({ error: 'Esta invitación no existe o el enlace no es válido.' }, 404, origin)
  }

  const deadline = new Date(invitation.fecha_limite_rsvp)
  const isClosed = Number.isNaN(deadline.getTime()) || Date.now() >= deadline.getTime()
  const invitationResponse = {
    nombre_mostrar: invitation.nombre_mostrar,
    estado_rsvp: invitation.estado_rsvp,
    email: invitation.email,
    telefono: invitation.telefono,
    acompanantes: invitation.acompanantes ?? [],
    fecha_limite_rsvp: invitation.fecha_limite_rsvp,
    isClosed,
  }

  if (action === 'lookup') {
    return jsonResponse({ invitation: invitationResponse }, 200, origin)
  }

  if (isClosed) {
    return jsonResponse({ error: 'El plazo para confirmar asistencia ya terminó.' }, 409, origin)
  }

  const email = normalizeText(payload.email, 254)?.toLowerCase()
  const phone = normalizeText(payload.telefono, 32)?.replace(/[\s().-]/g, '')
  const rsvpStatus = payload.estado_rsvp

  if (!email || !emailPattern.test(email)) {
    return jsonResponse({ error: 'Revisa el correo electrónico.' }, 400, origin)
  }

  if (!phone || !phonePattern.test(phone)) {
    return jsonResponse({ error: 'El teléfono debe incluir el código de país.' }, 400, origin)
  }

  if (!['confirmado', 'no_asiste'].includes(rsvpStatus)) {
    return jsonResponse({ error: 'Selecciona si asistirás o no.' }, 400, origin)
  }

  if (payload.consent !== true) {
    return jsonResponse({ error: 'Se requiere autorización para guardar estos datos.' }, 400, origin)
  }

  const now = new Date().toISOString()
  const { data: savedInvitation, error: saveError } = await service.client
    .from('invitaciones')
    .update({
      estado_rsvp: rsvpStatus,
      email,
      telefono: phone,
      consentimiento_at: now,
      respondido_at: now,
      updated_at: now,
    })
    .eq('token', token)
    .gt('fecha_limite_rsvp', now)
    .select('nombre_mostrar, estado_rsvp, email, telefono, acompanantes, fecha_limite_rsvp')
    .maybeSingle()

  if (saveError) {
    console.error('Invitation RSVP update failed:', saveError.code ?? 'unknown')
    return jsonResponse({ error: 'No se pudo guardar la respuesta.' }, 500, origin)
  }

  if (!savedInvitation) {
    return jsonResponse({ error: 'El plazo para confirmar asistencia ya terminó.' }, 409, origin)
  }

  const photoUploadUrl = getSharedPhotoUrl()
  let deliveryResult = { emailSent: false, organizerCopySent: false }
  if (photoUploadUrl) {
    try {
      deliveryResult = await sendRsvpEmails({
        invitation: savedInvitation,
        email,
        phone,
        photoUploadUrl,
      })
    } catch (deliveryError) {
      console.error('RSVP email delivery failed:', deliveryError instanceof Error ? deliveryError.message : 'unknown')
    }
  } else {
    console.error('RSVP email delivery skipped: PHOTO_UPLOAD_URL is not configured')
  }

  return jsonResponse({
    invitation: {
      nombre_mostrar: savedInvitation.nombre_mostrar,
      estado_rsvp: savedInvitation.estado_rsvp,
      email: savedInvitation.email,
      telefono: savedInvitation.telefono,
      acompanantes: savedInvitation.acompanantes ?? [],
      fecha_limite_rsvp: savedInvitation.fecha_limite_rsvp,
    },
    photoUploadUrl,
    ...deliveryResult,
  }, 200, origin)
})