import { createSessionToken, getSessionFromRequest } from './_lib/session.js'
import { getValue, setValue } from './_lib/turso.js'
import { normalizeAccountPassword, verifyPassword } from './_lib/password.js'

const DEFAULT_ACCOUNTS = [
  {
    email: 'user@caloriecounter.app',
    password: 'user123',
    displayName: 'General User',
    role: 'user',
  },
  {
    email: 'admin@caloriecounter.app',
    password: 'admin123',
    displayName: 'Admin User',
    role: 'admin',
  },
]

function send(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function loadAccounts() {
  const raw = await getValue('accounts:v1')
  if (!raw) {
    const normalizedDefaults = DEFAULT_ACCOUNTS.map((account) => normalizeAccountPassword(account).account)
    await setValue('accounts:v1', JSON.stringify(normalizedDefaults))
    return normalizedDefaults
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_ACCOUNTS
    }

    let changed = false
    const normalized = parsed.map((account) => {
      const result = normalizeAccountPassword(account)
      changed = changed || result.changed
      return result.account
    })

    if (changed) {
      await setValue('accounts:v1', JSON.stringify(normalized))
    }

    return normalized
  } catch {
    const normalizedDefaults = DEFAULT_ACCOUNTS.map((account) => normalizeAccountPassword(account).account)
    await setValue('accounts:v1', JSON.stringify(normalizedDefaults))
    return normalizedDefaults
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed.' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const action = body?.action

    if (action === 'verify') {
      const session = getSessionFromRequest(req)
      if (!session) {
        return send(res, 401, { ok: false, error: 'Invalid session.' })
      }
      return send(res, 200, { ok: true, session })
    }

    if (action !== 'login') {
      return send(res, 400, { ok: false, error: 'Invalid action.' })
    }

    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    if (!email || !password) {
      return send(res, 400, { ok: false, error: 'Missing email or password.' })
    }

    const accounts = await loadAccounts()
    const account = accounts.find((item) => item.email === email && verifyPassword(password, item))
    if (!account) {
      return send(res, 401, { ok: false, error: 'Invalid credentials.' })
    }

    const token = createSessionToken({
      email: account.email,
      displayName: account.displayName || account.fullName || account.email,
      role: account.role || 'user',
    })

    return send(res, 200, {
      ok: true,
      token,
      session: {
        email: account.email,
        displayName: account.displayName || account.fullName || account.email,
        role: account.role || 'user',
      },
    })
  } catch (error) {
    return send(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
