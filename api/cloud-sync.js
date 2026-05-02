import { getValue, setValue } from './_lib/turso.js'
import { getSessionFromRequest } from './_lib/session.js'

function send(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) {
      return send(res, 401, { ok: false, error: 'Unauthorized. Missing or invalid cloud session.' })
    }

    function isAuthorizedKey(key) {
      if (key === 'accounts:v1') {
        return session.role === 'admin'
      }

      if (key.startsWith('tracker:v1:')) {
        const ownerEmail = key.slice('tracker:v1:'.length)
        return ownerEmail === session.email
      }

      return false
    }

    if (req.method === 'GET') {
      const { key } = req.query || {}
      if (!key || typeof key !== 'string') {
        return send(res, 400, { ok: false, error: 'Missing key query parameter.' })
      }

      if (!isAuthorizedKey(key)) {
        return send(res, 403, { ok: false, error: 'Forbidden for this key.' })
      }

      const raw = await getValue(key)
      if (raw == null) {
        return send(res, 200, { ok: true, value: null })
      }

      return send(res, 200, { ok: true, value: JSON.parse(raw) })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const { key, value } = body || {}

      if (!key || typeof key !== 'string') {
        return send(res, 400, { ok: false, error: 'Missing key in body.' })
      }

      if (!isAuthorizedKey(key)) {
        return send(res, 403, { ok: false, error: 'Forbidden for this key.' })
      }

      await setValue(key, JSON.stringify(value ?? null))
      return send(res, 200, { ok: true })
    }

    return send(res, 405, { ok: false, error: 'Method not allowed.' })
  } catch (error) {
    return send(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
