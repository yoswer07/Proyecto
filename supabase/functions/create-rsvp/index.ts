import { createClient } from 'npm:@supabase/supabase-js@2'

const localHosts = new Set(['localhost', '127.0.0.1'])
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

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

function makeQrToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function getPhotoUploadUrl() {
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

async function sendEmailJsTemplate({ templateId, templateParams }) {
  const serviceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')

  if (!serviceId || !publicKey || !privateKey || !templateId) {
    throw new Error('EmailJS no está configurado')
  }

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: templateParams,
    }),
  })

  if (!response.ok) {
    throw new Error(`EmailJS rechazó el envío (${response.status})`)
  }
}

async function sendGuestDeliveries({ guestName, email, phone, companionName, childrenNames, photoUploadUrl }) {
  const organizerEmail = Deno.env.get('ORGANIZER_EMAIL')
  const guestTemplateId = Deno.env.get('EMAILJS_GUEST_TEMPLATE_ID')
  const message = '¡Ya estás oficialmente en nuestra lista de invitados! Nos hace muchísima ilusión compartir contigo este día tan especial. Guarda este correo y usa el enlace o el QR para subir las fotos que tomes durante la celebración. ¡Te esperamos con mucho cariño!'
  const templateParams = {
    guest_name: guestName,
    message,
    guest_email: email,
    guest_phone: phone,
    companion_name: companionName ?? 'Sin acompañante',
    children_names: childrenNames.length > 0 ? childrenNames.join(', ') : 'Ninguno',
    qr_token: 'QR compartido para subir fotos',
    qr_code_url: buildQrImageUrl(photoUploadUrl),
    invite_url: photoUploadUrl,
  }

  await sendEmailJsTemplate({
    templateId: guestTemplateId,
    templateParams: {
      to_email: email,
      ...templateParams,
    },
  })

  if (!organizerEmail || organizerEmail.toLowerCase() === email.toLowerCase()) {
    return { organizerCopySent: true }
  }

  await new Promise((resolve) => setTimeout(resolve, 1_100))
  try {
    await sendEmailJsTemplate({
      templateId: guestTemplateId,
      templateParams: {
        to_email: organizerEmail,
        ...templateParams,
      },
    })
    return { organizerCopySent: true }
  } catch (error) {
    console.error('Organizer email delivery failed:', error instanceof Error ? error.message : 'unknown')
    return { organizerCopySent: false }
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
    return jsonResponse({ error: 'El formato de confirmación no es válido.' }, 400, origin)
  }

  const guestName = normalizeText(payload.guestName, 120)
  const email = normalizeText(payload.email, 254)?.toLowerCase()
  const phone = normalizeText(payload.phone, 32)?.replace(/[\s().-]/g, '')
  const companionName = payload.companionName === null || payload.companionName === ''
    ? null
    : normalizeText(payload.companionName, 120)
  const childrenNames = payload.childrenNames

  if (!guestName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Revisa el nombre y el correo electrónico.' }, 400, origin)
  }

  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return jsonResponse({ error: 'El WhatsApp debe incluir el código de país.' }, 400, origin)
  }

  if (payload.companionName !== null && payload.companionName !== '' && !companionName) {
    return jsonResponse({ error: 'Revisa el nombre del acompañante.' }, 400, origin)
  }

  if (
    !Array.isArray(childrenNames) ||
    childrenNames.length > 12 ||
    childrenNames.some((name) => !normalizeText(name, 120))
  ) {
    return jsonResponse({ error: 'Revisa los nombres de los hijos.' }, 400, origin)
  }

  if (payload.consent !== true) {
    return jsonResponse({ error: 'Se requiere consentimiento para registrar la confirmación.' }, 400, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'La función no está configurada en Supabase.' }, 503, origin)
  }

  const emailJsServiceId = Deno.env.get('EMAILJS_SERVICE_ID')
  const emailJsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
  const emailJsPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')
  const emailJsGuestTemplateId = Deno.env.get('EMAILJS_GUEST_TEMPLATE_ID')
  const organizerEmail = Deno.env.get('ORGANIZER_EMAIL')
  const photoUploadUrl = getPhotoUploadUrl()
  const providerConfigReady = Boolean(
    emailJsServiceId &&
      emailJsPublicKey &&
      emailJsPrivateKey &&
      emailJsGuestTemplateId &&
      organizerEmail &&
      photoUploadUrl,
  )

  if (!providerConfigReady) {
    return jsonResponse({
      error: 'EmailJS o el enlace compartido de subida aún no están configurados. Revisa sus claves, la plantilla, ORGANIZER_EMAIL y PHOTO_UPLOAD_URL.',
    }, 503, origin)
  }

  const qrToken = makeQrToken()
  const qrTokenHash = await hashToken(qrToken)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from('guest_registrations')
    .insert({
      primary_guest_name: guestName,
      email,
      whatsapp: phone,
      companion_name: companionName,
      children_names: childrenNames.map((name) => name.trim()),
      consented_at: new Date().toISOString(),
      qr_token_hash: qrTokenHash,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Guest registration insert failed:', error?.code ?? 'unknown')
    return jsonResponse({ error: 'No se pudo guardar la confirmación. Inténtalo más tarde.' }, 500, origin)
  }

  let deliveryResult
  try {
    deliveryResult = await sendGuestDeliveries({
      guestName,
      email,
      phone,
      companionName,
      childrenNames: childrenNames.map((name) => name.trim()),
      photoUploadUrl,
    })
  } catch (deliveryError) {
    console.error('Guest email delivery failed:', deliveryError instanceof Error ? deliveryError.message : 'unknown')
    await supabase.from('guest_registrations').delete().eq('id', data.id)
    return jsonResponse({
      error: 'No se pudo enviar el correo de confirmación. Revisa la configuración de EmailJS e inténtalo de nuevo.',
    }, 502, origin)
  }

  return jsonResponse({ guestName, qrToken, photoUploadUrl, organizerCopySent: deliveryResult.organizerCopySent }, 201, origin)
})