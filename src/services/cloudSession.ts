import type { SessionUser } from '../types'

const CLOUD_SESSION_TOKEN_KEY = 'caloriecounter-cloud-session-token'

function authEndpoint(): string {
  return import.meta.env.VITE_CLOUD_AUTH_ENDPOINT || '/api/auth-session'
}

export function getCloudSessionToken(): string {
  try {
    return window.localStorage.getItem(CLOUD_SESSION_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function clearCloudSessionToken(): void {
  try {
    window.localStorage.removeItem(CLOUD_SESSION_TOKEN_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export async function startCloudSession(email: string, password: string): Promise<SessionUser | null> {
  try {
    const response = await fetch(authEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'login', email, password }),
    })

    if (!response.ok) return null
    const payload = await response.json() as {
      ok: boolean
      token?: string
      session?: SessionUser
    }

    if (!payload.ok || !payload.token || !payload.session) return null

    try {
      window.localStorage.setItem(CLOUD_SESSION_TOKEN_KEY, payload.token)
    } catch {
      // Ignore storage errors.
    }

    return payload.session
  } catch {
    return null
  }
}
