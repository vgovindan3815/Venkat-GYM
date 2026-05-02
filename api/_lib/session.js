import crypto from 'node:crypto'

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getSecret() {
  return process.env.CLOUD_SESSION_SECRET || process.env.TURSO_AUTH_TOKEN || ''
}

function encode(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
}

function sign(data) {
  const secret = getSecret()
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}

export function createSessionToken(session) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    ...session,
    iat: now,
    exp: now + DEFAULT_TTL_SECONDS,
  }

  const encoded = encode(payload)
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

export function verifySessionToken(token) {
  try {
    const [encoded, signature] = (token || '').split('.')
    if (!encoded || !signature) return null

    const expected = sign(encoded)
    const providedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)

    if (providedBuffer.length !== expectedBuffer.length) return null
    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null

    const payload = decode(encoded)
    const now = Math.floor(Date.now() / 1000)
    if (!payload.exp || payload.exp < now) return null
    if (!payload.email || !payload.role) return null

    return payload
  } catch {
    return null
  }
}

export function getSessionFromRequest(req) {
  const authHeader = req.headers?.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  return verifySessionToken(token)
}
