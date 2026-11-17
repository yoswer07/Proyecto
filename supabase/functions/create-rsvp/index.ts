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

function buildInviteUrl(rawToken) {
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5177'
  const url = new URL(appBaseUrl)
  url.searchParams.set('invite', rawToken)
  url.hash = 'fotos'
  return url.toString()
}

async function sendResendEmail({ to, subject, html, text }) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')

  if (!apiKey || !fromEmail) {
    throw new Error('Resend no configurado')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Resend falló: ${response.status} ${errorBody}`)
  }
}

async function sendWhatsAppMessage({ phone, guestName, inviteUrl }) {
  const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

  if (!whatsappToken || !phoneNumberId) {
    throw new Error('WhatsApp no configurado')
  }

  const normalizedPhone = phone.replace(/\D/g, '')
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: {
        body: `Hola ${guestName}. Tu enlace de confirmación es: ${inviteUrl}`,
      },
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`WhatsApp falló: ${response.status} ${errorBody}`)
  }
}

async function sendGuestDeliveries({ guestName, email, phone, companionName, childrenNames, qrToken }) {
  const organizerEmail = Deno.env.get('ORGANIZER_EMAIL')
  const inviteUrl = buildInviteUrl(qrToken)
  const guestEmailText = [
    `Hola ${guestName},`,
    '',
    'Tu confirmación quedó registrada.',
    `Código de invitación: ${qrToken}`,
    `Enlace: ${inviteUrl}`,
    '',
    'Gracias por acompañarnos.',
  ].join('\n')

  const guestEmailHtml = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#14213d;">
      <p>Hola ${guestName},</p>
      <p>Tu confirmación quedó registrada.</p>
      <p><strong>Código de invitación:</strong> ${qrToken}</p>
      <p><strong>Enlace:</strong> <a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>Gracias por acompañarnos.</p>
    </div>
  `

  const deliveryTasks = [
    sendResendEmail({
      to: [email],
      subject: 'Confirmación de asistencia',
      html: guestEmailHtml,
      text: guestEmailText,
    }),
  ]

  const organizerRecipients = organizerEmail ? [organizerEmail] : []
  const uniqueCopyRecipients = Array.from(new Set([email, ...organizerRecipients].filter(Boolean)))

  if (organizerEmail && uniqueCopyRecipients.includes(organizerEmail)) {
    const organizerText = [
      'Nueva confirmación',
      `Invitado: ${guestName}`,
      `Correo: ${email}`,
      `WhatsApp: ${phone}`,
      companionName ? `Acompañante: ${companionName}` : 'Sin acompañante',
      `Hijos: ${childrenNames.length > 0 ? childrenNames.join(', ') : 'Ninguno'}`,
      `Código QR: ${qrToken}`,
    ].join('\n')

    deliveryTasks.push(
      sendResendEmail({
        to: [organizerEmail],
        subject: `Nueva confirmación de ${guestName}`,
        html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${organizerText}</pre>`,
        text: organizerText,
      }),
    )
  }

  if (Deno.env.get('WHATSAPP_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')) {
    deliveryTasks.push(sendWhatsAppMessage({ phone, guestName, inviteUrl }))
  }

  await Promise.all(deliveryTasks)
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

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')
  const organizerEmail = Deno.env.get('ORGANIZER_EMAIL')
  const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')
  const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5177'
  const providerConfigReady = Boolean(
    resendApiKey &&
      resendFromEmail &&
      organizerEmail &&
      appBaseUrl,
  )

  if (!providerConfigReady) {
    return jsonResponse({
      error: 'La entrega por correo aún no está configurada. Añade RESEND_API_KEY, RESEND_FROM_EMAIL, ORGANIZER_EMAIL y APP_BASE_URL antes de crear la invitación.',
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

  try {
    await sendGuestDeliveries({
      guestName,
      email,
      phone,
      companionName,
      childrenNames: childrenNames.map((name) => name.trim()),
      qrToken,
    })
  } catch (deliveryError) {
    console.error('Guest delivery failed:', deliveryError)
    await supabase.from('guest_registrations').delete().eq('id', data.id)
    return jsonResponse({
      error: 'La confirmación quedó guardada, pero falló el envío de la invitación. Revisa la configuración de Resend y WhatsApp.',
    }, 502, origin)
  }

  return jsonResponse({ guestName, qrToken }, 201, origin)
})