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

async function verifyGoogleIdToken(idToken) {
  if (!idToken) return null

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
  if (!response.ok) return null

  const payload = await response.json()
  const email = String(payload.email || '').trim().toLowerCase()
  const verified = payload.email_verified === 'true' || payload.email_verified === true
  if (!email || !verified) return null

  const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ''
  if (expectedClientId && payload.aud !== expectedClientId) {
    return null
  }

  return {
    email,
    displayName: String(payload.name || email),
  }
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
      const normalizedDefaults = DEFAULT_ACCOUNTS.map((account) => normalizeAccountPassword(account).account)
      await setValue('accounts:v1', JSON.stringify(normalizedDefaults))
      return normalizedDefaults
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

async function saveAccounts(accounts) {
  await setValue('accounts:v1', JSON.stringify(accounts))
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

    if (action === 'google-login') {
      const idToken = String(body?.idToken || '')
      if (!idToken) {
        return send(res, 400, { ok: false, error: 'Missing Google ID token.' })
      }

      const googleProfile = await verifyGoogleIdToken(idToken)
      if (!googleProfile) {
        return send(res, 401, { ok: false, error: 'Invalid Google token.' })
      }

      const accounts = await loadAccounts()
      const index = accounts.findIndex((item) => item.email === googleProfile.email)
      const now = new Date().toISOString()

      if (index >= 0) {
        accounts[index] = {
          ...accounts[index],
          authProvider: 'google',
          displayName: accounts[index].displayName || googleProfile.displayName,
          fullName: accounts[index].fullName || googleProfile.displayName,
          updatedAt: now,
        }
      } else {
        accounts.push({
          authProvider: 'google',
          email: googleProfile.email,
          displayName: googleProfile.displayName,
          role: 'user',
          fullName: googleProfile.displayName,
          age: null,
          sex: null,
          phone: '',
          createdAt: now,
          updatedAt: now,
        })
      }

      await saveAccounts(accounts)

      const account = accounts.find((item) => item.email === googleProfile.email)
      if (!account) {
        return send(res, 500, { ok: false, error: 'Unable to create Google account session.' })
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
