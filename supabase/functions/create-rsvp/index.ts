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

function response(body, status, origin) {
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

Deno.serve((request) => {
  const origin = request.headers.get('origin')
  if (!origin || !isAllowedOrigin(origin)) {
    return response({ error: 'Origen no permitido.' }, 403, null)
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: response({}, 200, origin).headers })
  }

  if (request.method !== 'POST') {
    return response({ error: 'Método no permitido.' }, 405, origin)
  }

  return response({
    error: 'Este formulario fue reemplazado. Usa el enlace personal de tu invitación.',
  }, 410, origin)
})